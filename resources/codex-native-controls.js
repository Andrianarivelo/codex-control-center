window.__codexNativeControlsDispose?.();

const ID = "codex-native-controls",
  LABELS = ["Eco", "Low", "Med", "High", "XHigh", "Ultra"];
let anchor = null,
  applying = false,
  lastUsageRefresh = 0,
  mountFrame = 0;
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
    t = [...document.querySelectorAll("button")].filter(visible).filter((e) => {
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
const waitFor = async (e, t = 1800) => {
  const n = Date.now();
  while (Date.now() - n < t) {
    const t = [...document.querySelectorAll(e)].find(visible);
    if (t) return t;
    await new Promise((e) => setTimeout(e, 35));
  }
  return null;
};
async function setNativePower(e) {
  if (!anchor || applying) return;
  applying = true;
  const t = document.querySelector(`#${ID} input`),
    n = effortIndex(anchor.textContent);
  try {
    anchor.click();
    const t = await waitFor("[data-reasoning-slider=true]");
    if (!t) throw new Error("Native Power slider was not found.");
    const r = e - n,
      i = r > 0 ? "ArrowRight" : "ArrowLeft";
    for (let e = 0; e < Math.abs(r); e += 1)
      (t.dispatchEvent(
        new KeyboardEvent("keydown", { key: i, code: i, bubbles: true }),
      ),
        await new Promise((e) => setTimeout(e, 90)));
    t.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        bubbles: true,
      }),
    );
    await new Promise((e) => setTimeout(e, 120));
    sync();
  } catch (e) {
    t.value = String(n);
    t.style.setProperty("--cn-fill", `${n * 20}%`);
    toast(e instanceof Error ? e.message : String(e));
  } finally {
    applying = false;
  }
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
function sync() {
  if (!anchor) return;
  const e = effortIndex(anchor.textContent),
    t = document.querySelector(`#${ID} input`),
    n = document.querySelector(`#${ID} .cn-label`);
  if (!t || document.activeElement === t) return;
  t.max = "5";
  t.value = String(e);
  t.style.setProperty("--cn-fill", `${e * 20}%`);
  if (n.textContent !== LABELS[e]) n.textContent = LABELS[e];
}
function mount() {
  const e = findModelButton();
  if (!e) return;
  anchor = e;
  let t = document.getElementById(ID);
  t ||
    ((t = document.createElement("div")),
    (t.id = ID),
    (t.innerHTML =
      '<label class="cn-power" title="Native Codex Power"><input aria-label="Codex reasoning power" type="range" min="0" max="5" step="1"><span class="cn-label">Med</span></label><button class="cn-compact" title="Compact this Codex thread">&#10022; Compact</button><span class="cn-usage"><span class="cn-usage-track"><i class="cn-usage-fill"></i></span><span class="cn-usage-text"></span></span>'),
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
  (t.parentElement !== anchor.parentElement ||
    t.nextElementSibling !== anchor) &&
    anchor.before(t);
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
