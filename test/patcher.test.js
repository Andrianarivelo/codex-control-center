"use strict";
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  test = require("node:test"),
  assert = require("node:assert/strict"),
  {
    ASSETS,
    BEGIN,
    END,
    applyPatch,
    patchHtml,
    restorePatch,
    unpatchHtml,
  } = require("../src/patcher");
const fixture =
  '<html><head><!-- PROD_CSP_TAG_HERE --></head><body><div id="root"></div></body></html>';
test("injects native controls exactly once", () => {
  const once = patchHtml(fixture),
    twice = patchHtml(once);
  assert.match(once, new RegExp(BEGIN));
  assert.match(once, new RegExp(END));
  assert.equal(twice, once);
});
test("unpatch returns the original HTML", () =>
  assert.equal(unpatchHtml(patchHtml(fixture)), fixture));
test("rejects an unknown webview structure", () =>
  assert.throws(() => patchHtml("<html></html>"), /does not match/));
test("rejects a partial injection marker", () =>
  assert.throws(() => patchHtml(`${fixture}${BEGIN}`), /partial/));
test("detects changed patch assets after the HTML is already injected", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-native-controls-")),
    extension = path.join(root, "openai.chatgpt-test"),
    assets = path.join(root, "assets");
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(extension, "webview", "assets"), { recursive: true });
  fs.mkdirSync(assets);
  fs.writeFileSync(
    path.join(extension, "package.json"),
    JSON.stringify({ publisher: "openai", name: "chatgpt", version: "test" }),
  );
  fs.writeFileSync(path.join(extension, "webview", "index.html"), fixture);
  for (const asset of ASSETS) fs.writeFileSync(path.join(assets, asset), asset);
  const first = applyPatch(extension, assets),
    second = applyPatch(extension, assets);
  fs.writeFileSync(path.join(assets, ASSETS[0]), "updated");
  const third = applyPatch(extension, assets);
  assert.equal(first.changed, true);
  assert.equal(second.changed, false);
  assert.equal(third.htmlChanged, false);
  assert.equal(third.assetsChanged, true);
  assert.equal(third.changed, true);
  fs.writeFileSync(
    path.join(extension, "webview", "assets", "codex-native-usage.json"),
    "{}",
  );
  restorePatch(extension);
  assert.equal(
    fs.readFileSync(path.join(extension, "webview", "index.html"), "utf8"),
    fixture,
  );
  assert.equal(
    fs.existsSync(
      path.join(
        extension,
        "webview",
        "index.html.codex-native-controls.backup",
      ),
    ),
    false,
  );
  for (const asset of [...ASSETS, "codex-native-usage.json"])
    assert.equal(
      fs.existsSync(path.join(extension, "webview", "assets", asset)),
      false,
    );
});
