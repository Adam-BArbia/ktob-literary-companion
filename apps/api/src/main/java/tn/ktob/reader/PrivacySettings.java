package tn.ktob.reader;

public record PrivacySettings(boolean aiProcessingOptIn, boolean personalizationOptIn,
    boolean useReadingHistory, boolean useAllowedJournal, boolean useExplicitPreferences,
    boolean useApprovedMemories) {}
