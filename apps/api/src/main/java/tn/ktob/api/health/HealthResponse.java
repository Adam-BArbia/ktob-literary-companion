package tn.ktob.api.health;

/**
 * Public, minimal liveness payload specified in docs/architecture/openapi.json.
 * No database, upstream status, build version, or other sensitive diagnostics.
 */
public record HealthResponse(String status) {}
