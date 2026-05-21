# Reel automation uses scheduler discovery plus one spawned process per due run

Reel automation now separates due-run discovery from flow execution. The scheduler checks which
user-scoped runs are due, then spawns a dedicated process for each due run instead of executing the
flow inline inside the polling worker. We chose this because `Reel Scripting` and `Reel Idea Generation`
must be able to run in parallel without sharing one long-lived execution loop, while still allowing
single-flow-per-user locking, clear run-level logging, and simpler failure boundaries.

Implemented consequences:

- due runs are persisted in `academy_reel_automation_runs`;
- the worker only discovers due runs and marks spawn failures;
- the child runner owns `queued -> processing -> completed/failed`;
- `Reel Idea Generation` reuses the queued run id instead of creating a nested second run;
- `Reel Scripting` executes directly against current `idea` reels during the spawned run.
