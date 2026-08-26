# Codex Native Control Center

An intentionally invasive, version-aware patch for the official OpenAI Codex VS Code extension. It places compact controls directly inside the native composer beside the model selector.

## What it adds

- A compact Power slider that drives Codex's own native reasoning picker
- A Compact button that submits `/compact` to the active native conversation
- A small remaining-usage bar updated by the extension host
- Automatic reapplication when the official Codex extension updates
- Version checks, an untouched HTML backup, diagnostics, and one-command rollback

There is no separate panel, Activity Bar entry, or duplicate status-bar control.

## Install

Install the official `openai.chatgpt` extension first, then download the latest VSIX and run:

```powershell
code --install-extension .\codex-control-center-0.2.0.vsix --force
```

Or install the newest GitHub release automatically:

```powershell
irm https://raw.githubusercontent.com/Andrianarivelo/codex-control-center/main/install.ps1 | iex
```

Reload VS Code when prompted. The controls appear in the composer immediately before the native model button.

## After an OpenAI update

The patcher watches extension changes and patches the new OpenAI version. If VS Code does not prompt automatically, run:

```text
Codex Control: Apply or Repair Native Controls
```

Then reload the window.

## Rollback

Run this command before uninstalling:

```text
Codex Control: Restore Original Codex UI
```

The extension also defines a VS Code uninstall hook that attempts to restore every installed Codex version.

## Technical behavior

The slider opens the native Codex Power menu and drives its built-in `data-reasoning-slider` keyboard control. This means the active composer owns the resulting model and reasoning selection. It does not edit `config.toml`.

The Compact button refuses to overwrite a non-empty draft. With an empty composer, it inserts `/compact`, selects the native command when available, and submits through the native composer.

Usage authentication stays in the extension host. Only sanitized percentages and reset timestamps are written to the patched webview assets.

## Important warning

This project modifies files inside the installed OpenAI extension. It is unsupported by OpenAI and a future UI redesign can break DOM discovery. The patcher refuses unknown HTML structures and keeps the original `index.html` beside the patched file for recovery.

## Development

```powershell
npm install
npm test
npm run package
```

## License

MIT
