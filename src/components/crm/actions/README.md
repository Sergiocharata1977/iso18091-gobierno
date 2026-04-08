# CRM actions/

This folder contains reusable action-related building blocks used across CRM pages:

- `ActionTypeBadge`
- `ClientActionTimeline`
- `NewActionModal`
- `PendingActionsWidget`

Functional role:

- Shared UI primitives and composite widgets for action workflows.
- No direct ownership of main "list/grid/kanban" action screens.

Relationship with `../acciones/`:

- `actions/` provides reusable support components.
- `acciones/` hosts the main action view components and form page blocks.
- There is no direct functional duplication between both folders.
