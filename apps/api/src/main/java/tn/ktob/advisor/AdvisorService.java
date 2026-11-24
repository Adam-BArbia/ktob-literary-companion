package tn.ktob.advisor;

import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Semaphore;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import tn.ktob.api.shared.*;
import tn.ktob.catalog.BookWork;
import tn.ktob.catalog.CatalogService;
import tn.ktob.reader.ConsentPolicyService;
import tn.ktob.reader.ReaderService;

@Service
@ConditionalOnProperty(name="ktob.persistence.enabled", havingValue="true")
public class AdvisorService {
    private final ConversationRepository conversations;
    private final ConsentPolicyService consent;
    private final ReaderService readers;
    private final CatalogService catalog;
    private final LiteraryAiPort provider;
    private final JdbcTemplate db;
    private final TransactionTemplate transaction;
    // Fail promptly instead of exhausting the four-connection pool with slow external calls.
    private final Semaphore inference=new Semaphore(1);

    public AdvisorService(ConversationRepository conversations,ConsentPolicyService consent,
            ReaderService readers,CatalogService catalog,LiteraryAiPort provider,
            JdbcTemplate db,PlatformTransactionManager manager) {
        this.conversations=conversations;this.consent=consent;this.readers=readers;
        this.catalog=catalog;this.provider=provider;this.db=db;
        transaction=new TransactionTemplate(manager);
        transaction.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        transaction.setTimeout(40);
    }
    public ApiPage<Conversation> list(UUID reader,PageWindow page) {
        readers.findOrCreate(reader);
        return conversations.list(reader,page);
    }
    @Transactional
    public Conversation create(UUID reader,String raw) {
        RequestFields fields=RequestFields.parse(raw,Set.of("kind","workId","title"),Set.of("kind"));
        String kind=fields.text("kind",false);
        UUID work=fields.uuid("workId");
        if(!Set.of("GENERAL","BOOK_MAIN").contains(kind) ||
                (kind.equals("GENERAL") && work!=null) || (kind.equals("BOOK_MAIN") && work==null))
            throw RequestFields.invalid("GENERAL has no book; BOOK_MAIN requires a visible workId.");
        readers.findOrCreate(reader);
        BookWork selected=work==null?null:catalog.find(work,reader);
        String title=fields.text("title",true);
        if(title==null)title=selected==null?"Literary conversation":selected.title();
        else if(title.isBlank() || title.length()>160)
            throw RequestFields.invalid("Conversation title must contain 1 to 160 characters.");
        // Provider metadata retains its own bounded source title; this is only the reader's local chat label.
        title=title.strip();
        if(title.length()>160)title=title.substring(0,160);
        return conversations.create(reader,kind,work,title);
    }
    public ApiPage<ConversationMessage> messages(UUID reader,UUID id,PageWindow page) {
        return conversations.messages(reader,id,page);
    }
    public ConversationTurn send(UUID reader,UUID id,String raw,String idempotencyKey) {
        conversations.owned(reader,id,false);
        MessageRequest request=MessageRequest.parse(raw);
        UUID key=null;
        if(idempotencyKey!=null) {
            try { key=UuidValue.parse(idempotencyKey); }
            catch(RuntimeException ex) { throw new ApiException(HttpStatus.BAD_REQUEST,"INVALID_IDEMPOTENCY_KEY",
                "Idempotency-Key must be a UUID."); }
        }
        consent.requireProcessingConsent(reader);
        var already=conversations.replay(reader,id,key,request.fingerprint());
        if(already!=null)return already;
        if(!provider.available())throw unavailable();
        if(!inference.tryAcquire())throw busy();
        final UUID requestKey=key;
        try {
            return transaction.execute(status->{
                db.execute("SET LOCAL lock_timeout='2s'");
                Conversation chat=conversations.owned(reader,id,true);
                consent.requireProcessingConsent(reader);
                var replay=conversations.replay(reader,id,requestKey,request.fingerprint());
                if(replay!=null)return replay;
                BookWork book=chat.workId()==null?null:catalog.find(chat.workId(),reader);
                var context=ConversationContextBuilder.build(book,request,conversations.context(id,request.spoilerLevel()));
                // No privacy row lock or cached consent. A completed revoke is visible here.
                consent.requireProcessingConsent(reader);
                String answer=provider.complete(context);
                if(answer==null || answer.isBlank() || answer.length()>16000)throw unavailable();
                return conversations.persist(reader,id,request,answer,requestKey);
            });
        } catch(PessimisticLockingFailureException ex) {
            throw busy();
        } finally {
            inference.release();
        }
    }
    static ApiException unavailable() {
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"AI_PROVIDER_UNAVAILABLE",
            "The literary companion is temporarily unavailable. Your reading journal is still available.");
    }
    static ApiException busy() {
        return new ApiException(HttpStatus.TOO_MANY_REQUESTS,"AI_RATE_LIMITED",
            "The literary companion is busy. Please wait a moment before sending again.",5);
    }
}
