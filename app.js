// ---------- shared store ----------
const STORE_KEY = "positron_submissions_v1";
const SETTINGS_KEY = "positron_settings_v1";
const GATE_KEY = "positron_admin_unlocked_v1";
const DEFAULT_PASSCODE = "positron2026";

const HIGH = ["urgent","investor","fund","funding","capital","partnership","acquisition","press","media","lawsuit","legal","compliance","sec","allocator","mandate","rfp","institutional","billion","million","ipo","merger"];
const MED  = ["career","interview","role","internship","application","cv","resume","hiring","position","analyst","intern","graduate"];

function loadSubmissions(){
  try{ return JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); }
  catch(e){ return []; }
}
function saveSubmissions(arr){ localStorage.setItem(STORE_KEY, JSON.stringify(arr)); }
function loadSettings(){
  try{ return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"); }
  catch(e){ return {}; }
}
function saveSettings(s){ localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

function classify(text){
  const t = (text || "").toLowerCase();
  const hits = { high: [], med: [] };
  HIGH.forEach(k => { if(t.includes(k)) hits.high.push(k); });
  MED.forEach(k  => { if(t.includes(k))  hits.med.push(k);  });
  let level = "low";
  if(hits.high.length) level = "high";
  else if(hits.med.length) level = "med";
  return { level, hits };
}
function summarise(text){
  const t = (text || "").trim().replace(/\s+/g," ");
  if(t.length <= 220) return t;
  return t.slice(0,217) + "…";
}
function fmtTime(iso){
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;
  if(diff < 60) return "just now";
  if(diff < 3600) return Math.floor(diff/60) + "m ago";
  if(diff < 86400) return Math.floor(diff/3600) + "h ago";
  return d.toLocaleDateString(undefined, {month:"short", day:"numeric"});
}

// ---------- nav scroll state ----------
function bindNav(){
  const nav = document.querySelector(".nav");
  if(!nav) return;
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, {passive:true});
}

// ---------- reveal on scroll ----------
function bindReveal(){
  const els = document.querySelectorAll(".reveal");
  if(!els.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); }});
  }, {threshold:0.08, rootMargin:"0px 0px -40px 0px"});
  els.forEach(el => io.observe(el));
}

// ---------- year ----------
function setYear(){ const y = document.getElementById("yr"); if(y) y.textContent = new Date().getFullYear(); }

