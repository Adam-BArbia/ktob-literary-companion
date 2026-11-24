package tn.ktob.advisor;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import tn.ktob.api.shared.*;

@Repository
@ConditionalOnProperty(name="ktob.persistence.enabled", havingValue="true")
public class ConversationRepository {
    public record PriorTurn(String readerBody, String assistantBody, SpoilerLevel spoilerLevel) {}
    private final JdbcTemplate db;
    public ConversationRepository(JdbcTemplate db) { this.db=db; }

    private Conversation conversation(ResultSet r,int ignored)throws SQLException {
        return new Conversation(r.getObject("id",UUID.class),r.getString("kind"),
            r.getObject("work_id",UUID.class),r.getString("title"),r.getTimestamp("created_at").toInstant());
    }
    private ConversationMessage message(ResultSet r,int ignored)throws SQLException {
        return new ConversationMessage(r.getObject("id",UUID.class),r.getObject("conversation_id",UUID.class),
            r.getString("role"),r.getString("body"),r.getTimestamp("created_at").toInstant(),
            SpoilerLevel.valueOf(r.getString("spoiler_level")),r.getObject("full_book_spoilers_confirmed",Boolean.class));
    }
    public Conversation owned(UUID reader,UUID id,boolean lock) {
        var rows=db.query("SELECT * FROM app.conversations WHERE id=? AND reader_id=?"+
            (lock?" FOR UPDATE":""),this::conversation,id,reader);
        if(rows.isEmpty())throw new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Conversation not found.");
        return rows.getFirst();
    }
    public Conversation create(UUID reader,String kind,UUID work,String title) {
        UUID id=UUID.randomUUID();
        db.update("INSERT INTO app.conversations(id,reader_id,kind,work_id,title) VALUES (?,?,?,?,?)",id,reader,kind,work,title);
        return owned(reader,id,false);
    }
    public ApiPage<Conversation> list(UUID reader,PageWindow page) {
        String scope="conversations:"+reader;
        UUID anchor=KeysetCursor.decode(page.cursor(),scope);
        List<Object> args=new ArrayList<>(List.of(reader));
        String sql="SELECT * FROM app.conversations WHERE reader_id=?";
        if(anchor!=null) {
            var anchors=db.query("SELECT created_at FROM app.conversations WHERE id=? AND reader_id=?",
                (r,n)->r.getTimestamp(1),anchor,reader);
            if(anchors.isEmpty())throw KeysetCursor.invalid();
            sql+=" AND (created_at,id)<(?,?)";args.add(anchors.getFirst());args.add(anchor);
        }
        sql+=" ORDER BY created_at DESC,id DESC LIMIT ?";args.add(page.limit()+1);
        var rows=db.query(sql,this::conversation,args.toArray());
        boolean more=rows.size()>page.limit();
        var result=more?rows.subList(0,page.limit()):rows;
        return new ApiPage<>(result,new PageMeta(more?KeysetCursor.encode(scope,result.getLast().id()):null));
    }
    public ApiPage<ConversationMessage> messages(UUID reader,UUID conversation,PageWindow page) {
        owned(reader,conversation,false);
        String scope="messages:"+reader+":"+conversation;
        UUID anchor=KeysetCursor.decode(page.cursor(),scope);
        List<Object> args=new ArrayList<>(List.of(conversation));
        String sql="SELECT * FROM app.conversation_messages WHERE conversation_id=?";
        if(anchor!=null) {
            var anchors=db.query("SELECT created_at FROM app.conversation_messages WHERE id=? AND conversation_id=?",
                (r,n)->r.getTimestamp(1),anchor,conversation);
            if(anchors.isEmpty())throw KeysetCursor.invalid();
            sql+=" AND (created_at,id)<(?,?)";args.add(anchors.getFirst());args.add(anchor);
        }
        sql+=" ORDER BY created_at DESC,id DESC LIMIT ?";args.add(page.limit()+1);
        var rows=db.query(sql,this::message,args.toArray());
        boolean more=rows.size()>page.limit();
        var result=more?rows.subList(0,page.limit()):rows;
        return new ApiPage<>(result,new PageMeta(more?KeysetCursor.encode(scope,result.getLast().id()):null));
    }
    public List<PriorTurn> context(UUID conversation,SpoilerLevel policy) {
        // Only whole committed pairs. Exclude both sides of full-spoiler turns before bounding.
        return db.query("""
            SELECT r.body AS reader_body,a.body AS assistant_body,r.spoiler_level
            FROM app.conversation_messages r JOIN app.conversation_messages a
              ON a.turn_id=r.turn_id AND a.conversation_id=r.conversation_id AND a.role='ASSISTANT'
            WHERE r.conversation_id=? AND r.role='READER' AND a.spoiler_level=r.spoiler_level
            """+(policy==SpoilerLevel.NO_SPOILERS?" AND r.spoiler_level='NO_SPOILERS'":"")+
            " ORDER BY r.created_at DESC,r.id DESC LIMIT 4",
            (r,n)->new PriorTurn(r.getString("reader_body"),r.getString("assistant_body"),
                SpoilerLevel.valueOf(r.getString("spoiler_level"))),conversation);
    }
    public ConversationTurn replay(UUID reader,UUID conversation,UUID key,String hash) {
        if(key==null)return null;
        var rows=db.query("""
            SELECT request_hash,reader_message_id,assistant_message_id FROM app.message_idempotency
            WHERE reader_id=? AND conversation_id=? AND request_key=?
            """, (r,n)->new String[]{r.getString(1),r.getString(2),r.getString(3)},reader,conversation,key);
        if(rows.isEmpty())return null;
        String[] saved=rows.getFirst();
        if(!hash.equals(saved[0]))throw new ApiException(HttpStatus.CONFLICT,"IDEMPOTENCY_KEY_REUSED",
            "This request key was already used for a different question.");
        ConversationMessage user=storedMessage(conversation,UUID.fromString(saved[1]));
        ConversationMessage assistant=storedMessage(conversation,UUID.fromString(saved[2]));
        return new ConversationTurn(user,assistant,List.of(),user.spoilerLevel());
    }
    private ConversationMessage storedMessage(UUID conversation,UUID message) {
        return db.queryForObject("SELECT * FROM app.conversation_messages WHERE id=? AND conversation_id=?",
            this::message,message,conversation);
    }
    public ConversationTurn persist(UUID reader,UUID conversation,MessageRequest request,String answer,UUID key) {
        UUID turn=UUID.randomUUID(),user=UUID.randomUUID(),assistant=UUID.randomUUID();
        Instant now=Instant.now().truncatedTo(ChronoUnit.MICROS);
        Timestamp last=db.queryForObject("SELECT max(created_at) FROM app.conversation_messages WHERE conversation_id=?",
            Timestamp.class,conversation);
        if(last!=null && !now.isAfter(last.toInstant()))now=last.toInstant().plus(1,ChronoUnit.MICROS);
        // Strict per-conversation ordering survives equal clock ticks and pagination boundaries.
        Instant responseAt=now.plus(1,ChronoUnit.MICROS);
        insert(user,conversation,turn,"READER",request.body(),request.spoilerLevel(),request.fullBookSpoilersConfirmed(),now);
        insert(assistant,conversation,turn,"ASSISTANT",answer,request.spoilerLevel(),null,responseAt);
        if(key!=null)db.update("""
            INSERT INTO app.message_idempotency(reader_id,conversation_id,request_key,request_hash,
              reader_message_id,assistant_message_id) VALUES (?,?,?,?,?,?)
            """,reader,conversation,key,request.fingerprint(),user,assistant);
        return new ConversationTurn(storedMessage(conversation,user),storedMessage(conversation,assistant),
            List.of(),request.spoilerLevel());
    }
    private void insert(UUID id,UUID conversation,UUID turn,String role,String body,SpoilerLevel spoiler,
                        Boolean confirmed,Instant createdAt) {
        db.update("""
            INSERT INTO app.conversation_messages(id,conversation_id,turn_id,role,body,spoiler_level,
              full_book_spoilers_confirmed,created_at) VALUES (?,?,?,?,?,?,?,?)
            """,id,conversation,turn,role,body,spoiler.name(),confirmed,Timestamp.from(createdAt));
    }
}
