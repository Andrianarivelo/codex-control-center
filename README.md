# Codex Native Control Center

An intentionally invasive, version-aware patch for the official OpenAI Codex VS Code extension. It places compact controls in a dedicated accessory row inside the native composer, above the original model selector.

## What it adds

- A compact Power slider that drives Codex's own native reasoning picker
- A polished Compact action that submits `/compact` to the active native conversation
- A small remaining-usage bar updated by the extension host
- Automatic reapplication when the official Codex extension updates
- Version checks, an untouched HTML backup, diagnostics, and one-command rollback

There is no separate panel, Activity Bar entry, or duplicate status-bar control.

## Install

Install the official `openai.chatgpt` extension first, then download the latest VSIX and run:

```powershell
code --install-extension .\codex-control-center-0.2.4.vsix --force
```

Or install the newest GitHub release automatically:

```powershell
irm https://raw.githubusercontent.com/Andrianarivelo/codex-control-center/main/install.ps1 | iex
```

Reload VS Code when prompted. The controls appear in their own accessory row above the native model button, so the native and injected hit targets never overlap.

## After an OpenAI update

The patcher watches extension changes and patches the new OpenAI version. If VS Code does not prompt automatically, run:

```text
Codex Control: Apply or Repair Native Controls
```

Then reload the window.

Each release injects versioned asset URLs and rewrites older injection blocks, preventing the Codex webview cache from retaining an obsolete control script after an update.

## Rollback

Run this command before uninstalling:

```text
Codex Control: Restore Original Codex UI
```

The extension also defines a VS Code uninstall hook that attempts to restore every installed Codex version.

## Technical behavior

For ordinary changes, the slider invokes Codex's registered `composer.increaseReasoningEffort` and `composer.decreaseReasoningEffort` commands through the webview's native same-origin command channel. Every step waits for Codex's own selected-effort state to change before continuing. The Eco boundary and compatibility fallback use Codex's visually hidden `data-reasoning-slider` menu item, with the picker concealed before it can paint. The active composer therefore owns the real model and reasoning selection. The patch does not edit `config.toml`.

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
