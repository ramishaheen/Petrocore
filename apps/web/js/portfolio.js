/* =========================================================================
   HORO PRIVÉ — Portfolio Intelligence (demonstration)
   Tabs, currency display, private mode, an in-session add-watch demo and an
   indicative international landed-cost calculator. All data is illustrative.
   ========================================================================= */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var toast = window.HP_toast || function (m) { console.log(m); };

  /* indicative FX vs USD + symbols (configurable; illustrative only) */
  var FX = { USD: [1, "$"], EUR: [0.92, "€"], GBP: [0.79, "£"], AED: [3.67, "د.إ "], CHF: [0.89, "CHF "] };
  var ccy = "USD";
  function fmt(usd) { var f = FX[ccy]; return f[1] + Math.round(usd * f[0]).toLocaleString("en-US"); }

  /* ---------- Tabs ---------- */
  var tabs = [].slice.call(document.querySelectorAll(".pf-tab"));
  var panels = [].slice.call(document.querySelectorAll(".pf-panel"));
  tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      tabs.forEach(function (x) { x.classList.toggle("active", x === t); });
      panels.forEach(function (p) { p.classList.toggle("active", p.dataset.panel === t.dataset.tab); });
      window.scrollTo({ top: $(".pf-tabs").offsetTop, behavior: "smooth" });
    });
  });

  /* ---------- Currency ---------- */
  function renderMoney() {
    document.querySelectorAll(".money").forEach(function (el) {
      var usd = parseFloat(el.dataset.usd || "0");
      var sign = el.dataset.sign || "";
      el.firstChild ? (el.textContent = sign + fmt(usd)) : (el.textContent = sign + fmt(usd));
      if (el.dataset.usd === "486000") el.innerHTML = fmt(486000) + '<span class="dr">– ' + fmt(529000) + "</span>";
      if (el.dataset.sign === "+") el.innerHTML = "+" + fmt(92000) + " <small>+22.9%</small>";
    });
    renderWatches();
  }
  var ccySel = $("#ccy");
  if (ccySel) ccySel.addEventListener("change", function () { ccy = ccySel.value; renderMoney(); renderCalc(); });

  /* ---------- Private mode ---------- */
  var pt = $("#privateToggle");
  if (pt) pt.addEventListener("click", function () {
    var on = document.body.classList.toggle("privacy");
    pt.setAttribute("aria-pressed", on ? "true" : "false");
    pt.textContent = on ? "◉ Private mode on" : "◌ Private mode";
  });

  /* ---------- Watches table ---------- */
  var WATCHES = [
    { brand: "Rolex", model: "Cosmograph Daytona", ref: "126500LN", year: 2024, cost: 32000, value: 39500, status: "Hold" },
    { brand: "Patek Philippe", model: "Nautilus", ref: "5711/1A", year: 2021, cost: 95000, value: 118000, status: "Hold" },
    { brand: "Audemars Piguet", model: "Royal Oak", ref: "15500ST", year: 2023, cost: 38000, value: 42000, status: "Hold" },
    { brand: "Rolex", model: "Submariner Date", ref: "126610LN", year: 2024, cost: 12500, value: 14800, status: "Hold" },
    { brand: "Omega", model: "Speedmaster", ref: "310.30.42", year: 2023, cost: 6500, value: 7400, status: "Hold" },
    { brand: "A. Lange & Söhne", model: "Odysseus", ref: "363.179", year: 2022, cost: 45000, value: 55000, status: "Review valuation" },
    { brand: "Cartier", model: "Santos", ref: "WSSA0018", year: 2021, cost: 7500, value: 8200, status: "Consider sale" }
  ];
  function renderWatches() {
    var body = $("#watchRows");
    if (!body) return;
    body.innerHTML = WATCHES.map(function (w) {
      var cls = w.status === "Consider sale" ? "sell" : (w.status === "Hold" ? "hold" : "");
      return "<tr><td class='wm'>" + w.brand + "<small>" + w.model + "</small></td>" +
        "<td>" + w.ref + "</td><td>" + w.year + "</td>" +
        "<td class='money' data-usd='" + w.cost + "'>" + fmt(w.cost) + "</td>" +
        "<td class='money' data-usd='" + w.value + "'>" + fmt(w.value) + "</td>" +
        "<td><span class='pf-status " + cls + "'>" + w.status + "</span></td></tr>";
    }).join("");
  }

  /* ---------- Add a watch (session demo) ---------- */
  var addForm = $("#addForm");
  if (addForm) addForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var d = new FormData(addForm);
    if (!d.get("brand") || !d.get("model")) { toast("Add at least a brand and model", "!"); return; }
    WATCHES.push({ brand: d.get("brand"), model: d.get("model"), ref: d.get("ref") || "—", year: d.get("year") || "—",
      cost: parseFloat(d.get("cost")) || 0, value: parseFloat(d.get("value")) || parseFloat(d.get("cost")) || 0, status: d.get("status") || "Hold" });
    renderWatches();
    addForm.reset();
    toast(d.get("brand") + " " + d.get("model") + " added to your portfolio (demo).", "✦");
    var watchesTab = document.querySelector('.pf-tab[data-tab="watches"]');
    if (watchesTab) watchesTab.click();
  });

  /* ---------- Landed-cost calculator ---------- */
  var calcIds = ["cWatch", "cShip", "cInspect", "cDuty", "cTax", "cPay", "cAdv", "cCur"];
  function num(id) { var el = document.getElementById(id); return parseFloat(el && el.value) || 0; }
  function renderCalc() {
    if (!$("#calcResult")) return;
    var curIn = $("#cCur") ? $("#cCur").value : "USD";
    var rate = (FX[curIn] || [1])[0];
    var priceUsd = num("cWatch") / rate;                 /* input currency -> USD */
    var ship = num("cShip"), inspect = num("cInspect");
    var duty = priceUsd * num("cDuty") / 100;
    var tax = (priceUsd + duty) * num("cTax") / 100;
    var pay = priceUsd * num("cPay") / 100;
    var adv = priceUsd * num("cAdv") / 100;
    var total = priceUsd + ship + inspect + duty + tax + pay + adv;
    var lines = [
      ["Watch price", priceUsd], ["Shipping & insurance", ship], ["Inspection", inspect],
      ["Import duty", duty], ["VAT / sales tax", tax], ["Payment fee", pay], ["Advisory fee", adv]
    ];
    $("#calcLines").innerHTML = lines.map(function (l) { return "<li><span>" + l[0] + "</span><b>" + fmt(l[1]) + "</b></li>"; }).join("");
    var low = total * 0.97, high = total * 1.05;
    $("#calcTotal").textContent = fmt(low) + " – " + fmt(high);
    $("#calcStamp").textContent = "Estimated " + new Date().toISOString().slice(0, 10) + " · " + ($("#cSeller") ? $("#cSeller").value : "") + " → " + ($("#cBuyer") ? $("#cBuyer").value : "") + " · rates illustrative.";
  }
  calcIds.forEach(function (id) { var el = document.getElementById(id); if (el) el.addEventListener("input", renderCalc); });
  ["cSeller", "cBuyer"].forEach(function (id) { var el = document.getElementById(id); if (el) el.addEventListener("input", renderCalc); });

  /* boot */
  renderMoney();
  renderCalc();
})();
