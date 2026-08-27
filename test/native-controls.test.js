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

function createNativeComposer(
  t,
  { commandBridge = false, lazyPickerDelay = 0 } = {},
) {
  const dom = new JSDOM(
    '<!doctype html><html><body><div id="root"><div id="composer" data-codex-composer-root><div id="editor-wrap"><div id="editor" contenteditable="true" data-codex-composer></div></div><div id="native-row"><button id="model" data-state="closed" data-codex-intelligence-trigger data-selected-reasoning-effort="high">5.6 Sol Extended</button></div></div></div></body></html>',
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
  let nativePickerWasConcealed = false;
  let pickerViewWasToggled = false;
  let modelClicks = 0;
  const powerLabels = [
    "5.6 Terra Light",
    "5.6 Sol Light",
    "5.6 Sol Standard",
    "5.6 Sol Extended",
    "5.6 Sol Extra High",
    "5.6 Sol Ultra",
  ],
    effortValues = ["low", "low", "medium", "high", "xhigh", "max"],
    commands = [];
  let powerIndex = 3;

  function updatePower(nextIndex) {
    powerIndex = Math.max(0, Math.min(powerLabels.length - 1, nextIndex));
    model.textContent = powerLabels[powerIndex];
    model.dataset.selectedReasoningEffort = effortValues[powerIndex];
  }

  function createNativeSlider(nativePicker) {
    const nativeSlider = document.createElement("button");
    nativeSlider.dataset.reasoningSlider = "true";
    nativeSlider.getBoundingClientRect = () => ({
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      top: 0,
      width: 0,
      x: 0,
      y: 0,
      toJSON() {
        return this;
      },
    });
    nativeSlider.addEventListener("keydown", (event) => {
      nativePickerWasConcealed ||= nativePicker.style.opacity === "0";
      if (event.key === "ArrowRight") updatePower(powerIndex + 1);
      if (event.key === "ArrowLeft") updatePower(powerIndex - 1);
      if (event.key === "Enter" || event.key === "Escape") {
        nativePicker.remove();
        model.dataset.state = "closed";
      }
    });
    return nativeSlider;
  }

  function openNativePicker() {
    if (
      document.querySelector(
        "[data-reasoning-slider],[data-model-picker-view-toggle]",
      )
    )
      return;
    model.dataset.state = "open";
    const mountPicker = () => {
      if (model.dataset.state !== "open") return;
      const nativePicker = document.createElement("div");
      nativePicker.setAttribute("cmdk-root", "");
      const viewToggle = document.createElement("button");
      viewToggle.dataset.modelPickerViewToggle = "true";
      viewToggle.textContent = "Advanced";
      viewToggle.addEventListener("click", () => {
        nativePickerWasConcealed ||= nativePicker.style.opacity === "0";
        pickerViewWasToggled = true;
        nativePicker.replaceChildren(createNativeSlider(nativePicker));
      });
      nativePicker.append(viewToggle);
      document.body.append(nativePicker);
    };
    if (lazyPickerDelay) window.setTimeout(mountPicker, lazyPickerDelay);
    else mountPicker();
  }
  model.addEventListener("pointerdown", openNativePicker);
  model.addEventListener("click", () => {
    modelClicks += 1;
    if (model.dataset.state === "open") {
      model.dataset.state = "closed";
      document.querySelector("[cmdk-root]")?.remove();
    } else openNativePicker();
  });

  if (commandBridge)
    window.addEventListener("message", (event) => {
      if (event.data?.type !== "run-command") return;
      commands.push(event.data.id);
      if (event.data.id === "composer.increaseReasoningEffort")
        updatePower(powerIndex + 1);
      if (event.data.id === "composer.decreaseReasoningEffort")
        updatePower(powerIndex - 1);
    });

  window.eval(injectedScript);
  return {
    commands,
    document,
    editor,
    model,
    modelClicks: () => modelClicks,
    nativePickerWasConcealed: () => nativePickerWasConcealed,
    pickerViewWasToggled: () => pickerViewWasToggled,
    window,
  };
}

test("the injected Power slider can drive Codex's visually hidden Power control", async (t) => {
  const {
    document,
    model,
    nativePickerWasConcealed,
    pickerViewWasToggled,
    window,
  } = createNativeComposer(t);
  const slider = document.querySelector(
    "#codex-native-controls input[type=range]",
  );
  assert.ok(
    slider,
    "the compact control group should mount beside the native model button",
  );

  slider.value = "0";
  slider.dispatchEvent(new window.Event("change", { bubbles: true }));
  await delay(400);

  assert.equal(model.textContent, "5.6 Terra Light");
  assert.equal(slider.value, "0");
  assert.equal(nativePickerWasConcealed(), true);
  assert.equal(pickerViewWasToggled(), true);
  assert.equal(document.querySelector("[data-reasoning-slider=true]"), null);
});

test("ordinary effort changes use Codex's native run-command protocol", async (t) => {
  const { commands, document, model, pickerViewWasToggled, window } =
    createNativeComposer(t, { commandBridge: true });
  const slider = document.querySelector(
    "#codex-native-controls input[type=range]",
  );

  slider.value = "5";
  slider.dispatchEvent(new window.Event("change", { bubbles: true }));
  await delay(300);

  assert.equal(model.textContent, "5.6 Sol Ultra");
  assert.equal(model.dataset.selectedReasoningEffort, "max");
  assert.deepEqual(commands, [
    "composer.increaseReasoningEffort",
    "composer.increaseReasoningEffort",
  ]);
  assert.equal(pickerViewWasToggled(), false);
  assert.equal(document.querySelector("[cmdk-root]"), null);
});

test("a lazy native picker is not toggled closed while its control loads", async (t) => {
  const { document, model, modelClicks, window } = createNativeComposer(t, {
    lazyPickerDelay: 450,
  });
  const slider = document.querySelector(
    "#codex-native-controls input[type=range]",
  );

  slider.value = "0";
  slider.dispatchEvent(new window.Event("change", { bubbles: true }));
  await delay(900);

  assert.equal(model.textContent, "5.6 Terra Light");
  assert.equal(modelClicks(), 0);
});

test("the controls mount in their own row and contain pointer events", (t) => {
  const { document, window } = createNativeComposer(t);
  const controls = document.getElementById("codex-native-controls");
  const nativeRow = document.getElementById("native-row");
  let composerClicks = 0;
  document
    .getElementById("composer")
    .addEventListener("click", () => (composerClicks += 1));

  assert.equal(controls.parentElement.id, "composer");
  assert.equal(controls.nextElementSibling, nativeRow);
  assert.equal(controls.contains(nativeRow), false);

  controls
    .querySelector("input")
    .dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  assert.equal(composerClicks, 0);
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
