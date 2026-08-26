'use strict';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function panelHtml(state) {
  const efforts = ['none', 'low', 'medium', 'high', 'xhigh', 'max'];
  const index = Math.max(0, efforts.indexOf(state.effort));
  const primary = state.usage && state.usage.primary;
  const secondary = state.usage && state.usage.secondary;
  const usageCard = (title, item, reset) => item
    ? `<div class="metric"><div class="metric-head"><span>${title}</span><strong>${item.remaining.toFixed(0)}% remaining</strong></div><div class="bar"><i style="width:${item.remaining}%"></i></div><small>Resets in ${reset}</small></div>`
    : `<div class="metric muted"><div class="metric-head"><span>${title}</span><strong>Unavailable</strong></div></div>`;
  return `<!doctype html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  :root{color-scheme:light dark;--ink:var(--vscode-foreground);--muted:var(--vscode-descriptionForeground);--card:color-mix(in srgb,var(--vscode-editor-background) 88%,#7c5cff 12%);--line:color-mix(in srgb,var(--ink) 14%,transparent);--violet:#8b7cff;--cyan:#58d8ff;--green:#45e0a8}
  *{box-sizing:border-box}body{margin:0;padding:24px;font:13px/1.45 var(--vscode-font-family);color:var(--ink);background:radial-gradient(circle at 10% 0%,rgba(91,73,255,.18),transparent 36%),radial-gradient(circle at 100% 10%,rgba(36,203,255,.12),transparent 32%),var(--vscode-editor-background)}
  main{max-width:640px;margin:auto}.hero{display:flex;align-items:center;gap:14px;margin:4px 0 22px}.orb{width:48px;height:48px;border-radius:16px;background:linear-gradient(145deg,var(--violet),var(--cyan));box-shadow:0 10px 35px rgba(91,73,255,.35);display:grid;place-items:center;font-size:23px}.hero h1{font-size:21px;margin:0}.hero p{margin:2px 0 0;color:var(--muted)}
  .card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:19px;margin:13px 0;box-shadow:0 12px 40px rgba(0,0,0,.12);backdrop-filter:blur(12px)}.eyebrow{text-transform:uppercase;letter-spacing:.12em;color:var(--muted);font-size:10px;font-weight:700}.row{display:flex;justify-content:space-between;align-items:center;gap:16px}.value{font-weight:700;text-transform:capitalize;color:var(--cyan)}
  input[type=range]{width:100%;margin:24px 0 10px;appearance:none;height:8px;border-radius:999px;background:linear-gradient(90deg,var(--violet) 0%,var(--cyan) var(--fill),rgba(128,128,128,.24) var(--fill));outline:none}input[type=range]::-webkit-slider-thumb{appearance:none;width:23px;height:23px;border-radius:50%;background:white;border:4px solid var(--violet);box-shadow:0 0 0 6px rgba(139,124,255,.16),0 4px 12px rgba(0,0,0,.35);cursor:pointer}.ticks{display:grid;grid-template-columns:repeat(6,1fr);font-size:10px;color:var(--muted);text-align:center}.ticks span.active{color:var(--ink);font-weight:750}.hint{margin:15px 0 0;color:var(--muted);font-size:11px}
  .metric{margin-top:16px}.metric-head{display:flex;justify-content:space-between;margin-bottom:7px}.metric strong{font-size:11px}.bar{height:8px;background:rgba(128,128,128,.2);border-radius:99px;overflow:hidden}.bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--green),var(--cyan));box-shadow:0 0 14px rgba(69,224,168,.35)}small{color:var(--muted)}.muted{opacity:.65}
  button{border:0;border-radius:12px;padding:10px 14px;font:600 12px var(--vscode-font-family);cursor:pointer;color:white;background:linear-gradient(135deg,#7768ff,#4bbde7);box-shadow:0 7px 22px rgba(91,73,255,.28)}button.secondary{color:var(--ink);background:rgba(128,128,128,.15);box-shadow:none;border:1px solid var(--line)}button:hover{filter:brightness(1.08);transform:translateY(-1px)}.actions{display:flex;gap:9px;margin-top:16px}.foot{color:var(--muted);font-size:10px;margin-top:16px;text-align:center}
</style></head>
<body><main>
  <div class="hero"><div class="orb">&#10022;</div><div><h1>Codex Control Center</h1><p>${escapeHtml(state.model)}</p></div></div>
  <section class="card"><div class="row"><div><div class="eyebrow">Reasoning effort</div><div class="hint">Balance response speed and depth</div></div><div id="value" class="value">${escapeHtml(state.effort)}</div></div>
    <input id="effort" type="range" min="0" max="5" step="1" value="${index}" style="--fill:${index * 20}%">
    <div class="ticks">${efforts.map((x, i) => `<span class="${i === index ? 'active' : ''}">${x}</span>`).join('')}</div>
    <p class="hint">Changes are written atomically to your Codex configuration and apply to subsequent runs.</p>
  </section>
  <section class="card"><div class="row"><div><div class="eyebrow">Usage remaining</div><div class="hint">ChatGPT Codex allowance</div></div><button class="secondary" id="refresh">Refresh</button></div>
    ${usageCard('5-hour window', primary, state.primaryReset)}${usageCard('Weekly window', secondary, state.secondaryReset)}
    ${state.usageError ? `<p class="hint">${escapeHtml(state.usageError)}</p>` : ''}
  </section>
  <section class="card"><div class="row"><div><div class="eyebrow">Context maintenance</div><div class="hint">Compress a long Codex conversation</div></div><button id="compact">&#10022; Compact</button></div>
    <p class="hint">Opens the official Codex command menu. Choose Compact to operate on the active conversation.</p>
  </section>
  <div class="foot">Codex Control Center never stores or transmits credentials outside the Codex usage request.</div>
</main><script>
  const vscode=acquireVsCodeApi(), efforts=${JSON.stringify(efforts)}, slider=document.getElementById('effort'), value=document.getElementById('value');
  function paint(){const i=Number(slider.value);slider.style.setProperty('--fill',(i*20)+'%');value.textContent=efforts[i];document.querySelectorAll('.ticks span').forEach((el,n)=>el.classList.toggle('active',n===i));}
  slider.addEventListener('input',paint); slider.addEventListener('change',()=>vscode.postMessage({type:'effort',value:efforts[Number(slider.value)]}));
  document.getElementById('compact').addEventListener('click',()=>vscode.postMessage({type:'compact'}));
  document.getElementById('refresh').addEventListener('click',()=>vscode.postMessage({type:'refresh'}));
</script></body></html>`;
}

module.exports = { escapeHtml, panelHtml };
