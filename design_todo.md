Todo List Pattern: Implementation
Projection Responsibilities
The Todo List Projection:

Listens to domain events from event store
Creates todo items when trigger events occur
Updates todo item states when completion events occur
Maintains todo list as a read model

State Change Mechanism
Initial Creation:

Trigger domain event occurs
Projection creates multiple todo items
First item: status = TODO
Subsequent items: status = PENDING (default)

State Transitions:

Completion domain event occurs
Projection finds matching todo item
Updates that item: status = DONE
Updates next item: PENDING → TODO

Domain Events Drive Everything
Trigger Events:

Create new todo items
Initialize first step as TODO

Completion Events:

Mark current step DONE
Advance next step to TODO

Processing Flow
Workers/Automations:

Query todo list WHERE status = TODO
Execute business logic
Issue command
Command produces completion domain event
Event triggers projection state change

Manual Tasks:

UI queries todo list WHERE status = TODO
User executes command
Command produces completion domain event
Event triggers projection state change

Projection State Logic

Receives domain event
Matches event type to todo item
Changes status: PENDING → TODO or TODO → DONE
Next item becomes available (TODO) based on completion event

Domain events are the only mechanism that changes todo states. Projection reacts, never initiates.

Todo List Pattern: Slice Interaction
Automation Slice
Only the processor knows about the todo list.
Processor:
  - Queries todo list WHERE status = TODO
  - Finds work
  - Executes command
  - Command → Domain Event → Projection updates state
The command handler itself doesn't know about todos. Only the processor that triggers the command knows.
Manual Slice
Yes, the UI reads the todo list and calls the command.
UI:
  - Queries todo list WHERE status = TODO
  - Displays pending manual tasks to user
  - User clicks action
  - UI calls command
  - Command → Domain Event → Projection updates state
The command handler still doesn't know about todos. The UI is responsible for querying the todo list to show what needs doing.
Key Separation
Command Handlers:

Don't know about todo list
Just process commands
Emit domain events

Todo List Projection:

Reacts to domain events
Updates states

Processors (automation):

Query todo list
Trigger commands

UI (manual):

Query todo list
Display to user
User triggers commands

The todo list sits between domain events and the things that need to react (processors or UI).