# Agent Rules and Learnings

## MCP Configuration Debugging
- **Listen to the User**: When a user states that an MCP token worked recently but failed after a restart, do NOT blindly generate a new token. This indicates a token persistence or configuration injection failure, not a token expiration issue.
- **Check Global Configurations First**: If the Antigravity IDE UI reports an MCP server is "Unauthorized" or failing to initialize, check the global MCP configuration at `~/.gemini/config/mcp_config.json`. The IDE UI reads from this global file, not necessarily from a local workspace `.mcp.json`.
- **Root Cause Analysis**: If you find yourself repeating the same fix (e.g., generating multiple tokens) and it only works temporarily, STOP. Identify where the configuration is being lost or overridden.

## Communication
- Do not dismiss the user's explicit statements about timelines or recent actions. If the user says they did something 5 hours ago and it worked, treat that as ground truth and debug from there.
