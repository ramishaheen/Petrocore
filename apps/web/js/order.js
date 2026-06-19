/* =========================================================================
   HORO PRIVÉ — Private consultation wizard
   A short adaptive form that builds a live "collector brief", validates,
   and confirms. Deep-links from Curated Opportunities (?ref=) and the
   rare-piece mandate. Vanilla JS. Uses window.HP_FRAMES + HP_toast.
   ========================================================================= */
(function () {
  "use strict";

  var F = window.HP_FRAMES || window.PETROCORE_FRAMES || [];
  var frame = function (i) { return F[i] || F[F.length - 1] || ""; };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var toast = window.HP_toast || function (m) { console.log(m); };
  var $ = function (s, r) { return (r || document).querySelector(s); };

  var GROUPS = {
    intent: ["I need recommendations", "I know the exact watch", "I'm searching for a rare piece", "I want the best international deal", "I want to trade an existing watch"],
    first: ["My first significant watch", "I already collect"],
    flex: ["Fixed budget", "Some flexibility"],
    condition: ["Open", "Unworn", "Pre-owned", "Vintage"],
    papers: ["Full set preferred", "Not essential"],
    timeframe: ["No rush", "Within weeks", "As soon as possible"],
    channel: ["Email", "Phone", "WhatsApp"]
  };

  var sel = { intent: GROUPS.intent[0], first: "", flex: "", condition: "Open", papers: "Full set preferred", timeframe: "No rush", channel: "Email" };

  /* opportunities deep-link (?ref=) */
  var REF = {
    daytona: { brand: "Rolex", model: "Cosmograph Daytona 126500LN" },
    nautilus: { brand: "Patek Philippe", model: "Nautilus 5711/1A" },
    royaloak: { brand: "Audemars Piguet", model: "Royal Oak 15500ST" },
    odysseus: { brand: "A. Lange & Söhne", model: "Odysseus 363.179" },
    speedmaster: { brand: "Omega", model: "Speedmaster Moonwatch 310.30.42" },
    overseas: { brand: "Vacheron Constantin", model: "Overseas 4500V" },
    submariner: { brand: "Rolex", model: "Submariner Date 126610LN" },
    aquanaut: { brand: "Patek Philippe", model: "Aquanaut 5167A" }
  };
  var q = new URLSearchParams(location.search).get("ref");
  var prefill = q && REF[q] ? REF[q] : null;
  if (prefill) sel.intent = "I know the exact watch";

  /* build pill groups */
  Object.keys(GROUPS).forEach(function (group) {
    var host = document.querySelector('.pills[data-group="' + group + '"]');
    if (!host) return;
    host.innerHTML = GROUPS[group].map(function (v) {
      return '<button type="button" class="pill' + (v === sel[group] ? " sel" : "") + '" data-val="' + v + '">' + v + "</button>";
    }).join("");
    host.querySelectorAll(".pill").forEach(function (pill) {
      pill.addEventListener("click", function () {
        sel[group] = pill.dataset.val;
        host.querySelectorAll(".pill").forEach(function (p) { p.classList.toggle("sel", p === pill); });
        renderBrief();
      });
    });
  });

  var fields = ["brand", "model", "budget", "year", "notes"];
  fields.forEach(function (id) { var el = document.getElementById(id); if (el) el.addEventListener("input", renderBrief); });

  if (prefill) {
    var b = $("#brand"), m = $("#model");
    if (b) b.value = prefill.brand;
    if (m) m.value = prefill.model;
  }

  /* live brief */
  function val(id) { var el = document.getElementById(id); return el && el.value.trim() ? el.value.trim() : ""; }
  function renderBrief() {
    var img = $("#sumImg"); if (img) img.src = frame(1);
    var rows = [
      ["Objective", sel.intent],
      ["Collector", sel.first || "—"],
      ["Brand(s)", val("brand") || "Open / advise me"],
      ["Model / ref", val("model") || "—"],
      ["Budget", val("budget") || "—", sel.flex && sel.flex !== "" ? sel.flex : ""],
      ["Condition", sel.condition],
      ["Box & papers", sel.papers],
      ["Year / era", val("year") || "—"],
      ["Timeframe", sel.timeframe],
      ["Contact", sel.channel]
    ];
    var list = $("#sumList");
    if (list) list.innerHTML = rows.map(function (r) {
      var extra = r[2] ? ' <span class="up">' + r[2] + "</span>" : "";
      return "<div><dt>" + r[0] + "</dt><dd>" + r[1] + extra + "</dd></div>";
    }).join("");
  }
  renderBrief();

  /* stepper navigation */
  var form = $("#orderForm");
  var steps = [].slice.call(document.querySelectorAll(".step"));
  var stepperItems = [].slice.call(document.querySelectorAll("#stepper li"));
  var current = 1;
  function showStep(n) {
    current = Math.max(1, Math.min(3, n));
    steps.forEach(function (s) { s.classList.toggle("active", +s.dataset.step === current); });
    stepperItems.forEach(function (li) { var sn = +li.dataset.step; li.classList.toggle("active", sn === current); li.classList.toggle("done", sn < current); });
    var top = $("#configurator");
    if (top && n > 1) window.scrollTo({ top: top.offsetTop - 70, behavior: reduce ? "auto" : "smooth" });
  }
  document.querySelectorAll("[data-next]").forEach(function (b) { b.addEventListener("click", function () { showStep(current + 1); }); });
  document.querySelectorAll("[data-prev]").forEach(function (b) { b.addEventListener("click", function () { showStep(current - 1); }); });
  stepperItems.forEach(function (li) { li.addEventListener("click", function () { var sn = +li.dataset.step; if (sn < current) showStep(sn); }); });

  /* validation */
  function setErr(id, on) {
    var input = document.getElementById(id);
    var err = document.querySelector('.err[data-for="' + id + '"]');
    if (input && input.classList) input.classList.toggle("bad", on);
    if (err) err.classList.toggle("show", on);
  }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function validate() {
    var ok = true;
    var b1 = !$("#fname").value.trim(); setErr("fname", b1); if (b1) ok = false;
    var b2 = !validEmail($("#email").value.trim()); setErr("email", b2); if (b2) ok = false;
    var b3 = !$("#country").value.trim(); setErr("country", b3); if (b3) ok = false;
    var b4 = !$("#consent").checked; setErr("consent", b4); if (b4) ok = false;
    return ok;
  }
  ["fname", "email", "country"].forEach(function (id) { var el = document.getElementById(id); if (el) el.addEventListener("input", function () { setErr(id, false); }); });
  var consentEl = $("#consent"); if (consentEl) consentEl.addEventListener("change", function () { setErr("consent", false); });

  if (form) form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate()) { toast("Please complete the highlighted fields", "!"); return; }
    var ref = "HP-" + Date.now().toString(36).slice(-6).toUpperCase();
    var first = $("#fname").value.trim().split(" ")[0];
    var msg = $("#confirmMsg"), refEl = $("#confirmRef");
    if (msg) msg.textContent = "Thank you, " + first + ". Your collector brief — “" + sel.intent.toLowerCase() + "” — is with us. A dedicated consultant will review it and respond privately, usually within one business day.";
    if (refEl) refEl.textContent = ref;
    var confirm = $("#confirm");
    if (confirm) { confirm.hidden = false; document.body.style.overflow = "hidden"; }
  });

  var confirmClose = $("#confirmClose");
  if (confirmClose) confirmClose.addEventListener("click", function () {
    var confirm = $("#confirm"); if (confirm) { confirm.hidden = true; document.body.style.overflow = ""; }
    if (form) form.reset(); renderBrief(); showStep(1);
  });

  /* rare-piece mandate shortcut */
  var startMandate = $("#startMandate");
  if (startMandate) startMandate.addEventListener("click", function () {
    sel.intent = "I'm searching for a rare piece";
    var host = document.querySelector('.pills[data-group="intent"]');
    if (host) host.querySelectorAll(".pill").forEach(function (p) { p.classList.toggle("sel", p.dataset.val === sel.intent); });
    renderBrief();
    showStep(1);
    toast("Mandate started — tell us the reference you're pursuing.", "❖");
  });

  /* advisor frame image */
  document.querySelectorAll("img[data-frame]").forEach(function (img) { var i = parseInt(img.getAttribute("data-frame"), 10); if (!isNaN(i)) img.src = frame(i); });
})();
