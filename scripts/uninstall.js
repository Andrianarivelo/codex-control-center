"use strict";
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  { restorePatch } = require("../src/patcher");
for (const root of [
  path.join(os.homedir(), ".vscode", "extensions"),
  path.join(os.homedir(), ".vscode-insiders", "extensions"),
])
  if (fs.existsSync(root))
    for (const name of fs.readdirSync(root))
      if (name.startsWith("openai.chatgpt-"))
        try {
          restorePatch(path.join(root, name));
        } catch {}
