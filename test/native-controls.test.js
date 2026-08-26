"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");

const injectedScript = fs.readFileSync(
  path.join(__dirname, "..", "resources", "codex-native-controls.js"),
  "utf8",
);

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function createNativeComposer(t) {
  const dom = new JSDOM(
    '<!doctype html><html><body><div id="root"><div id="composer"><div id="editor" contenteditable="true"></div><button id="model">5.6 Sol Extended</button></div></div></body></html>',
    {
      pretendToBeVisual: true,
      runScripts: "outside-only",
      url: "https://example.test/",
    },
  );
  t.after(() => {
    dom.window.__codexNativeControlsDispose?.();
    dom.window.close();
  });

  const { window } = dom;
  const { document } = window;
  window.Element.prototype.getBoundingClientRect = () => ({
    bottom: 100,
    height: 24,
    left: 0,
    right: 100,
    top: 76,
    width: 100,
    x: 0,
    y: 76,
    toJSON() {
      return this;
    },
  });
  window.getComputedStyle = () => ({ display: "block", visibility: "visible" });
  window.fetch = async () => ({ ok: false });

  const editor = document.getElementById("editor");
  const model = document.getElementById("model");
  const powerLabels = [
    "5.6 Terra Light",
    "5.6 Sol Light",
    "5.6 Sol Standard",
    "5.6 Sol Extended",
    "5.6 Sol Extra High",
    "5.6 Sol Ultra",
  ];
  let powerIndex = 3;

  model.addEventListener("click", () => {
    if (document.querySelector("[data-reasoning-slider=true]")) return;
    const nativeSlider = document.createElement("button");
    nativeSlider.dataset.reasoningSlider = "true";
    nativeSlider.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight")
        powerIndex = Math.min(powerLabels.length - 1, powerIndex + 1);
      if (event.key === "ArrowLeft") powerIndex = Math.max(0, powerIndex - 1);
      model.textContent = powerLabels[powerIndex];
      if (event.key === "Enter") nativeSlider.remove();
    });
    document.body.append(nativeSlider);
  });

  window.eval(injectedScript);
  return { document, editor, model, window };
}

test("the injected Power slider drives the native reasoning keyboard control", async (t) => {
  const { document, model, window } = createNativeComposer(t);
  const slider = document.querySelector(
    "#codex-native-controls input[type=range]",
  );
  assert.ok(
    slider,
    "the compact control group should mount beside the native model button",
  );

  slider.value = "4";
  slider.dispatchEvent(new window.Event("change", { bubbles: true }));
  await delay(400);

  assert.equal(model.textContent, "5.6 Sol Extra High");
  assert.equal(slider.value, "4");
});

test("the Compact button selects the native compact slash command", async (t) => {
  const { document, editor, window } = createNativeComposer(t);
  let compacted = false;

  document.execCommand = (_command, _showUi, value) => {
    editor.textContent = value;
    return true;
  };
  editor.addEventListener("input", () => {
    const command = document.createElement("button");
    command.setAttribute("cmdk-item", "");
    command.textContent = "Compact conversation";
    command.addEventListener("click", () => {
      compacted = true;
      editor.textContent = "";
      command.remove();
    });
    document.body.append(command);
  });

  document
    .querySelector("#codex-native-controls .cn-compact")
    .dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await delay(300);

  assert.equal(compacted, true);
  assert.equal(editor.textContent, "");
});
