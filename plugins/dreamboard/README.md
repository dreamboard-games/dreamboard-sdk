# Dreamboard plugin

Turn a game idea into a playable prototype with Codex, Claude Code, or Cursor and
[Dreamboard Studio](https://dreamboard.games). Choose a template, create and review
cards, write rules, set up a playtest table, and print a test deck. For custom game
rules and interfaces, develop the code, run checks, verify the build and playtest
the result.

Dreamboard is free to start. Create an account and sync a project to work on it
with your agent, or connect an existing project. Current allowances and plan
details are available in Studio and the [service terms](https://dreamboard.games/paid-services).

## Install

### Codex

Add this repository as a marketplace, then install Dreamboard from that marketplace:

```sh
codex plugin marketplace add dreamboard-games/dreamboard-sdk
codex plugin add dreamboard@dreamboard-games
```

The repo catalog lives in `.agents/plugins/marketplace.json`; Codex reads the
portable `plugins/dreamboard/plugin.json` manifest. The desktop app can also use
the repo marketplace through its Plugins directory.

### Claude Code

In Claude Code v2.1.275 or later, run:

```text
/plugin install dreamboard --marketplace dreamboard-games/dreamboard-sdk
```

Review the plugin and choose its installation scope. Older clients can run
`/plugin marketplace add dreamboard-games/dreamboard-sdk`, then
`/plugin install dreamboard@dreamboard-games`.

Claude uses `.claude-plugin/marketplace.json` and the plugin's Claude manifest.

### Cursor

The repository includes `.cursor-plugin/marketplace.json` and a Cursor plugin
manifest for marketplace distribution. Until it is available in Cursor's public
marketplace, add this remote server in Cursor's MCP settings:

```json
{
  "mcpServers": {
    "dreamboard": {
      "url": "https://api.dreamboard.games/mcp"
    }
  }
}
```

Install the [Dreamboard skill](skills/dreamboard/SKILL.md) into your agent's skill
directory as described in Cursor's skills documentation. This uses the same
server and instructions as the packaged plugin. Do not add API keys or tokens
to the configuration. Complete the browser sign-in when prompted.

The setup cards in Studio's **Settings → MCP → Connect your tools** provide these
instructions and an **Add MCP to Cursor** install link. That shortcut installs the
connection only; install the skill separately or use the full plugin once listed.
A setup click is not proof of a connection: complete Dreamboard sign-in and consent.

## Use

Try “Help me make a two-player card game,” “Show me my cards,” or “Implement and
test this game's scoring.” Start with a few cards, try the core loop, then use
playtest feedback to refine the rules and expand the deck.

Only actively synced projects are available to the plugin. Device-only projects
still work in Studio. Use Studio's cloud project settings to choose which project
to connect; the agent can check your current sync allowance.

Reading uses the latest saved cloud revision. Card edits are validated and saved
directly to the synced project, even while Studio is closed. Concurrent changes
are checked against the saved revision. Each edit has a seven-day recovery receipt;
reverting writes a new revision and refuses to overwrite subsequent edits.
This recovery is separate from the editor's local Undo.
Game code uses a private project repository and temporary, repository-scoped Git
credentials. Credentials expire after one hour and must be renewed through the
connection tool. Never paste a token into a remote URL or commit it.

Access can be revoked in Studio's Settings → MCP. Disabling project sync
stops new remote authoring access; already issued Git credentials expire at their
normal expiry.

## Maintainer checks

The plugin shares one skill and remote MCP endpoint across the three hosts. The
portable configuration uses `streamable-http`; Claude and Cursor's native
configuration uses their `http` spelling. It contains no credentials or local
server. The hosted endpoint and OAuth integration must be deployed before sign-in
works. Shipping these files does not deploy the service or publish the plugin to
a host's public directory.

```sh
claude plugin validate plugins/dreamboard
claude plugin validate .claude-plugin/marketplace.json
```

Validate `plugin.json` against its declared Agent Plugins schema. For `mcp.json`,
the generic 1.0.0 schema rejects the per-server `extensions` field that OpenAI
uses for OAuth. Verify its DCR settings in the OpenAI connection panel.
Check all three catalog paths, then test sign-in and tool use in each
host against a deployed test backend before release. Local manifest validation
does not prove OAuth or Git permissions.

Format references: [Codex plugins](https://developers.openai.com/plugins/build/plugins),
[Claude plugins](https://code.claude.com/docs/en/discover-plugins),
[Cursor plugins](https://cursor.com/docs/plugins).
