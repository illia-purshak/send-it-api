# Frontend Report: Admin Services Page Relevance Review

## Verdict: Remove the Services Page

The backend investigation confirmed that the Admin Services page provides no real integration functionality. **The Services page must be removed from the admin panel.**

The backend routes (`GET/POST/PUT/DELETE /api/v1/admin/services`) have been **unregistered** — they will return 404. Any existing frontend calls to these endpoints will fail and must be removed.

---

## Why the Page Was Misleading

The admin Services form (name, slug, logo) implied that admins could dynamically register new postal operators. In reality:

| What the UI suggested | What actually happened |
|-----------------------|------------------------|
| Create a new operator | Only inserted a display-only DB row — zero integration effect |
| Toggle isActive | Flag was never checked — operators stayed fully functional regardless |
| Delete a service | Blocked if connections exist; had no effect on live integrations |
| Update name / logo | The only real action — name and logo are shown in the UI |

**Root cause:** All postal operator dispatch in the backend is hardcoded. The shipments module routes requests with explicit `if (operator === 'nova-post')` / `if (operator === 'ukrposhta')` / `if (operator === 'meest')` checks. Adding a new `PostalService` DB record would never reach any of these code paths.

Each operator's backend service also auto-creates its own `PostalService` row with a hardcoded slug on startup — the admin panel's CREATE endpoint was redundant even for the operators that do exist.

---

## What to Remove on the Frontend

- Remove the entire **Services** section from the admin navigation menu.
- Remove the Services list page and the create/edit form.
- Remove all API calls to `/api/v1/admin/services`.

---

## What Replaces It (Nothing Required)

The frontend does not need a replacement for this page. Operator information displayed in the UI (name, logo) comes from the user-facing postal connections response, not from the admin services catalog:

```
GET /api/v1/postal-connections
→ postalService: { name, slug, logoUrl }   ← already embedded per-connection
```

The three supported operators (Nova Post, Ukrposhta, Meest) are registered in the DB automatically by the backend the first time they are used. No admin action is required to make them available.

---

## If Operator Branding Editing Is Still Needed

The investigation found that `name` and `logoUrl` on an existing operator ARE displayed in the UI. If the product requires admins to be able to update an operator's display name or logo, that could be re-exposed as a narrow `PATCH /api/v1/admin/services/:id` endpoint limited to those two fields — but this would be a new, scoped feature request, not a restoration of the current Services page.

For now: remove the page entirely as specified in the audit.
