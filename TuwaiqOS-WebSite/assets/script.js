/* =========================================================
   TuwaiqOS — Kernel Terminal behaviours
   - Boot overlay (once per session)
   - Matrix rain (subtle background)
   - News ticker (auto duplicated for seamless loop)
   - Hover-triggered typing "boot" on terminal + phase cards
   - Scroll reveal
   - Mobile nav
   ========================================================= */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1) Boot Overlay (once per session) ---------- */
  var BOOT_LINES = [
    { text: "TuwaiqOS bootloader v0.6.1",           delay: 60,  cls: "dim" },
    { text: "[ OK ] BIOS handoff · long mode enabled", delay: 90 },
    { text: "[ OK ] GDT/TSS installed",              delay: 80 },
    { text: "[ OK ] IDT + PIC/PIT online",           delay: 80 },
    { text: "[ OK ] paging + NX",                    delay: 80 },
    { text: "[ OK ] kernel heap mapped",             delay: 80 },
    { text: "[ OK ] scheduler / preemption",         delay: 80 },
    { text: "[ OK ] Ring 3 / process isolation",     delay: 90 },
    { text: "[ OK ] VFS root mounted",               delay: 90 },
    { text: "[ OK ] desktop foundation",             delay: 90 },
    { text: "",                                       delay: 40 },
    { text: "phase6: COMPLETE",                       delay: 120, cls: "ok" },
    { text: "starting userspace... ready.",           delay: 120, cls: "dim" }
  ];

  function initBootOverlay() {
    try {
      if (sessionStorage.getItem("tuwaiq_booted") === "1") return;
    } catch (e) {}
    if (reduceMotion) { try{sessionStorage.setItem("tuwaiq_booted","1");}catch(e){} return; }

    var overlay = document.createElement("div");
    overlay.className = "bootOverlay";
    overlay.setAttribute("role", "status");
    overlay.setAttribute("aria-live", "polite");
    overlay.innerHTML =
      '<div class="bootBox">' +
        '<div class="bootHeader">' +
          '<span>tuwaiq://kernel/boot</span>' +
          '<button class="bootSkip" type="button" aria-label="Skip boot">SKIP ›</button>' +
        '</div>' +
        '<pre></pre>' +
        '<div class="bootFooter">' +
          '<span>x86_64 · rustc · qemu-system-x86_64</span>' +
          '<span class="bootStatus">POST · initializing</span>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    var pre = overlay.querySelector("pre");
    var statusEl = overlay.querySelector(".bootStatus");
    var skipBtn = overlay.querySelector(".bootSkip");
    var idx = 0, killed = false;

    function done() {
      if (killed) return;
      killed = true;
      try{sessionStorage.setItem("tuwaiq_booted","1");}catch(e){}
      overlay.classList.add("hide");
      setTimeout(function(){ if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 550);
    }

    skipBtn.addEventListener("click", done);
    document.addEventListener("keydown", function esc(e){
      if (e.key === "Escape" || e.key === "Enter"){ done(); document.removeEventListener("keydown", esc); }
    });

    function typeLine() {
      if (killed) return;
      if (idx >= BOOT_LINES.length) {
        statusEl.textContent = "READY";
        setTimeout(done, 550);
        return;
      }
      var line = BOOT_LINES[idx++];
      var el;
      if (line.cls) {
        el = document.createElement("span");
        el.className = line.cls;
        el.textContent = line.text;
      } else {
        // Highlight "[ OK ]" green, rest white
        var m = line.text.match(/^(\[\s*OK\s*\])\s*(.*)$/);
        if (m) {
          var ok = document.createElement("span");
          ok.className = "ok";
          ok.textContent = m[1];
          pre.appendChild(ok);
          pre.appendChild(document.createTextNode(" " + m[2]));
          pre.appendChild(document.createTextNode("\n"));
          setTimeout(typeLine, line.delay);
          return;
        } else {
          el = document.createTextNode(line.text);
        }
      }
      pre.appendChild(el);
      pre.appendChild(document.createTextNode("\n"));
      setTimeout(typeLine, line.delay);
    }
    setTimeout(typeLine, 200);
  }

  /* ---------- 2) Matrix Rain (subtle background) ---------- */
  function initMatrix() {
    if (reduceMotion) return;
    var canvas = document.createElement("canvas");
    canvas.id = "matrix-rain";
    canvas.setAttribute("aria-hidden","true");
    document.body.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    var w, h, cols, drops, fontSize = 14;
    var chars = "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンTUWAIQKERNEL{}[];<>/*";
    function resize(){
      w = canvas.width = window.innerWidth * (window.devicePixelRatio||1);
      h = canvas.height = window.innerHeight * (window.devicePixelRatio||1);
      canvas.style.width = window.innerWidth+"px";
      canvas.style.height = window.innerHeight+"px";
      cols = Math.floor(w / (fontSize * (window.devicePixelRatio||1)));
      drops = new Array(cols).fill(0).map(function(){ return Math.random() * -100; });
    }
    resize();
    window.addEventListener("resize", resize);

    var lastFrame = 0;
    function draw(ts){
      // throttle ~18fps for subtlety + perf
      if (ts - lastFrame < 55) { requestAnimationFrame(draw); return; }
      lastFrame = ts;
      ctx.fillStyle = "rgba(3,6,4,0.08)";
      ctx.fillRect(0,0,w,h);
      ctx.font = (fontSize * (window.devicePixelRatio||1)) + "px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#84ff48";
      for (var i=0;i<drops.length;i++){
        var ch = chars.charAt(Math.floor(Math.random()*chars.length));
        var x = i * fontSize * (window.devicePixelRatio||1);
        var y = drops[i] * fontSize * (window.devicePixelRatio||1);
        ctx.fillText(ch, x, y);
        if (y > h && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 0.5;
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  /* ---------- 3) News Ticker (duplicated for seamless loop) ---------- */
  var TICKER_ITEMS = [
    { t: "PHASE 6", d: "Storage, VFS & Real Applications · COMPLETE" },
    { t: "NEXT",    d: "Phase 7 — Hardware & Networking" },
    { t: "KERNEL",  d: "Written in Rust · x86_64 · Ring 3 isolation" },
    { t: "TIMER",   d: "100 Hz preemption · scheduler online" },
    { t: "BUILD",   d: "Development · not for production data" },
    { t: "COMMUNITY", d: "Telegram + GitHub · open source" }
  ];

  function initTicker() {
    var host = document.querySelector(".newsTicker .tickerTrack");
    if (!host) return;
    function buildOnce(){
      var frag = document.createDocumentFragment();
      TICKER_ITEMS.forEach(function(it){
        var s = document.createElement("span");
        s.innerHTML = "<b>" + it.t + "</b> " + it.d;
        frag.appendChild(s);
        var sep = document.createElement("span");
        sep.className = "sep";
        sep.textContent = "◇";
        frag.appendChild(sep);
      });
      return frag;
    }
    host.appendChild(buildOnce());
    host.appendChild(buildOnce()); // duplicate for infinite scroll
  }

  /* ---------- 4) Hover boot on terminal card + phase cards ---------- */
  function tokenizeBootPre(pre) {
    // Convert existing "[ OK ] xxx" lines into spans with .ok
    var text = pre.textContent;
    // Preserve trailing underscore cursor
    var cursorChar = "";
    if (text.charAt(text.length - 1) === "_") { cursorChar = "_"; text = text.slice(0,-1); }
    pre.textContent = "";
    var lines = text.split("\n");
    lines.forEach(function(line, i){
      var m = line.match(/^(\[\s*OK\s*\])\s*(.*)$/);
      var wm = line.match(/^phase\d+:\s*(COMPLETE|IN PROGRESS)/i);
      if (m) {
        var ok = document.createElement("span");
        ok.className = "ok";
        ok.textContent = m[1];
        pre.appendChild(ok);
        pre.appendChild(document.createTextNode(" " + m[2]));
      } else if (wm) {
        var span = document.createElement("span");
        span.className = "ok";
        span.textContent = line;
        pre.appendChild(span);
      } else if (/^next:/i.test(line)) {
        var d = document.createElement("span");
        d.className = "dim";
        d.textContent = line;
        pre.appendChild(d);
      } else {
        pre.appendChild(document.createTextNode(line));
      }
      if (i < lines.length - 1) pre.appendChild(document.createTextNode("\n"));
    });
    if (cursorChar) {
      var cursor = document.createElement("span");
      cursor.className = "bootCursor";
      cursor.setAttribute("aria-hidden","true");
      pre.appendChild(cursor);
    }
  }

  function initTerminalHover() {
    var card = document.querySelector(".terminalCard");
    if (!card) return;
    var pre = card.querySelector("pre");
    if (!pre) return;

    // Save original full text and tokenize a snapshot
    var originalFull = pre.textContent;
    var cursorChar = "";
    var body = originalFull;
    if (body.charAt(body.length - 1) === "_") { cursorChar = "_"; body = body.slice(0,-1); }
    var lines = body.split("\n");

    // Initial render (static tokenized)
    tokenizeBootPre(pre);

    var busy = false;
    function replay() {
      if (busy || reduceMotion) return;
      busy = true;
      pre.textContent = "";
      var i = 0;
      function next(){
        if (i >= lines.length) {
          if (cursorChar) {
            var cur = document.createElement("span");
            cur.className = "bootCursor";
            cur.setAttribute("aria-hidden","true");
            pre.appendChild(cur);
          }
          busy = false;
          return;
        }
        var line = lines[i++];
        var m = line.match(/^(\[\s*OK\s*\])\s*(.*)$/);
        if (m) {
          var ok = document.createElement("span"); ok.className="ok"; ok.textContent=m[1];
          pre.appendChild(ok);
          pre.appendChild(document.createTextNode(" " + m[2]));
        } else if (/^phase\d+:\s*COMPLETE/i.test(line)) {
          var s = document.createElement("span"); s.className="ok"; s.textContent=line; pre.appendChild(s);
        } else if (/^next:/i.test(line)) {
          var d = document.createElement("span"); d.className="dim"; d.textContent=line; pre.appendChild(d);
        } else {
          pre.appendChild(document.createTextNode(line));
        }
        if (i < lines.length) pre.appendChild(document.createTextNode("\n"));
        setTimeout(next, 180);
      }
      next();
    }

    card.addEventListener("mouseenter", replay);
    card.addEventListener("focusin", replay);
  }

  /* Per-phase hover boot content (typing) */
  var PHASE_BOOTS = {
    "01": ["> phase01 · interrupts", "[ OK ] GDT / TSS loaded", "[ OK ] IDT online", "[ OK ] PIC/PIT wired", "[ OK ] input driven by IRQ"],
    "02": ["> phase02 · memory", "[ OK ] paging enabled", "[ OK ] frame allocator", "[ OK ] kernel heap mapped", "phase02: COMPLETE"],
    "03": ["> phase03 · concurrency", "[ OK ] task stacks", "[ OK ] context switch", "[ OK ] timer preemption", "phase03: COMPLETE"],
    "04": ["> phase04 · user mode", "[ OK ] Ring 3 entry", "[ OK ] syscalls", "[ OK ] address spaces", "[ OK ] ELF loader"],
    "05": ["> phase05 · desktop", "[ OK ] display buffer", "[ OK ] mouse + keyboard", "[ OK ] Tuwaiq Desktop up"],
    "06": ["> phase06 · storage", "[ OK ] VFS root mounted", "[ OK ] path ops", "[ OK ] file ABI", "[ OK ] fs-backed apps"]
  };

  function initPhaseHover() {
    var phases = document.querySelectorAll(".phase");
    if (!phases.length) return;
    phases.forEach(function(el){
      var numEl = el.querySelector(".phaseTop span");
      if (!numEl) return;
      var num = numEl.textContent.trim();
      var lines = PHASE_BOOTS[num];
      if (!lines) return;

      var boot = document.createElement("div");
      boot.className = "phaseBoot";
      boot.setAttribute("aria-hidden","true");
      el.appendChild(boot);

      var tid = null, running = false;
      function play(){
        if (running || reduceMotion) return;
        running = true;
        boot.textContent = "";
        var i = 0;
        function next(){
          if (i >= lines.length){ running=false; return; }
          var line = lines[i++];
          var m = line.match(/^(\[\s*OK\s*\])\s*(.*)$/);
          if (m){
            var ok = document.createElement("span"); ok.className="ok"; ok.textContent=m[1];
            boot.appendChild(ok);
            boot.appendChild(document.createTextNode(" " + m[2]));
          } else {
            boot.appendChild(document.createTextNode(line));
          }
          boot.appendChild(document.createTextNode("\n"));
          tid = setTimeout(next, 140);
        }
        next();
      }
      function reset(){
        if (tid) clearTimeout(tid);
        running = false;
        boot.textContent = "";
      }
      el.addEventListener("mouseenter", play);
      el.addEventListener("mouseleave", reset);
      el.addEventListener("focusin", play);
      el.addEventListener("focusout", reset);
    });
  }

  /* ---------- 5) Scroll reveal ---------- */
  function initScrollReveal() {
    var selector = [
      ".phase",".sectionHead",".phase6",".next",".roadmapList article",
      ".downloadBox",".notice",".founder",".contribCall",".terminalCard",".factbar"
    ].join(",");
    var els = Array.prototype.slice.call(document.querySelectorAll(selector));
    if (!els.length) return;
    if (reduceMotion) {
      els.forEach(function(el){ el.classList.add("js-reveal","revealed"); });
      return;
    }
    var groupCounts = new WeakMap();
    els.forEach(function(el){
      el.classList.add("js-reveal");
      var parent = el.parentElement;
      var idx = groupCounts.get(parent) || 0;
      el.style.transitionDelay = Math.min(idx * 90, 360) + "ms";
      groupCounts.set(parent, idx + 1);
    });
    if (!("IntersectionObserver" in window)) {
      els.forEach(function(el){ el.classList.add("revealed"); });
      return;
    }
    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting){
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function(el){ observer.observe(el); });
  }

  /* ---------- 6) Mobile menu ---------- */
  function initMobileMenu() {
    var nav = document.querySelector(".nav");
    if (!nav) return;
    var navlinks = nav.querySelector(".navlinks");
    if (!navlinks) return;

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "navToggle";
    toggle.setAttribute("aria-expanded","false");
    toggle.setAttribute("aria-controls","mobileMenu");
    toggle.setAttribute("aria-label","فتح القائمة");
    toggle.textContent = "☰";

    var menu = document.createElement("div");
    menu.className = "mobileMenu";
    menu.id = "mobileMenu";

    Array.prototype.forEach.call(navlinks.querySelectorAll("a"), function(a){
      menu.appendChild(a.cloneNode(true));
    });

    nav.appendChild(toggle);
    nav.appendChild(menu);

    function closeMenu(){
      menu.classList.remove("open");
      toggle.setAttribute("aria-expanded","false");
      toggle.textContent = "☰";
      toggle.setAttribute("aria-label","فتح القائمة");
    }
    function openMenu(){
      menu.classList.add("open");
      toggle.setAttribute("aria-expanded","true");
      toggle.textContent = "✕";
      toggle.setAttribute("aria-label","إغلاق القائمة");
    }
    toggle.addEventListener("click", function(){
      if (menu.classList.contains("open")) closeMenu(); else openMenu();
    });
    Array.prototype.forEach.call(menu.querySelectorAll("a"), function(a){
      a.addEventListener("click", closeMenu);
    });
    document.addEventListener("keydown", function(e){
      if (e.key === "Escape") closeMenu();
    });
  }

  function init() {
    initTicker();
    initMatrix();
    initBootOverlay();
    initTerminalHover();
    initPhaseHover();
    initScrollReveal();
    initMobileMenu();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
