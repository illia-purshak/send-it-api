# CONVENTIONS
AUTH: Bearer JWT in Authorization header on all endpoints except public auth routes.
OWNERSHIP: All user endpoints auto-filter by authenticated user ID.
REST: GET list, GET /:id, POST create, PUT /:id update, DELETE /:id delete — unless noted.
ERRORS: {"statusCode":N,"error":"CODE","message":"..."} 

# MODULE: Postal Connections
Links CLIENT accounts to postal operators via encrypted API keys.
RULE: max one connection per operator per user (@@unique[userId,postalServiceId]).
RULE: active connection count limited by subscription plan maxOperators.
RULE: no DISCONNECTED status — manual removal = hard delete.
RULE: key validity discovered lazily on first real operation (not at connect time).

GET /postal-connections
  OUT 200: {connections:[{id, postalService:{id,name,slug,logoUrl}, status, connectedAt, updatedAt}]}
  NOTE: apiKey NEVER returned

POST /postal-connections/nova-poshta
  IN: {apiKey}
  LOGIC: check no existing record for NP (→409), check active count < plan.maxOperators (→403),
         encrypt key, save UserPostalConnection(status:ACTIVE)
  OUT 201: connection object
  ERR: 409 CONNECTION_ALREADY_EXISTS (use PUT), 403 OPERATOR_LIMIT_REACHED

PUT /postal-connections/nova-poshta
  IN: {apiKey}
  LOGIC: find existing record (any status), overwrite key+status:ACTIVE, update updatedAt
  OUT 200: updated connection
  ERR: 404 CONNECTION_NOT_FOUND (use POST first)

DELETE /postal-connections/nova-poshta
  LOGIC: hard delete UserPostalConnection record
  OUT 204
  ERR: 404

NOTE: /postal-connections/ukrposhta and /postal-connections/mist follow identical patterns (future).

INVALID STATUS FLOW:
  Any NP API call fails with auth error →
    set UserPostalConnection.status=INVALID
    create POSTAL_CONNECTION notification for user
    return 422 CONNECTION_INVALID to client

# MODULE: Nova Post API Integration

BASE_URLS:
  production (all): https://api.novapost.com/v.1.0
  production (UA only, faster): https://api.novaposhta.ua/v.1.0
  sandbox: https://api-stage.novapost.pl/v.1.0

AUTH FLOW (two-step):
  1. Store encrypted apiKey in UserPostalConnection
  2. GET /clients/authorization?apiKey={decryptedKey} → {jwt}
  3. All NP requests: Authorization: {jwt}
  JWT valid 1 hour. SendIt caches per user connection for 55min (5min safety buffer).
  JWT generation fail → mark connection INVALID

SANDBOX KEY (dev only):
  POST https://api-stage.novapost.pl/v.1.0/test-api-keys
  IN: {phone:"49XXXXXXXXX"}  // UA numbers not supported
  RULES: 1 active key per phone, 1 request/day, repeated call same day returns same key
  OUT: {apiKey, createdAt, expDate, status:"Active"|"Expired"}

NP ERROR HANDLING:
  401 → regenerate JWT and retry once
  403 → mark connection INVALID, notify user
  422 → return field validation errors to client form
  503 → return OPERATOR_UNAVAILABLE

DICTIONARIES (SendIt fetches+caches for form dropdowns):
  GET /divisions
    params: countryCodes[], divisionCategories[Postomat|PostBranch|CargoBranch|PUDO], settlementIds[], statuses[], limit, page
    key fields: id, number, name, address, settlement.name, divisionCategory, status,
                maxWeightPlaceSender(g), maxWeightPlaceRecipient(g), workSchedule
    cache: 24h

  GET /dictionary/measurements
    key fields: code, name, shortname
    cache: 7d

  GET /dictionary/currencies
    key fields: code(ISO4217), name, symbol
    cache: 7d

  GET /dictionary/classifier
    params: country-code, keyword, fuzzy, locale, size
    use: HS codes for customs declarations on international shipments

  GET /dictionary/customs-fees/{countryCode}
    use: rules for who pays customs (sender/recipient) and declared value limits

SHIPMENTS (field mapping TBD after full NP API review):
  POST /shipments — create waybill
  PUT  /shipments — update shipment
  GET  /shipments — list/tracking
  POST /shipments/calculations — cost estimate before creation

CACHING STRATEGY:
  JWT token: 55min, in-memory/Redis per user connection
  Divisions: 24h
  Measurements/Currencies: 7d
  Shipment statuses: not cached, always live
