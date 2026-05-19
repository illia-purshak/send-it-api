# CONVENTIONS
AUTH: Bearer JWT in Authorization header on all endpoints except public auth routes.
OWNERSHIP: All user endpoints auto-filter by authenticated user ID.
REST: GET list, GET /:id, POST create, PUT /:id update, DELETE /:id delete — unless noted.
ERRORS: {"statusCode":N,"error":"CODE","message":"..."} 

# MODULE: Subscriptions
Manages CLIENT plan lifecycle. All client-initiated changes (except admin overrides) take effect
at START OF NEXT BILLING PERIOD, never immediately.
Plan limits: FREE=1 operator, PRO/BUSINESS=unlimited.

GET /subscriptions/plans
  OUT 200: {plans:[{id,level,name,price,maxOperators,description}]}
  NOTE: returns only isActive:true plans

GET /subscriptions/me
  OUT 200: {id,status,plan:{level,name,price},currentPeriodStart,currentPeriodEnd,nextPlan|null,cancelledAt|null}

PUT /subscriptions/me
  IN: {action, planId?}
  ACTIONS:
    upgrade   → requires planId, sets status:PENDING_UPGRADE, nextPlanId=planId, takes effect next period
    downgrade → requires planId, sets status:PENDING_DOWNGRADE, nextPlanId=planId, takes effect next period
                on activation: triggers operator deactivation logic if connections > new plan maxOperators
    cancel    → sets status:CANCELLED, cancelledAt=now(), remains active until period end then → FREE
    revert    → clears nextPlanId, resets status:ACTIVE (cancels pending upgrade/downgrade)
  OUT 200: updated subscription object
  ERR: 400 if action invalid for current status

SUBSCRIPTION STATUS VALUES:
  ACTIVE | PENDING_UPGRADE | PENDING_DOWNGRADE | CANCELLED (active until period end) | EXPIRED

OPERATOR DOWNGRADE LOGIC (runs on plan activation):
  if activeConnections.count > newPlan.maxOperators:
    return list of active connections for user to choose which to keep
    user selects → keep chosen as ACTIVE, set others to BLOCKED
    if user doesn't choose → auto-keep oldest by connectedAt, block rest
  on upgrade: set all BLOCKED connections back to ACTIVE

# MODULE: Billing
Mock payment system. No real payment gateway. All charges simulated by cron.

GET /billing
  params: page, limit
  OUT 200: {data:[{id,plan:{name,level},amount,status,periodStart,periodEnd,paidAt}],total,page,limit}

POST /billing/card
  IN: {cardNumber,expiryMonth,expiryYear,cardholderName}
  LOGIC: store only last 4 digits + expiry (mock, no gateway)
  OUT 201: {maskedNumber:"•••• •••• •••• 4242",expiryMonth,expiryYear}
  ERR: 409 card already exists (use PUT)

PUT /billing/card
  IN: same as POST
  OUT 200: updated masked card

DELETE /billing/card
  OUT 204

CRON JOBS:
  processSubscriptionRenewals — daily 00:00
    find subscriptions where currentPeriodEnd <= now()
    apply nextPlanId if set, or renew current plan
    create BillingHistory record (status:PAID, amount from plan or customAmount if set)
    one-time discount: reset customAmount=null after use

  activatePendingPlans — daily 00:00
    activate PENDING_UPGRADE/DOWNGRADE when period ends
    trigger operator deactivation logic on downgrade

  expireCancelledSubscriptions — daily 00:00
    transition CANCELLED→FREE when currentPeriodEnd passed
