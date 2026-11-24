package tn.ktob.advisor;

import java.util.List;

/** Provider input intentionally has no journal, reader identity, profile, or memory fields. */
public interface LiteraryAiPort {
    record PromptMessage(String role, String content) {}
    boolean available();
    String complete(List<PromptMessage> messages);
}
