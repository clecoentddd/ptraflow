# **App Name**: MutationFlow

## Core Features:

- Mutation Event Trigger: Triggers a new droits mutation event, creating a new entry in the event stream.
- Event Sourcing Infrastructure: Captures state changes of droits mutations via command handlers, events, and projections using the Event Sourcing pattern.
- CQRS Implementation: Separates command and query responsibilities to optimize performance, routing commands to appropriate command handlers and queries to projections.
- Event Modeling with Slices: Implements a slice architecture where common slices are reused across different events, each tagged with a mutation type.
- Todo List Workflow: Manages droits mutations as a todo list, tracking the progress of each mutation step-by-step.
- State Projection Mock DB: Mock database built via synchronous projections to serve current application state to end-users
- Mutation UI: Presents an UI to show mutation progress.

## Style Guidelines:

- Primary color: Deep Indigo (#3F51B5) to represent structure and reliability.
- Background color: Light Gray (#ECEFF1), providing a clean and unobtrusive backdrop.
- Accent color: Vibrant Amber (#FFC107) for highlighting key actions and status indicators.
- Body and headline font: 'Inter', a grotesque-style sans-serif.
- Grid-based layout to provide structure to display event stream and related information clearly.
- Use icons to represent the status of events and slices within the mutations workflow, each distinct slice/event has an appropriate icon to convey context.
- Subtle transition animations to visually connect cause-and-effect when a state of a mutation changes.