# Application Audit Report

## Backend

### Administration Panel

#### Subscriptions Module — Incorrect Domain Model

**Problem**

The current `/admin/subscriptions` page manages subscriptions assigned to individual users. This is conceptually incorrect.

The page should manage subscription plans themselves rather than user subscriptions.

**Required Changes**

The Subscriptions page should become a subscription-plan management interface.

Administrators must be able to:

- Create new subscription plans.
- Edit existing subscription plans.
- Enable or disable plans.
- Mark plans as seasonal or temporarily unavailable.
- Configure:
  - Plan name.
  - Plan description.
  - Plan duration (e.g. 1 month, 3 months, 12 months).
  - Price.
  - Status (active/inactive).
  - Allowed number of connected postal operators.
  - Enabled modules/features.
  - Other subscription limitations.

Examples:

- Free
- Basic
- Business
- Enterprise

Each plan should represent a reusable template applied to multiple users.

---

#### User Subscription Management Must Be Moved

Management of a specific user's subscription should be removed from the Subscriptions page and relocated to the User Details page.

Within a specific user profile, administrators should be able to:

- View current subscription.
- View subscription history.
- Change subscription manually.
- Extend subscription.
- Suspend subscription.
- Cancel subscription.
- Reactivate subscription.
- Override subscription price for a specific user if necessary.

Administrators must not be able to rename subscription plans from the user page because that would affect all users.

---

#### User Details Page — Missing Administrative Controls

Additional administrative controls should be added to the user details page.

Administrators should be able to:

- View connected postal operators.
- Disconnect operators manually.
- Change subscription state.
- Block user.
- Unblock user.
- View subscription-related information.
- View integration-related information.

---

### Postal Services Module

#### Admin Services Page Relevance Review

**Problem**

The current Services page appears to have no actual backend functionality.

The form currently contains only:

- Service name.
- Slug.
- Logo.

However, postal providers are hardcoded in the backend and there is no infrastructure allowing dynamic registration of a new postal service through the admin panel.

**Required Review**

Verify whether the backend contains a complete flow for:

- Creating postal services.
- Configuring integrations.
- Managing adapters.
- Managing provider credentials.

If such functionality does not exist, the entire Services page should be removed from the administration panel to avoid exposing a misleading interface.

---

### Notifications

#### Email Delivery Service

**Required Task**

Implement email delivery using Nodemailer.

The system should support:

- Transactional emails.
- Password reset emails.
- Verification emails.
- Admins invites.

---

## Frontend

### Shipments Module

#### Shipment Edit Flow Broken

**Problem**

The Edit action on shipments opens an empty form instead of loading existing shipment data.

**Expected Behavior**

When a user clicks **Edit Shipment**:

- The shipment should be fetched.
- All available fields should be prefilled.
- The form should open in edit mode.
- Saving should update the existing shipment.

---

#### Shipment Duplication Flow Broken

**Problem**

The Duplicate action opens an empty form.

**Expected Behavior**

When a user clicks **Duplicate Shipment**:

- A new shipment form should open.
- All fields should be prefilled using the source shipment.
- New entity identifiers should not be copied.
- The user should be able to modify and create a new shipment based on the original one.

---

### Templates Module

#### Template Usage Flow Broken

**Problem**

Clicking "Use Template" opens a shipment form that is not populated with template data.

**Expected Behavior**

When a user selects a template:

- The shipment creation form should open.
- All shipment-related fields should be automatically populated from the template.
- The user should only review and submit the shipment.

---

#### Template Edit Flow Broken

**Problem**

Template editing loads only a subset of fields.

Currently only some metadata is populated:

- Template name.
- Description.
- Postal operator.
- Shipment type.

All remaining shipment configuration fields are empty.

**Expected Behavior**

The entire template configuration must be restored and displayed in the edit form.

All fields used during template creation must be loaded back into the form.

---

### Contacts / Recipients Module

#### Missing Placeholders and Form Mismatch

**Problem**

Recipient forms have lost placeholders and appear partially inconsistent with backend requirements.

Although the form is still functional, backend validation errors indicate that the frontend schema no longer matches the API contract.

Examples include backend requirements for fields such as:

- Company name.
- EDRPOU.
- Additional organization-related fields.

These fields are not available in the frontend form.

**Required Actions**

- Audit all recipient-related DTOs.
- Compare frontend schemas against backend validation schemas.
- Restore missing fields.
- Restore placeholders.
- Ensure field names match backend contracts.
- Ensure all required backend fields are represented in the UI.

This issue indicates a potentially broader frontend-backend contract mismatch and should be investigated across the entire Contacts module.
