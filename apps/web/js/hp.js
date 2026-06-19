/* =========================================================================
   HORO PRIVÉ — shared front-end behaviours
   Toast, discreet WhatsApp/private line, client-login notice, name
   pronunciation, the home request module and the curated-opportunity preview.
   Vanilla JS; every hook is guarded so this file is safe on every page.
   ========================================================================= */
(function () {
  "use strict";

  var F = window.HP_FRAMES || [];
  var frame = function (i) { return F[i] || F[F.length - 1] || ""; };
  var money = function (n) { return "$" + n.toLocaleString("en-US"); };
  var $ = function (s, r) { return (r || document).querySelector(s); };

  /* WhatsApp number is a placeholder — replace with the live business line. */
  var WA_NUMBER = "10000000000";
  var WA_MSG = "Hello HORO PRIVÉ, I would like a private consultation regarding a watch acquisition.";

  /* ----------------------- Toast ----------------------- */
  var toastEl = $("#toast"), toastTimer;
  function toast(msg, mark) {
    if (!toastEl) { alert(msg); return; }
    toastEl.innerHTML = (mark ? '<span class="tk">' + mark + "</span>" : "") + "<span>" + msg + "</span>";
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 3000);
  }
  window.HP_toast = toast;

  /* ----------------------- WhatsApp / private line ----------------------- */
  document.querySelectorAll("[data-wa]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      window.open("https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(WA_MSG), "_blank", "noopener");
    });
  });

  /* ----------------------- Client login (front-end notice) ----------------------- */
  document.querySelectorAll("[data-login]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      toast("Secure client login is part of the portfolio build — preview the dashboard meanwhile.", "◷");
    });
  });

  /* ----------------------- Name pronunciation ----------------------- */
  document.querySelectorAll("[data-say]").forEach(function (el) {
    el.addEventListener("click", function () {
      try {
        var u = new SpeechSynthesisUtterance("Oh-roh Pree-vay");
        u.rate = 0.85; u.pitch = 1; u.lang = "fr-FR";
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      } catch (_) {}
      toast("HORO PRIVÉ — “Ho-roh Pree-vay”", "♪");
    });
  });

  /* ----------------------- Home quick request ----------------------- */
  var qr = $("#quickRequest");
  if (qr) {
    qr.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = qr.querySelector('[name="email"]');
      var err = qr.querySelector('.err[data-for="qrEmail"]');
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email.value || "").trim());
      if (err) err.classList.toggle("show", !ok);
      if (email) email.classList.toggle("bad", !ok);
      if (!ok) return;
      toast("Request received — a consultant will be in touch privately.", "✦");
      qr.reset();
    });
  }

  /* ----------------------- Curated opportunities (shared dataset) ----------------------- */
  /* Illustrative opportunities. Prices are indicative and subject to
     verification, availability and assessment. */
  var OPPORTUNITIES = [
    { brand: "Rolex", name: "Daytona", ref: "126500LN", year: 2024, cond: "Unworn", loc: "Switzerland", papers: "Full set", price: 38500, status: "Available Now", live: true, frame: 0, note: "Fresh full set, ceramic bezel, ready to deliver." },
    { brand: "Patek Philippe", name: "Nautilus", ref: "5711/1A", year: 2021, cond: "Excellent", loc: "Singapore", papers: "Full set", price: null, status: "Price on Request", live: false, frame: 3, note: "Discontinued blue dial; private opportunity." },
    { brand: "Audemars Piguet", name: "Royal Oak", ref: "15500ST", year: 2023, cond: "Mint", loc: "UAE", papers: "Full set", price: 41200, status: "Recently Located", live: true, frame: 4, note: "Blue 'Grande Tapisserie', minimal wear." },
    { brand: "A. Lange & Söhne", name: "Odysseus", ref: "363.179", year: 2022, cond: "Excellent", loc: "Germany", papers: "Full set", price: null, status: "Under Review", live: false, frame: 1, note: "Collector-grade; condition report in progress." },
    { brand: "Omega", name: "Speedmaster", ref: "310.30.42", year: 2023, cond: "Unworn", loc: "United Kingdom", papers: "Full set", price: 7400, status: "Available Now", live: true, frame: 5, note: "Moonwatch, Hesalite, sealed full set." },
    { brand: "Vacheron Constantin", name: "Overseas", ref: "4500V", year: 2020, cond: "Excellent", loc: "Hong Kong", papers: "Full set", price: null, status: "Client Mandate", live: false, frame: 2, note: "Sourced against an active collector mandate." }
  ];
  window.HP_OPPORTUNITIES = OPPORTUNITIES;

  function oppCard(o) {
    var price = o.price ? money(o.price) : "Price on Request";
    return '<a class="opp" href="shop.html">' +
      '<div class="opp-media"><span class="opp-status' + (o.live ? " live" : "") + '">' + o.status + "</span>" +
        '<img src="' + frame(o.frame) + '" alt="' + o.brand + " " + o.name + '" loading="lazy" /></div>' +
      '<div class="opp-body">' +
        '<div class="opp-brand">' + o.brand + " · " + o.ref + "</div>" +
        '<div class="opp-name">' + o.name + "</div>" +
        '<div class="opp-meta"><span>' + o.year + "</span><span>" + o.cond + "</span><span>" + o.papers + "</span><span>" + o.loc + "</span></div>" +
        '<div class="opp-foot"><span class="opp-price">' + price + '</span><span class="opp-cta">Request review →</span></div>' +
      "</div></a>";
  }

  var oppPreview = $("#oppPreview");
  if (oppPreview) oppPreview.innerHTML = OPPORTUNITIES.slice(0, 4).map(oppCard).join("");

  /* ----------------------- Bind data-frame imagery (any page) ----------------------- */
  document.querySelectorAll("img[data-frame]").forEach(function (img) {
    var i = parseInt(img.getAttribute("data-frame"), 10);
    if (!isNaN(i)) img.src = frame(i);
  });
})();
