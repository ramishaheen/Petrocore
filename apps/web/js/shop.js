/* =========================================================================
   PETROCORE — The Shop
   Renders the timepiece catalogue, handles filtering / sorting, the 3D-tilt
   cards, the quick-view modal and a working cart. Vanilla JS, no deps.
   Reuses window.PETROCORE_FRAMES (from frames.js) for product imagery.
   ========================================================================= */
(function () {
  "use strict";

  var F = window.PETROCORE_FRAMES || [];
  var frame = function (i) { return F[i] || F[F.length - 1] || ""; };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var money = function (n) { return "$" + n.toLocaleString("en-US"); };

  /* ----------------------- The catalogue ----------------------- */
  /* Each timepiece reuses one of the cinematic hero frames as its photo. */
  var WATCHES = [
    {
      id: "apex",   ref: "Ref. 01", name: "Apex Chronograph", frame: 0,
      price: 12400, cats: ["chronograph"], badge: "Signature", tagline: "Steel & champagne gold · blue sunburst dial",
      stock: 9, year: 2024,
      desc: "The reference that defines the maison. A column-wheel chronograph beating at 28,800 vph, its blue sunburst dial framed in champagne gold and finished entirely by hand.",
      specs: { Movement: "PC-71 automatic", Case: "40mm · 316L steel", Dial: "Blue sunburst", Crystal: "Box sapphire", Water: "120m", Reserve: "72 hours", Frequency: "28,800 vph" }
    },
    {
      id: "meridian", ref: "Ref. 02", name: "Meridian GMT", frame: 3,
      price: 9800, cats: ["gmt"], badge: "steel:GMT", tagline: "Titanium · second time-zone · applied indices",
      stock: 14, year: 2023,
      desc: "Built for those who keep two homes. A true-GMT caliber with an independent local hour hand and a 24-hour scale, cased in feather-light grade-5 titanium.",
      specs: { Movement: "PC-71 GMT automatic", Case: "41mm · titanium", Dial: "Slate grey", Crystal: "Box sapphire", Water: "100m", Reserve: "70 hours", Frequency: "28,800 vph" }
    },
    {
      id: "caliber", ref: "Ref. 03", name: "Caliber Skeleton", frame: 4,
      price: 18600, cats: ["skeleton"], badge: "Atelier", tagline: "Exhibition caseback · skeletonised rotor",
      stock: 6, year: 2025,
      desc: "The engine, on permanent display. Bridges are openworked, bevelled and black-polished by hand to reveal the PC-71 in motion from both sides of the case.",
      specs: { Movement: "PC-71 skeleton", Case: "40mm · steel", Dial: "Openworked", Crystal: "Double sapphire", Water: "50m", Reserve: "72 hours", Frequency: "28,800 vph" }
    },
    {
      id: "nocturne", ref: "Ref. 04", name: "Nocturne Lume", frame: 5,
      price: 7950, cats: ["dive"], badge: "steel:Dive", tagline: "Super-LumiNova X1 · engineered for darkness",
      stock: 18, year: 2024,
      desc: "A dive instrument that owns the night. A unidirectional bezel and a fully luminous dial coated in proprietary Super-LumiNova X1 that glows from dusk until dawn.",
      specs: { Movement: "PC-71 automatic", Case: "42mm · steel", Dial: "Matte black / full lume", Crystal: "Sapphire", Water: "300m", Reserve: "72 hours", Frequency: "28,800 vph" }
    },
    {
      id: "atelier", ref: "Ref. 05", name: "Atelier Tourbillon", frame: 1,
      price: 48000, cats: ["limited", "skeleton"], badge: "Limited · 25", tagline: "Flying tourbillon · 25 pieces worldwide",
      stock: 3, year: 2025,
      desc: "The summit of the collection. A one-minute flying tourbillon suspended in an openworked dial, each of the twenty-five pieces individually numbered and signed.",
      specs: { Movement: "PC-71T flying tourbillon", Case: "39mm · titanium", Dial: "Openworked anthracite", Crystal: "Box sapphire", Water: "50m", Reserve: "80 hours", Frequency: "21,600 vph" }
    },
    {
      id: "profil", ref: "Ref. 06", name: "Profil Ultra-Thin", frame: 2,
      price: 11200, cats: ["dress"], badge: "steel:Dress", tagline: "6.5mm profile · the dress reference",
      stock: 11, year: 2023,
      desc: "Restraint, perfected. A 6.5mm case slips beneath any cuff, its silvered dial carrying only what it must — applied indices, a railroad minute track, and time.",
      specs: { Movement: "PC-70 micro-rotor", Case: "38mm · 6.5mm thin", Dial: "Silvered opaline", Crystal: "Flat sapphire", Water: "30m", Reserve: "65 hours", Frequency: "28,800 vph" }
    },
    {
      id: "sovereign", ref: "Ref. 07", name: "Sovereign Day-Date", frame: 6,
      price: 6400, cats: ["dress"], badge: "steel:Everyday", tagline: "Day & date · the everyday automatic",
      stock: 22, year: 2022,
      desc: "The one you never take off. A robust everyday automatic with an instantaneous day-and-date, a brushed steel bracelet, and the certified accuracy of every PETROCORE.",
      specs: { Movement: "PC-70 automatic", Case: "40mm · steel", Dial: "Graphite", Crystal: "Sapphire", Water: "100m", Reserve: "65 hours", Frequency: "28,800 vph" }
    },
    {
      id: "aurum", ref: "Ref. 08", name: "Aurum Perpetual", frame: 0,
      price: 26500, cats: ["limited", "chronograph"], badge: "Limited · 50", tagline: "Perpetual calendar · solid 18k gold",
      stock: 4, year: 2025,
      desc: "A grand complication for the collector. A perpetual calendar tracking the date, day, month and leap year — needing no correction until the year 2100 — in solid 18k gold.",
      specs: { Movement: "PC-72 perpetual calendar", Case: "41mm · 18k gold", Dial: "Champagne", Crystal: "Box sapphire", Water: "50m", Reserve: "72 hours", Frequency: "28,800 vph" }
    }
  ];

  var FILTERS = [
    { key: "all", label: "All" },
    { key: "chronograph", label: "Chronograph" },
    { key: "gmt", label: "GMT" },
    { key: "dive", label: "Dive" },
    { key: "dress", label: "Dress" },
    { key: "skeleton", label: "Skeleton" },
    { key: "limited", label: "Limited" }
  ];

  /* ----------------------- DOM refs ----------------------- */
  var grid = document.getElementById("grid");
  var filtersEl = document.getElementById("filters");
  var resultCount = document.getElementById("resultCount");
  var sortSelect = document.getElementById("sortSelect");
  var emptyState = document.getElementById("emptyState");
  if (!grid) return;

  var state = { filter: "all", sort: "featured", cart: [], favs: {} };

  /* ----------------------- Filter chips ----------------------- */
  function countFor(key) {
    return key === "all" ? WATCHES.length : WATCHES.filter(function (w) { return w.cats.indexOf(key) > -1; }).length;
  }
  FILTERS.forEach(function (f) {
    var b = document.createElement("button");
    b.className = "chip" + (f.key === "all" ? " active" : "");
    b.type = "button";
    b.setAttribute("role", "tab");
    b.dataset.key = f.key;
    b.innerHTML = f.label + '<span class="c">' + countFor(f.key) + "</span>";
    b.addEventListener("click", function () {
      state.filter = f.key;
      filtersEl.querySelectorAll(".chip").forEach(function (c) { c.classList.toggle("active", c === b); });
      render();
    });
    filtersEl.appendChild(b);
  });

  /* ----------------------- Card markup ----------------------- */
  function badgeHtml(badge) {
    if (!badge) return "";
    if (badge.indexOf("steel:") === 0) return '<span class="badge steel">' + badge.slice(6) + "</span>";
    return '<span class="badge">' + badge + "</span>";
  }
  function chipsHtml(specs) {
    return ["Movement", "Case", "Water", "Reserve"].map(function (k) {
      return "<span>" + specs[k] + "</span>";
    }).join("");
  }
  function cardHtml(w) {
    return (
      '<article class="card" data-id="' + w.id + '" tabindex="0" role="button" aria-label="Quick view ' + w.name + '">' +
        '<div class="card-media">' +
          badgeHtml(w.badge) +
          '<button class="fav' + (state.favs[w.id] ? " on" : "") + '" type="button" data-fav="' + w.id + '" aria-label="Save ' + w.name + '">' + (state.favs[w.id] ? "♥" : "♡") + "</button>" +
          '<img src="' + frame(w.frame) + '" alt="PETROCORE ' + w.name + '" loading="lazy" />' +
          '<div class="card-shine"></div>' +
        "</div>" +
        '<div class="card-body">' +
          '<div class="card-ref">' + w.ref + " · " + w.year + "</div>" +
          '<h3 class="card-name">' + w.name + "</h3>" +
          '<p class="card-tagline">' + w.tagline + "</p>" +
          '<div class="spec-chips">' + chipsHtml(w.specs) + "</div>" +
          '<div class="card-foot">' +
            '<div class="price">' + money(w.price) + "<small>" + (w.stock <= 5 ? "Only " + w.stock + " available" : "In stock") + "</small></div>" +
            '<span class="card-cta" data-view="' + w.id + '">Quick view →</span>' +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }

  /* ----------------------- Render ----------------------- */
  function visible() {
    var list = WATCHES.filter(function (w) {
      return state.filter === "all" || w.cats.indexOf(state.filter) > -1;
    });
    var s = state.sort;
    list.sort(function (a, b) {
      if (s === "price-asc") return a.price - b.price;
      if (s === "price-desc") return b.price - a.price;
      if (s === "name") return a.name.localeCompare(b.name);
      return 0; /* featured = catalogue order */
    });
    return list;
  }

  function render() {
    var list = visible();
    grid.innerHTML = list.map(cardHtml).join("");
    if (resultCount) resultCount.textContent = "Showing " + list.length + " timepiece" + (list.length === 1 ? "" : "s");
    if (emptyState) emptyState.hidden = list.length > 0;
    /* stagger reveal */
    var cards = grid.querySelectorAll(".card");
    cards.forEach(function (c, i) {
      if (reduce) { c.classList.add("in"); return; }
      setTimeout(function () { c.classList.add("in"); }, 40 + i * 55);
    });
    bindCards();
  }

  /* ----------------------- Card interactions ----------------------- */
  function bindCards() {
    grid.querySelectorAll(".card").forEach(function (card) {
      var id = card.dataset.id;
      card.addEventListener("click", function (e) {
        if (e.target.closest("[data-fav]")) return; /* fav handled separately */
        openQuick(id);
      });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openQuick(id); }
      });
      /* 3D tilt + shine */
      if (!reduce && !window.matchMedia("(pointer: coarse)").matches) {
        var media = card.querySelector(".card-media");
        card.addEventListener("mousemove", function (e) {
          var r = card.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
          card.style.transform = "perspective(900px) rotateY(" + (px - 0.5) * 7 + "deg) rotateX(" + (0.5 - py) * 7 + "deg) translateY(-6px)";
          if (media) { media.style.setProperty("--mx", px * 100 + "%"); media.style.setProperty("--my", py * 100 + "%"); }
        });
        card.addEventListener("mouseleave", function () { card.style.transform = ""; });
      }
    });
    grid.querySelectorAll("[data-fav]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var id = btn.dataset.fav;
        state.favs[id] = !state.favs[id];
        btn.classList.toggle("on", state.favs[id]);
        btn.textContent = state.favs[id] ? "♥" : "♡";
        if (state.favs[id]) toast("Saved to your list", "♥");
      });
    });
  }

  /* ----------------------- Quick-view modal ----------------------- */
  var qv = document.getElementById("quickView");
  var qvAddBtn = document.getElementById("qvAdd");
  var currentId = null;

  function openQuick(id) {
    var w = WATCHES.find(function (x) { return x.id === id; });
    if (!w || !qv) return;
    currentId = id;
    document.getElementById("qvImg").src = frame(w.frame);
    document.getElementById("qvImg").alt = "PETROCORE " + w.name;
    document.getElementById("qvRef").textContent = w.ref + " · " + w.year;
    document.getElementById("qvName").textContent = w.name;
    document.getElementById("qvPrice").textContent = money(w.price);
    document.getElementById("qvDesc").textContent = w.desc;
    var badge = document.getElementById("qvBadge");
    if (w.badge) { badge.hidden = false; badge.textContent = w.badge.replace("steel:", ""); }
    else badge.hidden = true;
    document.getElementById("qvSpecs").innerHTML = Object.keys(w.specs).map(function (k) {
      return "<div><dt>" + k + "</dt><dd>" + w.specs[k] + "</dd></div>";
    }).join("");
    var avail = document.getElementById("qvAvail");
    avail.innerHTML = w.stock <= 5
      ? '<span class="low">●</span> Only ' + w.stock + " pieces remaining — reserve promptly."
      : '<span class="ok">●</span> In stock · ships within 3 business days.';
    qv.hidden = false;
    document.body.style.overflow = "hidden";
    qvAddBtn.focus();
  }
  function closeQuick() {
    if (!qv) return;
    qv.hidden = true;
    document.body.style.overflow = "";
    currentId = null;
  }
  if (qv) {
    qv.querySelectorAll("[data-close]").forEach(function (el) { el.addEventListener("click", closeQuick); });
    qvAddBtn.addEventListener("click", function () { if (currentId) { addToCart(currentId); closeQuick(); } });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeQuick(); closeCart(); }
  });

  /* ----------------------- Cart ----------------------- */
  var cartBtn = document.getElementById("cartBtn");
  var cartDrawer = document.getElementById("cartDrawer");
  var cartItems = document.getElementById("cartItems");
  var cartCount = document.getElementById("cartCount");
  var cartTotal = document.getElementById("cartTotal");

  function addToCart(id) {
    var w = WATCHES.find(function (x) { return x.id === id; });
    if (!w) return;
    state.cart.push(id);
    updateCart();
    toast(w.name + " added to your selection", "✦");
  }
  function removeFromCart(idx) { state.cart.splice(idx, 1); updateCart(); }

  function updateCart() {
    var n = state.cart.length;
    if (cartCount) { cartCount.textContent = n; cartCount.classList.toggle("show", n > 0); }
    if (!cartItems) return;
    if (!n) {
      cartItems.innerHTML = '<p class="cart-empty">Your selection is empty.<br>Add a timepiece to begin a reservation.</p>';
    } else {
      cartItems.innerHTML = state.cart.map(function (id, idx) {
        var w = WATCHES.find(function (x) { return x.id === id; });
        return '<div class="ci">' +
          '<img src="' + frame(w.frame) + '" alt="' + w.name + '" />' +
          '<div><div class="nm">' + w.name + '</div><div class="rf">' + w.ref + '</div>' +
          '<button class="rm" type="button" data-rm="' + idx + '">Remove</button></div>' +
          '<div class="pr">' + money(w.price) + "</div>" +
        "</div>";
      }).join("");
      cartItems.querySelectorAll("[data-rm]").forEach(function (b) {
        b.addEventListener("click", function () { removeFromCart(parseInt(b.dataset.rm, 10)); });
      });
    }
    var total = state.cart.reduce(function (sum, id) {
      var w = WATCHES.find(function (x) { return x.id === id; });
      return sum + (w ? w.price : 0);
    }, 0);
    if (cartTotal) cartTotal.textContent = money(total);
  }

  function openCart() { if (cartDrawer) { cartDrawer.classList.add("open"); cartDrawer.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; } }
  function closeCart() { if (cartDrawer) { cartDrawer.classList.remove("open"); cartDrawer.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; } }
  if (cartBtn) cartBtn.addEventListener("click", openCart);
  if (cartDrawer) cartDrawer.querySelectorAll("[data-cart-close]").forEach(function (el) { el.addEventListener("click", closeCart); });
  var checkoutBtn = document.getElementById("checkoutBtn");
  if (checkoutBtn) checkoutBtn.addEventListener("click", function () {
    if (!state.cart.length) { toast("Your selection is empty", "✦"); return; }
    toast("Reservation request sent — an advisor will be in touch.", "✓");
    state.cart = []; updateCart(); closeCart();
  });

  /* clear-filter link in empty state */
  if (emptyState) emptyState.addEventListener("click", function (e) {
    if (e.target.matches("[data-clear]")) {
      state.filter = "all";
      filtersEl.querySelectorAll(".chip").forEach(function (c) { c.classList.toggle("active", c.dataset.key === "all"); });
      render();
    }
  });

  /* ----------------------- Toast ----------------------- */
  var toastEl = document.getElementById("toast");
  var toastTimer;
  function toast(msg, mark) {
    if (!toastEl) return;
    toastEl.innerHTML = (mark ? '<span class="tk">' + mark + "</span>" : "") + "<span>" + msg + "</span>";
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2600);
  }

  /* ----------------------- Sort + boot ----------------------- */
  if (sortSelect) sortSelect.addEventListener("change", function () { state.sort = sortSelect.value; render(); });

  render();
  updateCart();
})();
