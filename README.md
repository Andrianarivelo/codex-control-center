# Codex Control Center

A compact companion for the official OpenAI Codex VS Code extension.

## Features

- Beautiful six-position reasoning slider: None, Low, Medium, High, X-High, and Max
- Atomic updates to `~/.codex/config.toml`
- Compact shortcut routed to the official Codex command menu
- Remaining-allowance bars for the 5-hour and weekly windows
- Status-bar controls with automatic usage refresh
- No modification of the official OpenAI extension

## Install

1. Install the official `openai.chatgpt` extension and sign in.
2. Download the `.vsix` from the latest GitHub release.
3. In VS Code, run **Extensions: Install from VSIX...** and select the file.
4. Reload VS Code.

Or install from a terminal:

```powershell
code --install-extension .\codex-control-center-0.1.0.vsix
```

For a one-command installation on any Windows machine:

```powershell
irm https://raw.githubusercontent.com/Andrianarivelo/codex-control-center/main/install.ps1 | iex
```

Click the reasoning indicator in the status bar to open the full control panel.

## Important technical boundary

The official Codex extension does not currently publish a direct VS Code command for compacting the active conversation. The Compact button therefore opens the official Codex command menu, where you select Compact. If that command menu is unavailable, the extension copies `/compact` to the clipboard.

Usage monitoring reads the existing local Codex authentication and requests `https://chatgpt.com/backend-api/wham/usage`. This is an internal ChatGPT endpoint, not a stable public API, so a future service update may require maintenance. Tokens are never logged or stored by this extension.

## Development

```powershell
npm install
npm test
npm run package
```

Pushing a version tag such as `v0.1.0` runs the test suite, builds the VSIX, and attaches it to a GitHub release automatically.

## License

MIT
