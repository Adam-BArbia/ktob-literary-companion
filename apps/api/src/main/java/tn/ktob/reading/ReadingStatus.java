package tn.ktob.reading;

import tn.ktob.api.shared.RequestFields;

public enum ReadingStatus {
    CURRENTLY_READING, PAUSED, FINISHED, DID_NOT_FINISH;

    public boolean open() { return this==CURRENTLY_READING || this==PAUSED; }

    public static ReadingStatus parse(String value) {
        try { return valueOf(value); }
        catch (RuntimeException ex) { throw RequestFields.invalid("Invalid reading status."); }
    }
}
