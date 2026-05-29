Review the Swagger documentation and API implementation for outdated or duplicated endpoints and remove everything that is no longer relevant.

Main goal: Swagger should reflect the actual API, and the API should not contain duplicated or operator-specific shipment endpoints where generic CRUD and filtering can be used instead.

Tasks:

1. Check whether outdated Swagger entries are only stale documentation or real API endpoints.
   - If they exist only in Swagger, remove them from Swagger.
   - If they exist in the API, remove or refactor them.

2. Clean up duplicated postal operator records/names.
   - Keep only "Нова пошта".
   - Remove duplicate variants such as "Новопошта" / "НоваПост", unless they are technically required as internal codes.
   - Keep only "Міст" with the correct spelling using two "і".
   - Remove incorrect variants such as "Мист" / "Міст" with one wrong character.

3. Postal connections endpoints:
   - Remove duplicated or old operator-specific endpoints.
   - For Nova Poshta connection flow, keep only:
     - "request key"
     - "connect"
   - Remove old duplicate POST endpoints if they are no longer required.

4. Shipments endpoints:
   - Remove operator-specific shipment endpoints such as:
     - "shipments-novaposhta"
     - "shipments-ukrposhta"
     - "shipments-mist"
     - any GET/POST endpoints duplicated per operator.
   - Replace them with a single generic "shipments" resource.

5. Implement or review standard CRUD for shipments:
   - "GET /shipments" — list shipments
   - "POST /shipments" — create shipment
   - "GET /shipments/:id" — get shipment by ID
   - "PUT /shipments/:id" — update shipment data
   - "DELETE /shipments/:id" — delete/cancel shipment if supported

6. "GET /shipments" must support filtering and sorting.
   Required filtering:
   - by one operator
   - by multiple operators
   - by all relevant shipment fields where filtering makes sense

   Required sorting:
   - support sorting by all relevant sortable shipment fields
   - avoid frontend-side-only sorting when the data should be sorted through API query parameters

7. Do not create separate endpoints for creating, deleting, updating, or retrieving shipments of specific operators.
   Operator-specific behavior should be handled internally through the shipment payload, operator field, strategy/service layer, or provider adapter — not through separate public endpoints.

8. Update Swagger after cleanup.
   - Remove outdated endpoints.
   - Remove duplicated operator names.
   - Ensure "GET /shipments" clearly documents available filters, multi-operator filtering, and sorting parameters.
   - Swagger should only show the final minimal API surface.

9. Review the "Postal Connections" API and refactor it to follow a standard CRUD structure where possible.

   Preferred structure:
   - "GET /postal-connections"
   - "POST /postal-connections"
   - "GET /postal-connections/:id"
   - "PUT /postal-connections/:id"
   - "DELETE /postal-connections/:id"

   The postal operator should not be represented through separate duplicated endpoints where a generic endpoint can be used instead. The operator should be passed as a query parameter, route parameter, or request body field, depending on the method and existing API design.

   Example:
   - "GET /postal-connections?operator=nova-poshta"
   - "POST /postal-connections?operator=nova-poshta"
   - "PUT /postal-connections/:id?operator=ukrposhta"
   - "DELETE /postal-connections/:id?operator=mist"

   User ownership should be handled according to the existing authentication and authorization logic. If "userId" is already resolved from the access token/current user context, it should not be passed manually from the client unless the existing architecture requires it.

10. Handle the Nova Poshta connection flow separately if needed.

Nova Poshta has a different connection flow because the user first provides a phone number, receives or requests an API key, and only then completes the connection.

For this case, it is acceptable to keep a separate endpoint for requesting the Nova Poshta API key.

Suggested structure:

- "POST /postal-connections/nova-poshta/request-key" — request the API key using the phone number
- "POST /postal-connections?operator=nova-poshta" — connect Nova Poshta using the received API key

The final connection step should still use the generic "POST /postal-connections" endpoint with "nova-poshta" specified as the operator.
