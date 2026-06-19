/* =========================================================================
   HORO PRIVÉ — Curated Opportunities
   Renders advisory "watch opportunities", filtering / sorting, a quick-view
   with the consultant's assessment, and a private Shortlist (replaces cart).
   Vanilla JS. Reuses window.HP_FRAMES for imagery and HP_toast from hp.js.
   ========================================================================= */
(function () {
  "use strict";

  var F = window.HP_FRAMES || window.PETROCORE_FRAMES || [];
  var frame = function (i) { return F[i] || F[F.length - 1] || ""; };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var money = function (n) { return "$" + n.toLocaleString("en-US"); };
  var toast = window.HP_toast || function (m) { console.log(m); };

  /* ----------------------- Opportunity catalogue -----------------------
     Illustrative opportunities for demonstration. Prices are indicative and
     every record is subject to verification, availability and assessment. */
  var WATCHES = [
    { id: "daytona", brand: "Rolex", name: "Cosmograph Daytona", ref: "126500LN", year: 2024, frame: 0,
      price: 38500, cats: ["available", "rolex"], status: "Available Now", live: true,
      cond: "Unworn", papers: "Full set", loc: "Switzerland",
      specs: { Reference: "126500LN", Year: "2024", Case: "40mm Oystersteel", Movement: "Cal. 4131, automatic", Dial: "White lacquer", "Box & papers": "Full set, 2024", Condition: "Unworn", Location: "Switzerland", Delivery: "Worldwide, insured" },
      why: "A fresh full set of the current-generation ceramic Daytona, ready to deliver. Among the most liquid references in the market.",
      consider: "Trades above retail; we will confirm seller standing and warranty card date before any commitment.", verify: "Seller vetted · papers consistent · pending physical inspection" },
    { id: "nautilus", brand: "Patek Philippe", name: "Nautilus", ref: "5711/1A-010", year: 2021, frame: 3,
      price: null, cats: ["por", "rare", "patek"], status: "Price on Request", live: false,
      cond: "Excellent", papers: "Full set", loc: "Singapore",
      specs: { Reference: "5711/1A-010", Year: "2021", Case: "40mm steel", Movement: "Cal. 26-330 S C", Dial: "Blue gradient", "Box & papers": "Full set", Condition: "Excellent", Location: "Singapore", Delivery: "Subject to assessment" },
      why: "The discontinued blue-dial 5711 — a defining modern grail. Offered privately against verified ownership.",
      consider: "Pricing is dynamic and quoted privately; provenance and service history reviewed in full before introduction.", verify: "Private seller · documentation under review" },
    { id: "royaloak", brand: "Audemars Piguet", name: "Royal Oak", ref: "15500ST", year: 2023, frame: 4,
      price: 41200, cats: ["available", "ap"], status: "Recently Located", live: true,
      cond: "Mint", papers: "Full set", loc: "United Arab Emirates",
      specs: { Reference: "15500ST.OO.1220ST.01", Year: "2023", Case: "41mm steel", Movement: "Cal. 4302, automatic", Dial: "Blue Grande Tapisserie", "Box & papers": "Full set", Condition: "Mint", Location: "UAE", Delivery: "Worldwide, insured" },
      why: "Located against current demand — the blue 41mm Royal Oak with minimal wear and complete documentation.",
      consider: "We will confirm the bracelet stretch and case sharpness on inspection before recommending.", verify: "Dealer vetted · reference & serial consistent" },
    { id: "odysseus", brand: "A. Lange & Söhne", name: "Odysseus", ref: "363.179", year: 2022, frame: 1,
      price: null, cats: ["por", "rare", "lange"], status: "Under Review", live: false,
      cond: "Excellent", papers: "Full set", loc: "Germany",
      specs: { Reference: "363.179", Year: "2022", Case: "40.5mm steel", Movement: "Cal. L155.1 Datomatic", Dial: "Blue", "Box & papers": "Full set", Condition: "Excellent", Location: "Germany", Delivery: "Subject to assessment" },
      why: "Lange's steel sports watch — quietly one of the most compelling propositions in modern collecting.",
      consider: "Condition report and service status are being finalised before this is offered for acquisition.", verify: "Condition report in progress" },
    { id: "speedmaster", brand: "Omega", name: "Speedmaster Moonwatch", ref: "310.30.42", year: 2023, frame: 5,
      price: 7400, cats: ["available", "omega"], status: "Available Now", live: true,
      cond: "Unworn", papers: "Full set", loc: "United Kingdom",
      specs: { Reference: "310.30.42.50.01.001", Year: "2023", Case: "42mm steel", Movement: "Cal. 3861, manual", Dial: "Black, Hesalite", "Box & papers": "Sealed full set", Condition: "Unworn", Location: "United Kingdom", Delivery: "Worldwide, insured" },
      why: "An ideal first significant watch — the moonwatch, sealed, at a sensible entry into serious horology.",
      consider: "Excellent value and liquidity; minimal downside risk for a first acquisition.", verify: "Dealer vetted · sealed full set" },
    { id: "overseas", brand: "Vacheron Constantin", name: "Overseas", ref: "4500V", year: 2020, frame: 2,
      price: null, cats: ["por", "client"], status: "Client Mandate", live: false,
      cond: "Excellent", papers: "Full set", loc: "Hong Kong",
      specs: { Reference: "4500V/110A-B128", Year: "2020", Case: "41mm steel", Movement: "Cal. 5100, automatic", Dial: "Blue", "Box & papers": "Full set", Condition: "Excellent", Location: "Hong Kong", Delivery: "Subject to assessment" },
      why: "Sourced against an active collector mandate; a discreet route to one of the great integrated-bracelet sports watches.",
      consider: "Priority is given to the mandating client; comparable examples can be sourced on request.", verify: "Sourced for mandate · provenance verified" },
    { id: "submariner", brand: "Rolex", name: "Submariner Date", ref: "126610LN", year: 2024, frame: 0,
      price: 14800, cats: ["available", "rolex"], status: "Available Now", live: true,
      cond: "Unworn", papers: "Full set", loc: "Italy",
      specs: { Reference: "126610LN", Year: "2024", Case: "41mm Oystersteel", Movement: "Cal. 3235, automatic", Dial: "Black", "Box & papers": "Full set", Condition: "Unworn", Location: "Italy", Delivery: "Worldwide, insured" },
      why: "The benchmark steel diver, current generation, unworn — endlessly wearable and highly liquid.",
      consider: "A cornerstone piece; we confirm card date and seller standing prior to purchase.", verify: "Dealer vetted · papers consistent" },
    { id: "aquanaut", brand: "Patek Philippe", name: "Aquanaut", ref: "5167A", year: 2019, frame: 3,
      price: null, cats: ["por", "patek"], status: "Private Opportunity", live: false,
      cond: "Very good", papers: "Full set", loc: "United States",
      specs: { Reference: "5167A-001", Year: "2019", Case: "40mm steel", Movement: "Cal. 324 S C", Dial: "Black embossed", "Box & papers": "Full set", Condition: "Very good", Location: "United States", Delivery: "Subject to assessment" },
      why: "The steel Aquanaut — a versatile, travel-ready Patek offered through a private channel.",
      consider: "Light wear consistent with age; we will assess polishing history before recommending.", verify: "Private seller · documentation review pending" }
  ];

  var FILTERS = [
    { key: "all", label: "All" },
    { key: "available", label: "Available now" },
    { key: "por", label: "Price on request" },
    { key: "rare", label: "Rare / vintage" },
    { key: "client", label: "Client mandate" }
  ];

  var grid = document.getElementById("grid");
  var filtersEl = document.getElementById("filters");
  var resultCount = document.getElementById("resultCount");
  var sortSelect = document.getElementById("sortSelect");
  var emptyState = document.getElementById("emptyState");
  if (!grid) return;

  var state = { filter: "all", sort: "featured", list: [], shortlist: [] };

  function countFor(key) {
    return key === "all" ? WATCHES.length : WATCHES.filter(function (w) { return w.cats.indexOf(key) > -1; }).length;
  }
  FILTERS.forEach(function (f) {
    var b = document.createElement("button");
    b.className = "chip" + (f.key === "all" ? " active" : "");
    b.type = "button"; b.dataset.key = f.key;
    b.innerHTML = f.label + '<span class="c">' + countFor(f.key) + "</span>";
    b.addEventListener("click", function () {
      state.filter = f.key;
      filtersEl.querySelectorAll(".chip").forEach(function (c) { c.classList.toggle("active", c === b); });
      render();
    });
    filtersEl.appendChild(b);
  });

  function priceLabel(w) { return w.price ? money(w.price) : "Price on Request"; }
  function chipsHtml(w) {
    return [w.year, w.cond, w.papers, w.loc].map(function (x) { return "<span>" + x + "</span>"; }).join("");
  }
  function cardHtml(w) {
    var shortlisted = state.shortlist.indexOf(w.id) > -1;
    return (
      '<article class="card" data-id="' + w.id + '" tabindex="0" role="button" aria-label="Review ' + w.brand + " " + w.name + '">' +
        '<div class="card-media">' +
          '<span class="badge' + (w.live ? "" : " steel") + '">' + w.status + "</span>" +
          '<button class="fav' + (shortlisted ? " on" : "") + '" type="button" data-fav="' + w.id + '" aria-label="Shortlist">' + (shortlisted ? "★" : "☆") + "</button>" +
          '<img src="' + frame(w.frame) + '" alt="' + w.brand + " " + w.name + '" loading="lazy" />' +
          '<div class="card-shine"></div>' +
        "</div>" +
        '<div class="card-body">' +
          '<div class="card-ref">' + w.brand + " · " + w.ref + "</div>" +
          '<h3 class="card-name serif">' + w.name + "</h3>" +
          '<p class="card-tagline">' + w.why + "</p>" +
          '<div class="spec-chips">' + chipsHtml(w) + "</div>" +
          '<div class="card-foot">' +
            '<div class="price">' + priceLabel(w) + "<small>" + (w.price ? "Indicative · excl. fees" : "Quoted privately") + "</small></div>" +
            '<span class="card-cta">Request review →</span>' +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }

  function visible() {
    var list = WATCHES.filter(function (w) { return state.filter === "all" || w.cats.indexOf(state.filter) > -1; });
    var s = state.sort;
    list.sort(function (a, b) {
      if (s === "price-asc") return (a.price || 1e12) - (b.price || 1e12);
      if (s === "price-desc") return (b.price || -1) - (a.price || -1);
      if (s === "name") return a.brand.localeCompare(b.brand);
      return 0;
    });
    return list;
  }

  function render() {
    var list = visible();
    grid.innerHTML = list.map(cardHtml).join("");
    if (resultCount) resultCount.textContent = "Showing " + list.length + " opportunit" + (list.length === 1 ? "y" : "ies");
    if (emptyState) emptyState.hidden = list.length > 0;
    grid.querySelectorAll(".card").forEach(function (c, i) {
      if (reduce) { c.classList.add("in"); return; }
      setTimeout(function () { c.classList.add("in"); }, 40 + i * 55);
    });
    bindCards();
  }

  function bindCards() {
    grid.querySelectorAll(".card").forEach(function (card) {
      var id = card.dataset.id;
      card.addEventListener("click", function (e) { if (e.target.closest("[data-fav]")) return; openQuick(id); });
      card.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openQuick(id); } });
      if (!reduce && !window.matchMedia("(pointer: coarse)").matches) {
        var media = card.querySelector(".card-media");
        card.addEventListener("mousemove", function (e) {
          var r = card.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
          card.style.transform = "perspective(900px) rotateY(" + (px - 0.5) * 6 + "deg) rotateX(" + (0.5 - py) * 6 + "deg) translateY(-6px)";
          if (media) { media.style.setProperty("--mx", px * 100 + "%"); media.style.setProperty("--my", py * 100 + "%"); }
        });
        card.addEventListener("mouseleave", function () { card.style.transform = ""; });
      }
    });
    grid.querySelectorAll("[data-fav]").forEach(function (btn) {
      btn.addEventListener("click", function (e) { e.stopPropagation(); toggleShortlist(btn.dataset.fav); });
    });
  }

  /* ----------------------- Quick view ----------------------- */
  var qv = document.getElementById("quickView");
  var currentId = null;
  function openQuick(id) {
    var w = WATCHES.find(function (x) { return x.id === id; });
    if (!w || !qv) return;
    currentId = id;
    document.getElementById("qvImg").src = frame(w.frame);
    document.getElementById("qvImg").alt = w.brand + " " + w.name;
    document.getElementById("qvRef").textContent = w.brand + " · " + w.ref;
    document.getElementById("qvName").textContent = w.name;
    document.getElementById("qvPrice").textContent = priceLabel(w);
    document.getElementById("qvDesc").textContent = w.why;
    var badge = document.getElementById("qvBadge");
    badge.hidden = false; badge.textContent = w.status;
    document.getElementById("qvSpecs").innerHTML = Object.keys(w.specs).map(function (k) {
      return "<div><dt>" + k + "</dt><dd>" + w.specs[k] + "</dd></div>";
    }).join("");
    document.getElementById("qvAssess").innerHTML =
      '<h4>Consultant’s assessment</h4><p>' + w.consider + "</p>" +
      '<p class="verify"><span>Verification</span> ' + w.verify + "</p>";
    var review = document.getElementById("qvReview");
    if (review) review.href = "order.html?ref=" + encodeURIComponent(w.id);
    var sl = document.getElementById("qvShortlist");
    if (sl) { var on = state.shortlist.indexOf(w.id) > -1; sl.textContent = on ? "On your shortlist ✓" : "Add to shortlist"; }
    var avail = document.getElementById("qvAvail");
    avail.innerHTML = w.live
      ? '<span class="ok">●</span> Available now · subject to inspection and confirmation.'
      : '<span class="low">●</span> ' + w.status + " · introduced privately after review.";
    qv.hidden = false; document.body.style.overflow = "hidden";
  }
  function closeQuick() { if (qv) { qv.hidden = true; document.body.style.overflow = ""; currentId = null; } }
  if (qv) {
    qv.querySelectorAll("[data-close]").forEach(function (el) { el.addEventListener("click", closeQuick); });
    var slBtn = document.getElementById("qvShortlist");
    if (slBtn) slBtn.addEventListener("click", function () { if (currentId) { toggleShortlist(currentId); var on = state.shortlist.indexOf(currentId) > -1; slBtn.textContent = on ? "On your shortlist ✓" : "Add to shortlist"; } });
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeQuick(); closeCart(); } });

  /* ----------------------- Shortlist ----------------------- */
  var cartBtn = document.getElementById("cartBtn");
  var cartDrawer = document.getElementById("cartDrawer");
  var cartItems = document.getElementById("cartItems");
  var cartCount = document.getElementById("cartCount");
  var cartTotal = document.getElementById("cartTotal");

  function toggleShortlist(id) {
    var i = state.shortlist.indexOf(id);
    var w = WATCHES.find(function (x) { return x.id === id; });
    if (i > -1) { state.shortlist.splice(i, 1); }
    else { state.shortlist.push(id); toast((w ? w.name : "Watch") + " added to your shortlist", "★"); }
    updateShortlist();
    var card = grid.querySelector('.card[data-id="' + id + '"] [data-fav]');
    if (card) { var on = state.shortlist.indexOf(id) > -1; card.classList.toggle("on", on); card.textContent = on ? "★" : "☆"; }
  }
  function updateShortlist() {
    var n = state.shortlist.length;
    if (cartCount) { cartCount.textContent = n; cartCount.classList.toggle("show", n > 0); }
    if (!cartItems) return;
    if (!n) { cartItems.innerHTML = '<p class="cart-empty">Your shortlist is empty.<br>Add opportunities to request a combined review.</p>'; }
    else {
      cartItems.innerHTML = state.shortlist.map(function (id) {
        var w = WATCHES.find(function (x) { return x.id === id; });
        return '<div class="ci"><img src="' + frame(w.frame) + '" alt="' + w.name + '" />' +
          '<div><div class="nm">' + w.name + '</div><div class="rf">' + w.brand + " · " + w.ref + '</div>' +
          '<button class="rm" type="button" data-rm="' + id + '">Remove</button></div>' +
          '<div class="pr">' + priceLabel(w) + "</div></div>";
      }).join("");
      cartItems.querySelectorAll("[data-rm]").forEach(function (b) { b.addEventListener("click", function () { toggleShortlist(b.dataset.rm); }); });
    }
    var total = state.shortlist.reduce(function (s, id) { var w = WATCHES.find(function (x) { return x.id === id; }); return s + (w && w.price ? w.price : 0); }, 0);
    if (cartTotal) cartTotal.textContent = total ? money(total) + "+" : "On request";
  }
  function openCart() { if (cartDrawer) { cartDrawer.classList.add("open"); cartDrawer.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; } }
  function closeCart() { if (cartDrawer) { cartDrawer.classList.remove("open"); cartDrawer.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; } }
  if (cartBtn) cartBtn.addEventListener("click", openCart);
  if (cartDrawer) cartDrawer.querySelectorAll("[data-cart-close]").forEach(function (el) { el.addEventListener("click", closeCart); });
  var checkoutBtn = document.getElementById("checkoutBtn");
  if (checkoutBtn) checkoutBtn.addEventListener("click", function () {
    if (!state.shortlist.length) { toast("Your shortlist is empty", "★"); return; }
    toast("Shortlist sent — a consultant will review and respond privately.", "✓");
    state.shortlist = []; updateShortlist(); closeCart();
  });

  if (emptyState) emptyState.addEventListener("click", function (e) {
    if (e.target.matches("[data-clear]")) {
      state.filter = "all";
      filtersEl.querySelectorAll(".chip").forEach(function (c) { c.classList.toggle("active", c.dataset.key === "all"); });
      render();
    }
  });
  if (sortSelect) sortSelect.addEventListener("change", function () { state.sort = sortSelect.value; render(); });

  render();
  updateShortlist();
})();
