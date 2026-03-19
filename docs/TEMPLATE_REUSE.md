# Company Template Reuse (Phase 8.3)

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

- `GET /api/admin/company-templates?orgName=...`
  - resolves org by owner + org name
  - returns saved templates for org
- `POST /api/admin/company-templates`
  - saves a new template for org

## Game Creation Reuse

`POST /api/admin/create-company-game` now supports:

- `orgId` reuse (optional)
- `templateId` reuse (optional)
- `saveTemplate` toggle

If `templateId` is provided, game creation reuses that template.
If no `templateId` and `saveTemplate` is true, a new template is created first.

## Web UI

`/admin/create-company-game` now supports:

- loading saved templates by org name
- selecting and applying a template
- saving current form settings as a template
- creating games using selected template with form prefill
