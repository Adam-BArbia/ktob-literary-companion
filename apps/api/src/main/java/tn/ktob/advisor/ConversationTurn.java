package tn.ktob.advisor;

import java.util.List;
import java.util.UUID;

public record ConversationTurn(ConversationMessage userMessage, ConversationMessage assistantMessage,
    List<UUID> proposalIds, SpoilerLevel spoilerLevel) {}
