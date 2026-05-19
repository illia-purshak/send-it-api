# CONVENTIONS
AUTH: Bearer JWT in Authorization header on all endpoints except public auth routes.
OWNERSHIP: All user endpoints auto-filter by authenticated user ID.
REST: GET list, GET /:id, POST create, PUT /:id update, DELETE /:id delete — unless noted.
ERRORS: {"statusCode":N,"error":"CODE","message":"..."} 

# MODULE: Shipments
Aggregator module — SendIt fetches shipment data from external operator APIs, NOT from local DB.
Local storage: drafts only (no TTN).
Status normalization: raw operator status → SendIt ShipmentStatus enum via hardcoded per-operator mappers.

STATUS MAP (normalized):
  DRAFT | CREATED | PREPARING | IN_TRANSIT | DELIVERED | CANCELLED | RETURNED | UNKNOWN

GET /shipments
  params: operator(slug), status(normalized+DRAFT), ttn, dateFrom, dateTo, valueFrom, valueTo, page, limit
  LOGIC: fetch from each ACTIVE UserPostalConnection in parallel
         normalize statuses via per-operator mappers
         merge with local drafts
         apply filters + pagination
         on any operator 401/403 → mark that connection INVALID, create notification, continue with others
  OUT 200: {data:[{ttn,operator:{name,slug},status,rawStatus,recipient,createdAt,declaredValue,isDraft}],total,page,limit}

GET /shipments/nova-poshta
  LOGIC: same as GET /shipments but NP only — used for selective refresh after creating NP shipment
  OUT 200: same shape, NP shipments only

GET /shipments/:ttn
  LOGIC: identify operator from TTN, fetch full details from operator API, normalize status
  OUT 200: {ttn,operator,status,rawStatus,recipient:{name,phone,address},weight,declaredValue,shipmentType,
            statusHistory:[{status,rawStatus,timestamp}]}

POST /shipments/nova-poshta
  IN: NP-specific form fields (full field mapping TBD after NP API docs review)
      optional: templateId (if provided → increment template.usageCount)
  LOGIC: decrypt NP apiKey, call NP POST /shipments
         on NP auth error → mark connection INVALID, create notification, return 422 CONNECTION_INVALID
         on success → return TTN + initial status from NP
  OUT 201: {ttn,status,rawStatus}
  ERR: 422 CONNECTION_INVALID, 400 VALIDATION_ERROR (NP rejected data), 503 OPERATOR_UNAVAILABLE

NOTE: /shipments/ukrposhta and /shipments/mist → future/mock, same pattern

# MODULE: Drafts
Incomplete shipment forms stored locally in SendIt DB. No TTN. Appear in /shipments with status DRAFT.

GET /drafts
  OUT 200: {data:[{id,postalService:{name,slug}|null,formData,createdAt,updatedAt}]}

GET /drafts/:id
  OUT 200: full draft with all formData fields
  ERR: 404, 403 if belongs to another user

POST /drafts
  IN: {postalServiceId?|null, formData:{...}}
  NOTE: postalServiceId nullable — draft can exist before operator selected
  OUT 201: created draft

PUT /drafts/:id
  IN: {postalServiceId?, formData?}
  OUT 200: updated draft

DELETE /drafts/:id
  LOGIC: hard delete — called after successful shipment creation OR manual user delete
  OUT 204
