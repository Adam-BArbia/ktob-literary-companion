package tn.ktob.api.shared;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Strict request fields: retain omitted/null distinctions and exact decimal ratings. */
public final class RequestFields {
    private static final JsonMapper MAPPER = JsonMapper.builder()
        .enable(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS)
        .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).build();
    private final JsonNode value;

    private RequestFields(JsonNode value) { this.value = value; }

    public static RequestFields parse(String raw, Set<String> allowed, Set<String> required) {
        if (raw == null || raw.length() > 200000) throw invalid("Request body is too large or missing.");
        JsonNode node;
        try { node = MAPPER.readTree(raw); }
        catch (RuntimeException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_JSON", "Request body is not valid JSON.");
        }
        if (node == null || !node.isObject() || node.size() == 0)
            throw invalid("Provide a nonempty JSON object.");
        for (var field : node.properties())
            if (!allowed.contains(field.getKey())) throw invalid("An unsupported field was supplied.");
        for (String key : required)
            if (!node.has(key)) throw invalid("A required field is missing: " + key + ".");
        return new RequestFields(node);
    }

    public boolean has(String key) { return value.has(key); }

    public String text(String key, boolean nullable) {
        JsonNode node = value.get(key);
        if (node == null || node.isNull()) {
            if (nullable) return null;
            throw invalid(key + " must be a string.");
        }
        if (!node.isTextual()) throw invalid(key + " must be a string.");
        return node.asText();
    }

    public Boolean bool(String key) {
        JsonNode node = value.get(key);
        if (node == null || !node.isBoolean()) throw invalid(key + " must be a boolean.");
        return node.booleanValue();
    }

    public UUID uuid(String key) {
        String text = text(key, true);
        if (text == null) return null;
        try { return UuidValue.parse(text); }
        catch (RuntimeException ex) { throw invalid(key + " must be a UUID or null."); }
    }

    public LocalDate date(String key) {
        String text = text(key, true);
        if (text == null) return null;
        try {
            if (!text.matches("\\d{4}-\\d{2}-\\d{2}")) throw new IllegalArgumentException();
            return LocalDate.parse(text);
        } catch (RuntimeException ex) { throw invalid(key + " must be a valid ISO date or null."); }
    }

    public BigDecimal decimal(String key) {
        JsonNode node = value.get(key);
        if (node == null || node.isNull()) return null;
        if (!node.isNumber()) throw invalid(key + " must be a number or null.");
        return node.decimalValue();
    }

    public Integer integer(String key) {
        JsonNode node = value.get(key);
        if (node == null || node.isNull()) return null;
        if (!node.isNumber()) throw invalid(key + " must be an integer or null.");
        try { return node.decimalValue().intValueExact(); }
        catch (ArithmeticException ex) { throw invalid(key + " must be an integer or null."); }
    }

    public List<String> strings(String key) {
        JsonNode node = value.get(key);
        if (node == null || !node.isArray()) throw invalid(key + " must be an array of strings.");
        List<String> result = new ArrayList<>();
        for (JsonNode item : node) {
            if (!item.isTextual()) throw invalid(key + " must contain strings only.");
            result.add(item.asText());
        }
        return List.copyOf(result);
    }

    public static ApiException invalid(String detail) {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", detail);
    }
}
