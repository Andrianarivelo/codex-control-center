window.__codexNativeControlsDispose?.();

const ID = "codex-native-controls",
  LABELS = ["Eco", "Low", "Med", "High", "XHigh", "Ultra"],
  PATCH_VERSION =
    document.querySelector("script[data-codex-control-version]")?.dataset
      .codexControlVersion || "dev";
let anchor = null,
  lastUsageRefresh = 0,
  mountFrame = 0,
  powerGeneration = 0,
  powerQueue = Promise.resolve();
const visible = (e) => {
  const t = e.getBoundingClientRect(),
    n = getComputedStyle(e);
  return (
    t.width > 0 &&
    t.height > 0 &&
    n.visibility !== "hidden" &&
    n.display !== "none"
  );
};
function effortIndex(e) {
  const t = String(e || "").toLowerCase();
  return t.includes("ultra")
    ? 5
    : t.includes("extra high") || t.includes("xhigh") || t.includes("max")
      ? 4
      : t.includes("high") || t.includes("extended")
        ? 3
        : t.includes("medium") || t.includes("standard")
          ? 2
          : t.includes("light") || t.includes(" low")
            ? t.includes("terra")
              ? 0
              : 1
            : 2;
}
function findModelButton() {
  const e = [...document.querySelectorAll("[contenteditable=true]")].filter(
      visible,
    ),
    nativeTriggers = [
      ...document.querySelectorAll(
        "[data-codex-intelligence-trigger][data-selected-reasoning-effort]",
      ),
    ].filter(visible),
    t = nativeTriggers.length
      ? nativeTriggers
      : [...document.querySelectorAll("button")].filter(visible).filter((e) => {
          const t = e.textContent.trim();
          return (
            /(?:5\.\d|codex|sol|terra|luna)/i.test(t) &&
            /(?:light|low|medium|standard|high|extended|xhigh|extra|max|ultra)/i.test(
              t,
            )
          );
        });
  if (!t.length) return null;
  if (!e.length) return t.at(-1);
  const n = e.at(-1).getBoundingClientRect();
  return t.sort(
    (e, t) =>
      Math.abs(e.getBoundingClientRect().bottom - n.bottom) -
      Math.abs(t.getBoundingClientRect().bottom - n.bottom),
  )[0];
}
function toast(e) {
  document.querySelector(".cn-toast")?.remove();
  const t = document.createElement("div");
  t.className = "cn-toast";
  t.textContent = e;
  document.body.append(t);
  setTimeout(() => t.remove(), 2600);
}
const waitFor = async (selector, timeout = 1800, mustBeVisible = true) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    const match = [...document.querySelectorAll(selector)].find(
      (element) => !mustBeVisible || visible(element),
    );
    if (match) return match;
    await new Promise((e) => setTimeout(e, 35));
  }
  return null;
};
function concealNativePicker(e) {
  const t =
    e.closest(
      "[cmdk-root],[data-radix-popper-content-wrapper],[role=dialog],[role=menu]",
    ) || e;
  const n = {
    opacity: t.style.getPropertyValue("opacity"),
    opacityPriority: t.style.getPropertyPriority("opacity"),
    pointerEvents: t.style.getPropertyValue("pointer-events"),
    pointerEventsPriority: t.style.getPropertyPriority("pointer-events"),
    transition: t.style.getPropertyValue("transition"),
    transitionPriority: t.style.getPropertyPriority("transition"),
  };
  t.style.setProperty("opacity", "0", "important");
  t.style.setProperty("pointer-events", "none", "important");
  t.style.setProperty("transition", "none", "important");
  return () => {
    for (const [r, i, o] of [
      ["opacity", n.opacity, n.opacityPriority],
      ["pointer-events", n.pointerEvents, n.pointerEventsPriority],
      ["transition", n.transition, n.transitionPriority],
    ])
      i ? t.style.setProperty(r, i, o) : t.style.removeProperty(r);
  };
}
function currentAnchor() {
  if (!anchor || !document.contains(anchor) || !visible(anchor))
    anchor = findModelButton();
  return anchor;
}
function nativePowerIndex() {
  const modelButton = currentAnchor();
  return modelButton ? effortIndex(modelButton.textContent) : null;
}
function nativeReasoningTrigger() {
  const selector =
      "[data-codex-intelligence-trigger][data-selected-reasoning-effort]",
    modelButton = currentAnchor();
  if (modelButton?.matches(selector)) return modelButton;
  const composer =
      modelButton?.closest("[data-codex-composer-root]") ||
      modelButton?.closest("[data-codex-composer]"),
    scoped = composer?.querySelector(selector);
  if (scoped) return scoped;
  const triggers = [...document.querySelectorAll(selector)];
  return triggers.find(visible) || triggers.at(-1) || null;
}
function nativeStateSignature() {
  const modelButton = currentAnchor(),
    trigger = nativeReasoningTrigger();
  return `${trigger?.dataset.selectedReasoningEffort || ""}|${modelButton?.textContent.trim() || ""}`;
}
async function waitForNativeStateChange(before, generation, timeout = 1200) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    if (generation !== powerGeneration) return false;
    if (nativeStateSignature() !== before) return true;
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
  return false;
}
function postReasoningCommand(direction) {
  window.postMessage(
    {
      type: "run-command",
      id:
        direction > 0
          ? "composer.increaseReasoningEffort"
          : "composer.decreaseReasoningEffort",
    },
    window.location.origin,
  );
}
async function setPowerWithNativeCommands(target, generation) {
  for (let step = 0; step < 8; step += 1) {
    if (generation !== powerGeneration) return false;
    const current = nativePowerIndex();
    if (current === target) return true;
    if (current === null || current === 0 || target === 0) return false;
    composerEditor()?.editor.focus({ preventScroll: true });
    const before = nativeStateSignature();
    postReasoningCommand(target > current ? 1 : -1);
    if (!(await waitForNativeStateChange(before, generation))) return false;
  }
  return nativePowerIndex() === target;
}
async function waitForOpenPowerControl(modelButton, timeout) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    const control = document.querySelector(
        "[data-reasoning-slider],[data-model-picker-view-toggle]",
      ),
      pickerIsOpen =
        modelButton.dataset.state === "open" ||
        modelButton.getAttribute("aria-expanded") === "true" ||
        Boolean(control?.closest('[data-state="open"]'));
    if (control && pickerIsOpen) return control;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return null;
}
function nativePickerIsOpen(modelButton) {
  return (
    modelButton.dataset.state === "open" ||
    modelButton.getAttribute("aria-expanded") === "true"
  );
}
async function waitForNativePickerOpen(modelButton, timeout) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    if (nativePickerIsOpen(modelButton)) return true;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return false;
}
async function revealNativePowerSlider() {
  const modelButton = currentAnchor();
  if (!modelButton) throw new Error("Active Codex model control was not found.");
  document.documentElement.classList.add("cn-power-bridge-active");
  let control = nativePickerIsOpen(modelButton)
    ? await waitForOpenPowerControl(modelButton, 1500)
    : null;
  if (!control && !nativePickerIsOpen(modelButton)) {
    const PointerEventConstructor = window.PointerEvent || window.MouseEvent;
    modelButton.dispatchEvent(
      new PointerEventConstructor("pointerdown", {
        bubbles: true,
        button: 0,
        buttons: 1,
        cancelable: true,
        composed: true,
        isPrimary: true,
        pointerId: 1,
        pointerType: "mouse",
      }),
    );
    let pickerOpened = await waitForNativePickerOpen(modelButton, 350);
    if (!pickerOpened) {
      modelButton.click();
      pickerOpened = await waitForNativePickerOpen(modelButton, 500);
    }
    if (pickerOpened)
      control = await waitForOpenPowerControl(modelButton, 1500);
  }
  if (!control) {
    document.documentElement.classList.remove("cn-power-bridge-active");
    throw new Error("Codex did not expose its native Power control.");
  }
  if (control.matches("[data-reasoning-slider]"))
    return { slider: control, release: concealNativePicker(control) };

  const releases = [concealNativePicker(control)];
  control.click();
  const slider = await waitFor("[data-reasoning-slider]", 1200, false);
  if (!slider) {
    releases.reverse().forEach((release) => release());
    document.documentElement.classList.remove("cn-power-bridge-active");
    throw new Error("Codex did not expose its native Power control.");
  }
  releases.push(concealNativePicker(slider));
  return {
    slider,
    release: () => releases.reverse().forEach((release) => release()),
  };
}
async function setPowerWithNativePicker(target, generation) {
  let bridge = null;
  try {
    bridge = await revealNativePowerSlider();
    for (let step = 0; step < 8; step += 1) {
      if (generation !== powerGeneration) return false;
      const current = nativePowerIndex();
      if (current === target) return true;
      if (current === null) return false;
      const slider =
          document.querySelector("[data-reasoning-slider]") || bridge.slider,
        key = target > current ? "ArrowRight" : "ArrowLeft",
        before = nativeStateSignature();
      slider.focus({ preventScroll: true });
      slider.dispatchEvent(
        new KeyboardEvent("keydown", {
          key,
          code: key,
          bubbles: true,
          cancelable: true,
          composed: true,
        }),
      );
      if (!(await waitForNativeStateChange(before, generation))) return false;
    }
    return nativePowerIndex() === target;
  } finally {
    const slider =
      document.querySelector("[data-reasoning-slider]") || bridge?.slider;
    if (slider && document.contains(slider))
      slider.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          code: "Escape",
          bubbles: true,
          cancelable: true,
          composed: true,
        }),
      );
    bridge?.release();
    document.documentElement.classList.remove("cn-power-bridge-active");
  }
}
async function applyNativePower(target, generation) {
  const input = document.querySelector(`#${ID} input`);
  if (!input || generation !== powerGeneration) return;
  try {
    let changed = await setPowerWithNativeCommands(target, generation);
    if (generation !== powerGeneration) return;
    if (!changed) changed = await setPowerWithNativePicker(target, generation);
    if (!changed || nativePowerIndex() !== target)
      throw new Error("Codex did not accept the requested reasoning effort.");
    sync(true);
  } catch (error) {
    if (generation !== powerGeneration) return;
    sync(true);
    toast(
      `Control Center ${PATCH_VERSION}: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    document.documentElement.classList.remove("cn-power-bridge-active");
    if (generation === powerGeneration) input.focus({ preventScroll: true });
  }
}
function setNativePower(target) {
  const generation = ++powerGeneration;
  powerQueue = powerQueue
    .catch(() => {})
    .then(() => applyNativePower(target, generation));
}
function composerEditor() {
  if (!anchor) return null;
  let e = anchor.parentElement;
  for (let t = 0; e && t < 8; t += 1, e = e.parentElement) {
    const t = [...e.querySelectorAll("[contenteditable=true]")].find(visible);
    if (t) return { editor: t, root: e };
  }
  return null;
}
async function compact() {
  const e = document.querySelector(`#${ID} .cn-compact`),
    t = composerEditor();
  if (!t) return toast("Active Codex composer was not found.");
  if (t.editor.textContent.trim())
    return toast("Send or clear the current draft before compacting.");
  e.disabled = true;
  e.setAttribute("aria-busy", "true");
  try {
    t.editor.focus();
    document.execCommand("insertText", false, "/compact");
    t.editor.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: "/compact",
      }),
    );
    await new Promise((e) => setTimeout(e, 180));
    const n = [
      ...document.querySelectorAll(
        "[cmdk-item],[role=option],[role=menuitem],button",
      ),
    ].find(
      (e) =>
        visible(e) &&
        /^\s*compact\b/i.test(e.textContent) &&
        !e.closest(`#${ID}`),
    );
    if (n) n.click();
    else {
      const r = [...t.root.querySelectorAll("button")]
        .filter(visible)
        .find((e) =>
          /send|submit/i.test(
            `${e.getAttribute("aria-label") || ""} ${e.title || ""}`,
          ),
        );
      r
        ? r.click()
        : t.editor.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "Enter",
              code: "Enter",
              bubbles: true,
            }),
          );
    }
    toast("Compaction requested for this thread.");
  } finally {
    setTimeout(() => {
      e.disabled = false;
      e.removeAttribute("aria-busy");
    }, 900);
  }
}
async function refreshUsage() {
  if (Date.now() - lastUsageRefresh < 10000) return;
  lastUsageRefresh = Date.now();
  try {
    const e = await fetch(`./assets/codex-native-usage.json?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!e.ok) return;
    const t = await e.json();
    if (!t.primary) return;
    const n = document.querySelector(`#${ID} .cn-usage`),
      r = Math.max(0, Math.min(100, Number(t.primary.remaining)));
    n.dataset.ready = "true";
    n.title = `5-hour allowance: ${r.toFixed(0)}% remaining${t.secondary ? `\nWeekly: ${Number(t.secondary.remaining).toFixed(0)}% remaining` : ""}`;
    n.querySelector(".cn-usage-fill").style.width = `${r}%`;
    const usageText = `${r.toFixed(0)}%`;
    if (n.querySelector(".cn-usage-text").textContent !== usageText)
      n.querySelector(".cn-usage-text").textContent = usageText;
  } catch {}
}
function sync(force = false) {
  if (!anchor) return;
  const e = effortIndex(anchor.textContent),
    t = document.querySelector(`#${ID} input`),
    n = document.querySelector(`#${ID} .cn-label`);
  if (!t || (!force && document.activeElement === t)) return;
  t.max = "5";
  t.value = String(e);
  t.style.setProperty("--cn-fill", `${e * 20}%`);
  if (n.textContent !== LABELS[e]) n.textContent = LABELS[e];
}
function controlsPlacement() {
  const e = composerEditor();
  if (!e) return null;
  let t = anchor;
  while (t.parentElement && t.parentElement !== e.root) t = t.parentElement;
  return { root: e.root, nativeRow: t };
}
function mount() {
  const e = findModelButton();
  if (!e) return;
  anchor = e;
  const n = controlsPlacement();
  if (!n) return;
  let t = document.getElementById(ID);
  t ||
    ((t = document.createElement("div")),
    (t.id = ID),
    (t.dataset.version = PATCH_VERSION),
    (t.innerHTML =
      '<div class="cn-content"><label class="cn-power" title="Native Codex Power"><input aria-label="Codex reasoning power" type="range" min="0" max="5" step="1"><span class="cn-label">Med</span></label><button class="cn-compact" title="Compact this Codex thread"><span class="cn-compact-icon" aria-hidden="true">&#10022;</span><span>Compact</span></button><span class="cn-usage"><span class="cn-usage-track"><i class="cn-usage-fill"></i></span><span class="cn-usage-text"></span></span></div>'),
    ["pointerdown", "mousedown", "mouseup", "click", "dblclick"].forEach(
      (e) => t.addEventListener(e, (e) => e.stopPropagation()),
    ),
    t
      .querySelector("input")
      .addEventListener("change", (e) =>
        setNativePower(Number(e.target.value)),
      ),
    t.querySelector("input").addEventListener("input", (e) => {
      const n = Number(e.target.value);
      e.target.style.setProperty("--cn-fill", `${n * 20}%`);
      t.querySelector(".cn-label").textContent = LABELS[n];
    }),
    t.querySelector(".cn-compact").addEventListener("click", compact));
  (t.parentElement !== n.root || t.nextElementSibling !== n.nativeRow) &&
    n.nativeRow.before(t);
  sync();
  refreshUsage();
}
const observer = new MutationObserver(() => {
  if (mountFrame) return;
  mountFrame = requestAnimationFrame(() => {
    mountFrame = 0;
    mount();
  });
});
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  characterData: true,
});
const maintenanceTimer = setInterval(() => {
  mount();
  refreshUsage();
}, 6e4);
window.__codexNativeControlsDispose = () => {
  observer.disconnect();
  clearInterval(maintenanceTimer);
  if (mountFrame) cancelAnimationFrame(mountFrame);
};
window.addEventListener("pagehide", window.__codexNativeControlsDispose, {
  once: true,
});
mount();
