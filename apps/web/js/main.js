/* =========================================================================
   PETROCORE — scroll engine
   - Cinematic canvas frame-scrubber (the "video" that plays on scroll)
   - Preloader, reveals, counters, magnetic cursor, pinned horizontal scroll
   ========================================================================= */
(function () {
  "use strict";

  var FRAMES = window.HP_FRAMES || window.PETROCORE_FRAMES || [];
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ---------------- Frame preloading ---------------- */
  var images = [];
  var loaded = 0;

  function preload(done) {
    if (!FRAMES.length) { done(); return; }
    FRAMES.forEach(function (src, i) {
      var img = new Image();
      img.decoding = "async";
      img.onload = img.onerror = function () {
        loaded++;
        var pct = Math.round((loaded / FRAMES.length) * 100);
        var bar = document.querySelector(".pl-bar i");
        var cnt = document.querySelector(".pl-count");
        if (bar) bar.style.width = pct + "%";
        if (cnt) cnt.textContent = String(pct).padStart(3, "0");
        if (loaded >= FRAMES.length) done();
      };
      img.src = src;
      images[i] = img;
    });
    /* safety: never hang the preloader more than 6s */
    setTimeout(done, 6000);
  }

  /* ---------------- Canvas scrubber ---------------- */
  var canvas = document.getElementById("scrub");
  var ctx = canvas ? canvas.getContext("2d") : null;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  function sizeCanvas() {
    if (!canvas) return;
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
  }

  function drawCover(img, alpha) {
    if (!img || !img.complete || !img.naturalWidth) return;
    var cw = canvas.width, ch = canvas.height;
    var ir = img.naturalWidth / img.naturalHeight;
    var cr = cw / ch;
    var w, h, x, y;
    if (cr > ir) { w = cw; h = cw / ir; x = 0; y = (ch - h) / 2; }
    else { h = ch; w = ch * ir; x = (cw - w) / 2; y = 0; }
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, x, y, w, h);
  }

  var targetProgress = 0, renderProgress = 0;

  function renderScrub() {
    if (!ctx || !images.length) return;
    renderProgress = reduce ? targetProgress : lerp(renderProgress, targetProgress, 0.12);
    var f = renderProgress * (images.length - 1);
    var base = Math.floor(f);
    var frac = f - base;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "source-over";
    drawCover(images[base], 1);
    if (images[base + 1]) drawCover(images[base + 1], frac);
    ctx.globalAlpha = 1;
  }

  /* ---------------- Scroll-linked state ---------------- */
  var hero = document.getElementById("hero");
  var stageVal = document.querySelector(".hero-stage .val");
  var STAGES = window.HP_STAGES || window.PETROCORE_STAGES || [];

  function onScroll() {
    var sy = window.scrollY || window.pageYOffset;
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var prog = document.getElementById("progress");
    if (prog) prog.style.width = (sy / (max || 1)) * 100 + "%";

    var head = document.querySelector("header");
    if (head) head.classList.toggle("shrink", sy > 40);

    if (hero) {
      var h = hero.offsetHeight - window.innerHeight;
      targetProgress = clamp((sy - hero.offsetTop) / (h || 1), 0, 1);
      /* parallax + fade the hero copy as the timepiece turns */
      var content = document.querySelector(".hero-content .wrap");
      if (content) {
        var fade = clamp(1 - targetProgress * 1.6, 0, 1);
        content.style.opacity = fade;
        content.style.transform = "translateY(" + targetProgress * -60 + "px)";
      }
      if (stageVal && STAGES.length) {
        var idx = clamp(Math.round(targetProgress * (STAGES.length - 1)), 0, STAGES.length - 1);
        if (stageVal.textContent !== STAGES[idx]) stageVal.textContent = STAGES[idx];
      }
    }
    pinnedOps(sy);
  }

  /* ---------------- Pinned horizontal scroll (collection) ---------------- */
  var ops = document.getElementById("ops");
  var opsTrack = document.querySelector(".ops-track");
  function pinnedOps(sy) {
    if (!ops || !opsTrack) return;
    var start = ops.offsetTop;
    var span = ops.offsetHeight - window.innerHeight;
    var p = clamp((sy - start) / (span || 1), 0, 1);
    var dist = opsTrack.scrollWidth - window.innerWidth;
    opsTrack.style.transform = "translate3d(" + -(p * dist) + "px,0,0)";
  }

  /* ---------------- RAF loop ---------------- */
  function frame() { renderScrub(); requestAnimationFrame(frame); }

  /* ---------------- Reveal on view ---------------- */
  function initReveals() {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.18 });
    document.querySelectorAll(".reveal, .lines").forEach(function (el) { io.observe(el); });
  }

  /* ---------------- Counters ---------------- */
  function initCounters() {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var to = parseFloat(el.dataset.to);
        var dec = parseInt(el.dataset.dec || "0", 10);
        var suffix = el.dataset.suffix || "";
        var t0 = performance.now(), dur = 1600;
        (function tick(now) {
          var p = clamp((now - t0) / dur, 0, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = (to * eased).toFixed(dec) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        })(t0);
        io.unobserve(el);
      });
    }, { threshold: 0.6 });
    document.querySelectorAll("[data-to]").forEach(function (el) { io.observe(el); });
  }

  /* ---------------- Hero headline ---------------- */
  function animateHero() {
    document.querySelectorAll(".hero-title .row span").forEach(function (s, i) {
      s.style.transition = "transform 1s var(--ease) " + (0.15 + i * 0.08) + "s";
      requestAnimationFrame(function () { s.style.transform = "translateY(0)"; });
    });
  }

  /* ---------------- Magnetic cursor + buttons ---------------- */
  function initCursor() {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    var cur = document.querySelector(".cursor");
    if (!cur) return;
    var cx = 0, cy = 0, tx = 0, ty = 0;
    window.addEventListener("mousemove", function (e) { tx = e.clientX; ty = e.clientY; });
    (function loop() {
      cx = lerp(cx, tx, 0.2); cy = lerp(cy, ty, 0.2);
      cur.style.transform = "translate(" + cx + "px," + cy + "px) translate(-50%,-50%)";
      requestAnimationFrame(loop);
    })();
    document.querySelectorAll("a, button, .cap, .ops-card").forEach(function (el) {
      el.addEventListener("mouseenter", function () { cur.classList.add("big"); });
      el.addEventListener("mouseleave", function () { cur.classList.remove("big"); });
    });
    /* spotlight on capability cards */
    document.querySelectorAll(".cap").forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - r.left) + "px");
        card.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  /* ---------------- Boot ---------------- */
  function boot() {
    sizeCanvas();
    onScroll();
    animateHero();
    initReveals();
    initCounters();
    initCursor();
    frame();
    var pre = document.getElementById("preload");
    if (pre) setTimeout(function () { pre.classList.add("done"); }, 400);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () { sizeCanvas(); onScroll(); });
  document.addEventListener("DOMContentLoaded", function () { preload(boot); });
})();
