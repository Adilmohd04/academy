# Custom Agent Rules

## Terminal Execution Constraint
- **Do not run terminal commands directly.** The agent has no permission to run terminal commands using the `run_command` tool.
- Instead, the agent must ask the user to run the command on their behalf in their own terminal.
- When the user runs the command, the agent can detect its execution state and output in the workspace or background, and should not execute `run_command` to wait or block on it.