// ---------- canvas hero (subtle ticker line) ----------
function bindHero(){
  const c = document.getElementById("hero-bg");
  if(!c) return;
  const ctx = c.getContext("2d");
  let w, h, dpr;
  const resize = () => {
    dpr = window.devicePixelRatio || 1;
    w = c.clientWidth; h = c.clientHeight;
    c.width = w * dpr; c.height = h * dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  };
  resize();
  window.addEventListener("resize", resize);

  // dot grid
  function drawGrid(){
    ctx.fillStyle = "rgba(202,166,87,0.18)";
    const step = 24;
    for(let x=0;x<w;x+=step){
      for(let y=0;y<h;y+=step){
        ctx.beginPath();
        ctx.arc(x,y,0.7,0,Math.PI*2);
        ctx.fill();
      }
    }
  }

  // moving sine line
  let t = 0;
  function draw(){
    ctx.clearRect(0,0,w,h);
    drawGrid();
    ctx.beginPath();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = "rgba(202,166,87,0.55)";
    const amp = h * 0.08;
    const baseY = h * 0.58;
    for(let x=0;x<=w;x+=4){
      const y = baseY
        + Math.sin((x*0.006)+t) * amp
        + Math.sin((x*0.013)+t*0.6) * (amp*0.4);
      if(x===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
    t += 0.008;
    requestAnimationFrame(draw);
  }
  draw();
}

// ---------- live priority ----------
function bindLivePriority(){
  const ta = document.querySelector('textarea[name="message"]');
  const reasonSel = document.querySelector('select[name="reason"]');
  if(!ta) return;
  const badge = document.getElementById("lp-badge");
  const fill  = document.getElementById("lp-fill");
  const chips = document.getElementById("lp-keywords");

  const update = () => {
    const combined = (reasonSel?.value || "") + " " + ta.value;
    const { level, hits } = classify(combined);
    badge.classList.remove("low","med","high");
    badge.classList.add(level);
    badge.textContent = level === "high" ? "High" : level === "med" ? "Medium" : "Low";

    const target = level === "high" ? 100 : level === "med" ? 60 : Math.min(30, ta.value.length / 8);
    fill.style.width = target + "%";
    fill.style.background = level === "high" ? "var(--high)" : level === "med" ? "var(--gold)" : "var(--gold)";

    chips.innerHTML = "";
    [...new Set([...hits.high, ...hits.med])].slice(0,6).forEach(k => {
      const c = document.createElement("span");
      c.className = "lp-chip";
      c.textContent = k;
      chips.appendChild(c);
    });
  };
  ta.addEventListener("input", update);
  reasonSel?.addEventListener("change", update);
}

// ---------- form submit ----------
function bindForm(){
  const form = document.getElementById("contact-form");
  if(!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const { level } = classify((data.reason || "") + " " + (data.message || ""));
    const submission = {
      id: Date.now() + "-" + Math.random().toString(36).slice(2,8),
      ts: new Date().toISOString(),
      name: data.name || "",
      email: data.email || "",
      phone: data.phone || "",
      company: data.company || "",
      reason: data.reason || "Other",
      message: data.message || "",
      summary: summarise(data.message || ""),
      priority: level,
    };
    const all = loadSubmissions();
    all.unshift(submission);
    saveSubmissions(all);

    // populate success dialog
    const dlg = document.getElementById("success");
    const sp = document.getElementById("s-priority");
    sp.classList.remove("low","med","high");
    sp.classList.add(level);
    sp.textContent = level === "high" ? "High" : level === "med" ? "Medium" : "Low";
    document.getElementById("s-reason").textContent = submission.reason;
    document.getElementById("s-from").textContent = submission.name + (submission.company ? " — " + submission.company : "");
    document.getElementById("s-summary").textContent = submission.summary || "(no message body)";
    if(dlg.showModal){ dlg.showModal(); } else { dlg.setAttribute("open",""); }

    form.reset();
    bindLivePriority(); // re-bind in case (form reset doesn't blur listeners but resets values)
    // reset live priority view
    const badge = document.getElementById("lp-badge");
    badge.classList.remove("low","med","high"); badge.classList.add("low"); badge.textContent = "Low";
    document.getElementById("lp-fill").style.width = "10%";
    document.getElementById("lp-keywords").innerHTML = "";

    // optionally fire mailto for HR if configured
    const hr = (loadSettings().hrEmail || "").trim();
    if(hr){
      // we don't auto-open mail client; keep silent. Settings page can preview the email.
    }
  });

  document.getElementById("success-close")?.addEventListener("click", () => {
    const dlg = document.getElementById("success");
    if(dlg.close) dlg.close(); else dlg.removeAttribute("open");
  });
}

// ---------- HR Dashboard ----------
function renderDash(){
  const list = document.getElementById("submission-list");
  if(!list) return;
  let subs = loadSubmissions();
  // pin high-priority to top, keep newest order within bucket
  const order = { high:0, med:1, low:2 };
  subs = [...subs].sort((a,b) => (order[a.priority]-order[b.priority]) || (new Date(b.ts) - new Date(a.ts)));

  // stats
  const total = subs.length;
  const high  = subs.filter(s => s.priority === "high").length;
  const med   = subs.filter(s => s.priority === "med").length;
  const today = subs.filter(s => (new Date() - new Date(s.ts)) < 86400000).length;
  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-high").textContent = high;
  document.getElementById("stat-med").textContent = med;
  document.getElementById("stat-today").textContent = today;

  // bar chart: last 14 days
  const days = 14;
  const buckets = Array(days).fill(0);
  const today0 = new Date(); today0.setHours(0,0,0,0);
  subs.forEach(s => {
    const d = new Date(s.ts); d.setHours(0,0,0,0);
    const idx = Math.floor((today0 - d) / 86400000);
    if(idx >= 0 && idx < days) buckets[days-1-idx]++;
  });
  const max = Math.max(1, ...buckets);
  const bars = document.getElementById("bars");
  bars.innerHTML = "";
  buckets.forEach(v => {
    const b = document.createElement("div");
    b.className = "bar";
    b.title = v + " submission" + (v===1?"":"s");
    const f = document.createElement("div");
    f.className = "bar-fill";
    f.style.height = (v / max * 100) + "%";
    b.appendChild(f);
    bars.appendChild(b);
  });

  // donut: by reason
  const reasons = {};
  subs.forEach(s => { reasons[s.reason] = (reasons[s.reason] || 0) + 1; });
  const donut = document.getElementById("donut");
  const legend = document.getElementById("donut-legend");
  legend.innerHTML = "";
  const entries = Object.entries(reasons);
  const colors = ["#caa657","#1a1a1a","#b54545","#9a7a18","#5d5d5b"];
  if(entries.length === 0){
    donut.innerHTML = '<circle cx="60" cy="60" r="46" fill="none" stroke="#ececea" stroke-width="14"/>';
    legend.innerHTML = '<span class="row-meta">No data yet</span>';
  } else {
    let acc = 0;
    const totalR = entries.reduce((s,[,v]) => s+v, 0);
    const C = 2 * Math.PI * 46;
    let svg = '';
    entries.forEach(([k,v], i) => {
      const len = (v/totalR) * C;
      svg += `<circle cx="60" cy="60" r="46" fill="none" stroke="${colors[i%colors.length]}" stroke-width="14" stroke-dasharray="${len} ${C}" stroke-dashoffset="${-acc}" transform="rotate(-90 60 60)"/>`;
      acc += len;
      const row = document.createElement("div");
      row.className = "legend-row";
      row.innerHTML = `<span class="legend-swatch" style="background:${colors[i%colors.length]}"></span>${k} <span class="row-meta">— ${v}</span>`;
      legend.appendChild(row);
    });
    donut.innerHTML = svg;
  }

  // table
  list.innerHTML = "";
  if(subs.length === 0){
    list.innerHTML = '<div class="empty">No submissions yet. Send one from the <a href="index.html">contact page</a> to see it here.</div>';
    return;
  }
  subs.forEach(s => {
    const row = document.createElement("div");
    row.className = "row";
    const lvl = s.priority;
    row.innerHTML = `
      <span class="lp-badge ${lvl}">${lvl === "high" ? "High" : lvl === "med" ? "Medium" : "Low"}</span>
      <div class="row-from">
        <span class="row-name">${escapeHtml(s.name)}</span>
        <span class="row-meta">${escapeHtml(s.email)}${s.company ? " · " + escapeHtml(s.company) : ""}</span>
      </div>
      <span class="row-meta">${escapeHtml(s.reason)}</span>
      <span class="row-summary">${escapeHtml(s.summary)}</span>
      <span class="row-time">${fmtTime(s.ts)}</span>
    `;
    const detail = document.createElement("div");
    detail.className = "row-detail";
    detail.textContent = s.message || "(no message)";
    row.addEventListener("click", () => detail.classList.toggle("open"));
    list.appendChild(row);
    list.appendChild(detail);
  });
}
function escapeHtml(s){
  return String(s||"").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

function bindDashActions(){
  document.getElementById("seed-demo")?.addEventListener("click", () => {
    const seed = [
      { name:"Marcus Chen", email:"mchen@stonepoint.fund", company:"Stonepoint Capital", reason:"Investor", message:"We're an institutional allocator looking at adding a quant manager to our portfolio. Could we set up a call to discuss your fund's capacity and recent performance? This is fairly urgent as we're finalising allocations next week." },
      { name:"Priya Shah", email:"priya@gmail.com", company:"University of Chicago", reason:"Career inquiry", message:"Hi, I'm a final-year student interested in a graduate analyst role. I've attached my CV and would love to be considered for any internship or junior position." },
      { name:"David Whitman", email:"dw@axiomlegal.com", company:"Axiom Legal", reason:"Other", message:"Following up on a compliance matter regarding a former employee. Please can someone from your legal team contact me at the earliest opportunity." },
      { name:"Lena Müller", email:"lena@finewire.media", company:"Finewire Media", reason:"Press", message:"I'm a journalist covering quantitative funds and would like to request comment for an upcoming feature on systematic strategies." },
      { name:"Tom Reilly", email:"tom@example.com", company:"", reason:"Other", message:"Just wanted to say I really enjoyed your recent paper on market microstructure. No reply needed." },
    ];
    const all = loadSubmissions();
    seed.forEach((s,i) => {
      const c = classify(s.reason + " " + s.message);
      all.unshift({
        id: Date.now() + "-seed-" + i,
        ts: new Date(Date.now() - i * 3600 * 1000 * (i+1)).toISOString(),
        name:s.name, email:s.email, phone:"", company:s.company,
        reason:s.reason, message:s.message,
        summary:summarise(s.message), priority:c.level,
      });
    });
    saveSubmissions(all);
    renderDash();
  });
  document.getElementById("clear-all")?.addEventListener("click", () => {
    if(confirm("Clear all submissions? This can't be undone.")) {
      saveSubmissions([]);
      renderDash();
    }
  });
}

// ---------- Settings ----------
function bindSettings(){
  const input = document.getElementById("hr-email");
  const save = document.getElementById("save-settings");
  const tick = document.getElementById("saved-tick");
  const passInput = document.getElementById("admin-pass");
  if(!input) return;
  input.value = loadSettings().hrEmail || "hr@positroncm.com";
  save.addEventListener("click", () => {
    const s = loadSettings();
    s.hrEmail = input.value.trim();
    if(passInput && passInput.value.trim()){
      s.passcode = passInput.value.trim();
      passInput.value = "";
    }
    saveSettings(s);
    tick.classList.add("show");
    setTimeout(() => tick.classList.remove("show"), 1800);
  });
}

// ---------- Admin gate (client-side only — keeps casual visitors out, not real auth) ----------
function bindGate(){
  const dlg = document.getElementById("gate");
  if(!dlg) return; // not on an admin page
  const unlocked = sessionStorage.getItem(GATE_KEY) === "1";
  if(!unlocked){
    if(dlg.showModal) dlg.showModal(); else dlg.setAttribute("open","");
    document.body.classList.add("locked");
    setTimeout(() => document.getElementById("gate-input")?.focus(), 50);
  }
  const form = document.getElementById("gate-form");
  const err = document.getElementById("gate-error");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const expected = loadSettings().passcode || DEFAULT_PASSCODE;
    const got = document.getElementById("gate-input").value;
    if(got === expected){
      sessionStorage.setItem(GATE_KEY, "1");
      if(dlg.close) dlg.close(); else dlg.removeAttribute("open");
      document.body.classList.remove("locked");
    } else {
      err.classList.add("show");
      setTimeout(() => err.classList.remove("show"), 2000);
      document.getElementById("gate-input").value = "";
    }
  });
  document.getElementById("signout")?.addEventListener("click", () => {
    sessionStorage.removeItem(GATE_KEY);
    location.reload();
  });
}

// ---------- init ----------
document.addEventListener("DOMContentLoaded", () => {
  setYear();
  bindGate();
  bindNav();
  bindReveal();
  bindHero();
  bindLivePriority();
  bindForm();
  renderDash();
  bindDashActions();
  bindSettings();
});
