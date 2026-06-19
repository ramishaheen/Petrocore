/* =========================================================================
   PETROCORE — Commission configurator
   Easy 3-step bespoke order flow with a live summary + price, client-side
   validation, a confirmation state, and an auto-rotating testimonials block.
   Vanilla JS, no deps. Reuses window.PETROCORE_FRAMES for imagery.
   ========================================================================= */
(function () {
  "use strict";

  var F = window.PETROCORE_FRAMES || [];
  var frame = function (i) { return F[i] || F[F.length - 1] || ""; };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var money = function (n) { return "$" + Math.round(n).toLocaleString("en-US"); };
  var $ = function (s, r) { return (r || document).querySelector(s); };

  /* ----------------------- Option data ----------------------- */
  var BASES = [
    { id: "bespoke",   name: "Bespoke",        price: 9000,  frame: 4, tag: "Blank canvas" },
    { id: "apex",      name: "Apex",           price: 12400, frame: 0, tag: "Chronograph" },
    { id: "meridian",  name: "Meridian",       price: 9800,  frame: 3, tag: "GMT" },
    { id: "caliber",   name: "Caliber",        price: 18600, frame: 4, tag: "Skeleton" },
    { id: "nocturne",  name: "Nocturne",       price: 7950,  frame: 5, tag: "Dive" },
    { id: "atelier",   name: "Atelier",        price: 48000, frame: 1, tag: "Tourbillon" },
    { id: "profil",    name: "Profil",         price: 11200, frame: 2, tag: "Dress" },
    { id: "sovereign", name: "Sovereign",      price: 6400,  frame: 6, tag: "Day-date" },
    { id: "aurum",     name: "Aurum",          price: 26500, frame: 0, tag: "Perpetual" }
  ];

  var OPTIONS = {
    case:        { label: "Case material", items: [
      { id: "steel",    name: "316L steel",   add: 0 },
      { id: "titanium", name: "Titanium",     add: 1200 },
      { id: "twotone",  name: "Two-tone gold",add: 3500 },
      { id: "gold",     name: "18k gold",     add: 8000 }
    ]},
    dial:        { label: "Dial colour", items: [
      { id: "blue",   name: "Sunburst blue",  add: 0,   sw: "#2b4d80" },
      { id: "black",  name: "Onyx black",     add: 0,   sw: "#15181f" },
      { id: "silver", name: "Silver opaline", add: 0,   sw: "#cfd4dc" },
      { id: "green",  name: "British green",  add: 250, sw: "#1f4034" },
      { id: "champ",  name: "Champagne",      add: 400, sw: "#d8c08a" }
    ]},
    complication:{ label: "Complication", items: [
      { id: "none",  name: "Time only",        add: 0 },
      { id: "date",  name: "Day-date",         add: 600 },
      { id: "gmt",   name: "GMT",              add: 2000 },
      { id: "chrono",name: "Chronograph",      add: 2500 },
      { id: "skel",  name: "Skeleton",         add: 4000 },
      { id: "tourb", name: "Tourbillon",       add: 30000 }
    ]},
    strap:       { label: "Strap", items: [
      { id: "bracelet", name: "Steel bracelet",  add: 0 },
      { id: "alligator",name: "Alligator leather",add: 350 },
      { id: "rubber",   name: "Vulcanised rubber",add: 0 },
      { id: "nato",     name: "NATO textile",     add: 0 }
    ]},
    size:        { label: "Case size", items: [
      { id: "38", name: "38mm", add: 0 },
      { id: "40", name: "40mm", add: 0 },
      { id: "42", name: "42mm", add: 0 }
    ]}
  };

  var ENGRAVE_FEE = 250;

  /* selection state (sensible defaults) */
  var sel = { base: "apex", case: "steel", dial: "blue", complication: "chrono", strap: "bracelet", size: "40", engraving: "" };

  /* preselect a base from ?ref=apex (e.g. linked from the shop) */
  var q = new URLSearchParams(location.search).get("ref");
  if (q && BASES.some(function (b) { return b.id === q; })) sel.base = q;

  /* ----------------------- Build base cards ----------------------- */
  var baseGrid = $("#baseGrid");
  if (baseGrid) {
    baseGrid.innerHTML = BASES.map(function (b) {
      return '<button type="button" class="opt' + (b.id === sel.base ? " sel" : "") + '" data-base="' + b.id + '">' +
        '<span class="tick">✓</span>' +
        '<span class="om"><img src="' + frame(b.frame) + '" alt="PETROCORE ' + b.name + '" loading="lazy" /></span>' +
        '<span class="ob"><span class="on">' + b.name + '</span><span class="op">' + b.tag + " · from " + money(b.price) + "</span></span>" +
      "</button>";
    }).join("");
    baseGrid.querySelectorAll("[data-base]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        sel.base = btn.dataset.base;
        baseGrid.querySelectorAll(".opt").forEach(function (o) { o.classList.toggle("sel", o === btn); });
        renderSummary();
      });
    });
  }

  /* ----------------------- Build pill groups ----------------------- */
  Object.keys(OPTIONS).forEach(function (group) {
    var host = document.querySelector('.pills[data-group="' + group + '"]');
    if (!host) return;
    host.innerHTML = OPTIONS[group].items.map(function (it) {
      var swatch = it.sw ? '<span class="sw" style="background:' + it.sw + '"></span>' : "";
      var price = it.add ? '<span class="pp">+' + money(it.add) + "</span>" : "";
      return '<button type="button" class="pill' + (it.id === sel[group] ? " sel" : "") + '" data-val="' + it.id + '">' +
        swatch + it.name + price + "</button>";
    }).join("");
    host.querySelectorAll(".pill").forEach(function (pill) {
      pill.addEventListener("click", function () {
        sel[group] = pill.dataset.val;
        host.querySelectorAll(".pill").forEach(function (p) { p.classList.toggle("sel", p === pill); });
        renderSummary();
      });
    });
  });

  var engraveInput = $("#engraving");
  if (engraveInput) engraveInput.addEventListener("input", function () { sel.engraving = engraveInput.value.trim(); renderSummary(); });

  /* ----------------------- Pricing + summary ----------------------- */
  function nameOf(group, id) {
    var it = OPTIONS[group].items.find(function (x) { return x.id === id; });
    return it ? it : { name: "—", add: 0 };
  }
  function baseOf() { return BASES.find(function (b) { return b.id === sel.base; }) || BASES[0]; }

  function total() {
    var t = baseOf().price;
    ["case", "dial", "complication", "strap", "size"].forEach(function (g) { t += nameOf(g, sel[g]).add; });
    if (sel.engraving) t += ENGRAVE_FEE;
    return t;
  }

  function renderSummary() {
    var b = baseOf();
    var img = $("#sumImg"), tag = $("#sumTag");
    if (img) img.src = frame(b.frame);
    if (tag) tag.textContent = b.id === "bespoke" ? "Bespoke" : b.name;
    var rows = [
      ["Foundation", b.name, 0],
      ["Case", nameOf("case", sel.case).name, nameOf("case", sel.case).add],
      ["Dial", nameOf("dial", sel.dial).name, nameOf("dial", sel.dial).add],
      ["Complication", nameOf("complication", sel.complication).name, nameOf("complication", sel.complication).add],
      ["Strap", nameOf("strap", sel.strap).name, nameOf("strap", sel.strap).add],
      ["Case size", nameOf("size", sel.size).name, 0]
    ];
    if (sel.engraving) rows.push(["Engraving", "“" + sel.engraving + "”", ENGRAVE_FEE]);
    var list = $("#sumList");
    if (list) list.innerHTML = rows.map(function (r) {
      var up = r[2] ? '<span class="up">+' + money(r[2]) + "</span>" : "";
      return "<div><dt>" + r[0] + "</dt><dd>" + r[1] + up + "</dd></div>";
    }).join("");
    var price = $("#sumPrice");
    if (price) price.textContent = money(total());
  }
  renderSummary();

  /* ----------------------- Stepper navigation ----------------------- */
  var form = $("#orderForm");
  var steps = Array.prototype.slice.call(document.querySelectorAll(".step"));
  var stepperItems = Array.prototype.slice.call(document.querySelectorAll("#stepper li"));
  var current = 1;

  function showStep(n) {
    current = Math.max(1, Math.min(3, n));
    steps.forEach(function (s) { s.classList.toggle("active", +s.dataset.step === current); });
    stepperItems.forEach(function (li) {
      var sn = +li.dataset.step;
      li.classList.toggle("active", sn === current);
      li.classList.toggle("done", sn < current);
    });
    if (form) {
      var top = $("#configurator");
      if (top && n > 1) window.scrollTo({ top: top.offsetTop - 70, behavior: reduce ? "auto" : "smooth" });
    }
  }
  document.querySelectorAll("[data-next]").forEach(function (b) { b.addEventListener("click", function () { showStep(current + 1); }); });
  document.querySelectorAll("[data-prev]").forEach(function (b) { b.addEventListener("click", function () { showStep(current - 1); }); });
  stepperItems.forEach(function (li) {
    li.addEventListener("click", function () { var sn = +li.dataset.step; if (sn < current) showStep(sn); });
  });

  /* ----------------------- Validation + submit ----------------------- */
  function setErr(id, on) {
    var input = document.getElementById(id);
    var err = document.querySelector('.err[data-for="' + id + '"]');
    if (input && input.classList) input.classList.toggle("bad", on);
    if (err) err.classList.toggle("show", on);
  }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  function validate() {
    var ok = true;
    var fname = $("#fname"), email = $("#email"), country = $("#country"), consent = $("#consent");
    var b1 = !fname.value.trim(); setErr("fname", b1); if (b1) ok = false;
    var b2 = !validEmail(email.value.trim()); setErr("email", b2); if (b2) ok = false;
    var b3 = !country.value.trim(); setErr("country", b3); if (b3) ok = false;
    var b4 = !consent.checked; setErr("consent", b4); if (b4) ok = false;
    return ok;
  }
  ["fname", "email", "country"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("input", function () { setErr(id, false); });
  });
  var consentEl = $("#consent");
  if (consentEl) consentEl.addEventListener("change", function () { setErr("consent", false); });

  if (form) form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate()) { toast("Please complete the highlighted fields", "!"); return; }
    var b = baseOf();
    var ref = "PC-" + b.name.slice(0, 2).toUpperCase() + "-" + Date.now().toString(36).slice(-5).toUpperCase();
    var msg = $("#confirmMsg"), refEl = $("#confirmRef");
    if (msg) msg.textContent = "Thank you, " + $("#fname").value.trim().split(" ")[0] +
      ". A dedicated advisor will contact you within one business day to confirm your " + b.name +
      " commission (est. " + money(total()) + ") — every detail, secured and certified.";
    if (refEl) refEl.textContent = ref;
    var confirm = $("#confirm");
    if (confirm) { confirm.hidden = false; document.body.style.overflow = "hidden"; }
  });

  var confirmClose = $("#confirmClose");
  if (confirmClose) confirmClose.addEventListener("click", function () {
    var confirm = $("#confirm");
    if (confirm) { confirm.hidden = true; document.body.style.overflow = ""; }
    if (form) form.reset();
    sel.engraving = "";
    renderSummary();
    showStep(1);
  });

  /* ----------------------- Testimonials ----------------------- */
  var QUOTES = [
    { t: "From the first email to the moment it arrived, the process felt genuinely personal. The finishing is on another level — and it keeps perfect time.", n: "Élise Marchand", r: "Apex Chronograph owner · Geneva", a: "ÉM" },
    { t: "I commissioned a bespoke piece for my father's 70th. The advisor guided every choice. The engraving brought him to tears. Faultless.", n: "David Okafor", r: "Bespoke commission · London", a: "DO" },
    { t: "Five watches in and the consistency is remarkable. Certified accuracy, real after-care, and a brand that actually answers the phone.", n: "Hiroshi Tanaka", r: "Collector · Tokyo", a: "HT" },
    { t: "The Nocturne's lume is unreal and the build quality justifies every cent. Secure ordering, insured delivery, zero friction.", n: "Sofia Russo", r: "Nocturne Lume owner · Milan", a: "SR" }
  ];
  var quotesHost = $("#quotes"), dotsHost = $("#quoteDots");
  if (quotesHost) {
    quotesHost.innerHTML = QUOTES.map(function (qd, i) {
      return '<figure class="quote' + (i === 0 ? " on" : "") + '">' +
        '<div class="stars">★★★★★</div>' +
        "<blockquote>“" + qd.t + "”</blockquote>" +
        '<figcaption class="who"><span class="av">' + qd.a + "</span>" +
        '<span><span class="nm">' + qd.n + '</span><br><span class="rl">' + qd.r + "</span></span>" +
        '<span class="vf">✓ Verified owner</span></figcaption>' +
      "</figure>";
    }).join("");
    if (dotsHost) dotsHost.innerHTML = QUOTES.map(function (_, i) {
      return '<button type="button" class="' + (i === 0 ? "on" : "") + '" data-q="' + i + '" aria-label="Testimonial ' + (i + 1) + '"></button>';
    }).join("");

    var qEls = quotesHost.querySelectorAll(".quote");
    var dEls = dotsHost ? dotsHost.querySelectorAll("button") : [];
    var qi = 0, qTimer;
    function showQuote(i) {
      qi = (i + QUOTES.length) % QUOTES.length;
      qEls.forEach(function (el, k) { el.classList.toggle("on", k === qi); });
      dEls.forEach(function (el, k) { el.classList.toggle("on", k === qi); });
    }
    function autoQuote() { if (reduce) return; clearInterval(qTimer); qTimer = setInterval(function () { showQuote(qi + 1); }, 5500); }
    dEls.forEach(function (d) { d.addEventListener("click", function () { showQuote(+d.dataset.q); autoQuote(); }); });
    autoQuote();
  }

  /* ----------------------- Bind frame imagery (advisor) ----------------------- */
  document.querySelectorAll("img[data-frame]").forEach(function (img) {
    var i = parseInt(img.getAttribute("data-frame"), 10);
    img.src = frame(i);
  });

  /* ----------------------- Toast ----------------------- */
  var toastEl = $("#toast"), toastTimer;
  function toast(msg, mark) {
    if (!toastEl) return;
    toastEl.innerHTML = (mark ? '<span class="tk">' + mark + "</span>" : "") + "<span>" + msg + "</span>";
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2600);
  }
})();
