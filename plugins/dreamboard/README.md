# Dreamboard plugin

Use Codex, Claude Code, or Cursor to find your synced Studio projects, edit card
data and customise game code. The plugin shares one skill and remote MCP endpoint
across the three hosts. The portable configuration uses `streamable-http`;
Claude and Cursor's native configuration uses their `http` spelling. It contains
no credentials or local server.

The hosted MCP endpoint and its OAuth integration must be deployed before sign-in
works. Shipping these plugin files alone does not enable the backend. Installation
also does not publish the plugin to any host's public directory.

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

Run these commands in Claude Code:

```text
/plugin marketplace add dreamboard-games/dreamboard-sdk
/plugin install dreamboard@dreamboard-games
```

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

## Use

Try “Find my Dreamboard projects” or “Help me customise this Studio game.”
Only actively synced projects are available; free accounts can sync one project.
Device-only projects still work in Studio. Use Settings → Manage sync to choose
which project to connect.

Reading uses the latest saved cloud revision. Card edits need the project open
in Studio with AI editing enabled, so changes use its normal validation and undo.
Game code uses a private project repository and temporary, repository-scoped Git
credentials. Credentials expire after one hour and must be renewed through the
connection tool. Never paste a token into a remote URL or commit it.

Access can be revoked in Studio's connected-app settings. Disabling project sync
stops new remote authoring access; already issued Git credentials expire at their
normal expiry.

## Maintainer checks

```sh
claude plugin validate plugins/dreamboard
claude plugin validate .claude-plugin/marketplace.json
```

Validate `plugin.json` and `mcp.json` against their declared Agent Plugins JSON
schemas. Check all three catalog paths, then test sign-in and tool use in each
host against a deployed test backend before release. Local manifest validation
does not prove OAuth or Git permissions.

Format references: [Codex plugins](https://developers.openai.com/plugins/build/plugins),
[Claude plugins](https://code.claude.com/docs/en/plugins-reference),
[Cursor plugins](https://cursor.com/docs/reference/plugins).
