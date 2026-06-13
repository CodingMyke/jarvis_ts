# Reel automation uses scheduler discovery plus one spawned process per due run

Reel automation now separates due-run discovery from flow execution. The scheduler checks which
user-scoped runs are due, then spawns a dedicated process for each due run instead of executing the
flow inline inside the polling worker. We chose this because `Reel Scripting` and `Reel Idea Generation`
must be able to run in parallel without sharing one long-lived execution loop, while still allowing
single-flow-per-user locking, clear run-level logging, and simpler failure boundaries.
