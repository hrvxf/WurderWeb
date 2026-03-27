# Company Template Reuse (Phase 8.3)

Canonical product context:

- Templates are a Business workspace capability used from `/business/sessions/new`.
- Canonical template API is `/api/business/templates`.
- Legacy `/api/admin/company-templates` remains as a compatibility wrapper with telemetry during transition.

## Template Data Model

Templates are stored in:

- `orgs/{orgId}/templates/{templateId}` (canonical)
- `organizations/{orgId}/templates/{templateId}` (legacy mirror)
- `gameTemplates/{templateId}` (global compatibility mirror)

Template fields:

- `name`
- `orgId`
- `config`:
  - `mode`
  - `durationMinutes`
  - `wordDifficulty`
  - `teamsEnabled`
- `metricsEnabled`
- `managerDefaults`:
  - `minSecondsBeforeClaim`
  - `minSecondsBetweenClaims`
  - `maxActiveClaimsPerPlayer`
  - `freeRefreshCooldownSeconds`

## API Flow

- `GET /api/business/templates?orgName=...`
  - canonical Business template retrieval endpoint
  - resolves org by owner + org name
  - returns saved templates for org
- `POST /api/business/templates`
  - canonical Business template create endpoint
  - saves a new template for org

Legacy compatibility:

- `GET /api/admin/company-templates?orgName=...` -> compatibility wrapper to `/api/business/templates`
- `POST /api/admin/company-templates` -> compatibility wrapper to `/api/business/templates`
- wrappers emit `x-legacy-surface: admin-company-templates` and server telemetry logs

## Game Creation Reuse

`POST /api/b2b/sessions` now supports:

- `orgId` reuse (optional)
- `templateId` reuse (optional)
- `saveTemplate` toggle

If `templateId` is provided, game creation reuses that template.
If no `templateId` and `saveTemplate` is true, a new template is created first.

## Web UI

`/business/sessions/new` now supports:

- loading saved templates by org name
- selecting and applying a template
- saving current form settings as a template
- creating games using selected template with form prefill
