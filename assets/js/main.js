/* Marlin — shared site behaviour (no dependencies) */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- The marlin (swordfish) drawing ---------- */

  // Facing right. viewBox 0 0 420 140. Gradients are shared by every copy.
  function fishSVG(cls) {
    return (
      '<svg class="swordfish ' + (cls || "") + '" viewBox="0 0 420 140" aria-hidden="true" focusable="false">' +
        '<defs>' +
          '<linearGradient id="mf-body" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#0a2c66"/>' +
            '<stop offset=".38" stop-color="#1c66cf"/>' +
            '<stop offset=".6" stop-color="#6cc4ff"/>' +
            '<stop offset="1" stop-color="#eaf8ff"/>' +
          '</linearGradient>' +
          '<linearGradient id="mf-fin" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0" stop-color="#46e6ff"/>' +
            '<stop offset="1" stop-color="#1450b8"/>' +
          '</linearGradient>' +
          '<linearGradient id="mf-bill" x1="0" y1="0" x2="1" y2="0">' +
            '<stop offset="0" stop-color="#2a6fd0"/>' +
            '<stop offset="1" stop-color="#bfe9ff"/>' +
          '</linearGradient>' +
        '</defs>' +
        '<g class="tail"><path fill="url(#mf-fin)" d="M88,69 C72,63 58,48 36,14 C51,40 58,57 60,72 C58,87 51,104 36,130 C58,96 72,81 88,75 Z"/></g>' +
        '<path class="sail" fill="url(#mf-fin)" opacity=".92" d="M252,48 C247,30 251,14 260,3 C233,10 196,22 168,35 C151,42 136,46 122,50 Z"/>' +
        '<path fill="url(#mf-fin)" opacity=".85" d="M108,61 C103,55 98,52 93,50 C97,56 99,60 99,64 Z"/>' +
        '<path fill="url(#mf-fin)" opacity=".85" d="M142,89 C133,99 121,105 109,108 C119,100 125,94 127,89 Z"/>' +
        '<path fill="url(#mf-bill)" d="M314,64 L419,69.5 L314,76 Z"/>' +
        '<path fill="url(#mf-body)" d="M80,72 C106,52 172,42 240,46 C278,48 304,58 322,68 C306,80 278,90 238,92 C172,96 108,90 80,72 Z"/>' +
        '<g stroke="#ffffff" stroke-opacity=".16" stroke-width="3" stroke-linecap="round">' +
          '<path d="M150,52 L147,68"/><path d="M174,49 L171,67"/><path d="M198,48 L195,67"/>' +
          '<path d="M222,47 L219,66"/><path d="M246,48 L243,66"/>' +
        '</g>' +
        '<path d="M92,73 C150,71 232,69 312,69" fill="none" stroke="#ffffff" stroke-opacity=".38" stroke-width="1.3"/>' +
        '<path d="M284,57 C277,65 277,76 284,85" fill="none" stroke="#031026" stroke-opacity=".35" stroke-width="2"/>' +
        '<path class="pec" fill="url(#mf-fin)" d="M264,80 C252,94 236,106 216,114 C234,100 244,90 250,80 Z"/>' +
        '<circle cx="299" cy="64" r="4.4" fill="#031026"/>' +
        '<circle cx="300.6" cy="62.6" r="1.4" fill="#ffffff"/>' +
      "</svg>"
    );
  }
  window.MarlinFish = fishSVG;

  document.querySelectorAll("[data-fish]").forEach(function (el) {
    el.insertAdjacentHTML("afterbegin", fishSVG(el.getAttribute("data-fish")));
  });

  /* ---------- Navigation ---------- */

  var nav = document.querySelector(".nav");
  if (nav) {
    var onScroll = function () { nav.classList.toggle("scrolled", window.scrollY > 24); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    var toggle = nav.querySelector(".nav-toggle");
    if (toggle) {
      toggle.addEventListener("click", function () {
        var open = nav.classList.toggle("open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
      nav.querySelectorAll(".nav-links a").forEach(function (a) {
        a.addEventListener("click", function () {
          nav.classList.remove("open");
          toggle.setAttribute("aria-expanded", "false");
        });
      });
    }
  }

  /* ---------- Syntax highlighting for Marlin ---------- */

  var KEYWORDS = toSet("func return if else for in while step parallel marl let struct import from as public private break continue extern true false");
  var TYPES = toSet("int int8 int16 int32 int64 uint uint8 uint16 uint32 uint64 float float32 float64 bool char string void list matrix task");
  var BUILTINS = toSet("print await push pop len free str to_int to_float sqrt sin cos tan exp log pow min max abs floor ceil round zeros ones fill sum matmul transpose rows cols shape time scan");

  function toSet(s) { var o = Object.create(null); s.split(" ").forEach(function (w) { o[w] = true; }); return o; }

  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  var TOKEN = /(\/\/[^\n]*)|("(?:\\.|[^"\\\n])*")|('(?:\\.|[^'\\\n])')|(@[A-Za-z_]\w*)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)|(->|\.\.|[{}()\[\];,<>=+\-*\/%!&|:.])/g;

  function highlight(src) {
    var out = "", last = 0, m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(src))) {
      out += esc(src.slice(last, m.index));
      last = TOKEN.lastIndex;
      var t = m[0], cls = null;
      if (m[1]) cls = "com";
      else if (m[2] || m[3]) cls = "str";
      else if (m[4]) cls = "ann";
      else if (m[5]) cls = "num";
      else if (m[6]) {
        if (KEYWORDS[t]) cls = "kw";
        else if (TYPES[t]) cls = "type";
        else if (/^[A-Z]/.test(t)) cls = "type";
        else if (/^\s*\(/.test(src.slice(last, last + 8))) cls = BUILTINS[t] ? "fn builtin" : "fn";
      } else if (m[7]) cls = "op";
      out += cls ? '<span class="tok-' + cls + '">' + esc(t) + "</span>" : esc(t);
    }
    return out + esc(src.slice(last));
  }

  document.querySelectorAll("pre.code code.marl").forEach(function (code) {
    var src = code.textContent.replace(/^\n+|\s+$/g, "");
    code.innerHTML = highlight(src);
  });

  /* ---------- Copy buttons ---------- */

  document.querySelectorAll(".copy").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var target = btn.getAttribute("data-copy");
      var text;
      if (target) {
        var el = document.querySelector(target);
        text = el ? el.textContent : "";
      } else {
        var win = btn.closest(".code-window");
        var pre = win && win.querySelector("pre");
        text = pre ? pre.innerText : "";
      }
      // Terminal blocks: copy commands only, without prompts and output lines
      // (and only from the tab that is showing).
      if (btn.hasAttribute("data-commands")) {
        var win2 = btn.closest(".code-window");
        text = Array.prototype.filter.call(win2.querySelectorAll(".cmd"), function (c) { return !c.closest("[hidden]"); })
          .map(function (c) { return c.textContent; }).join("\n");
      }
      var done = function () {
        btn.classList.add("done");
        var old = btn.textContent;
        btn.textContent = "Copied";
        setTimeout(function () { btn.classList.remove("done"); btn.textContent = old; }, 1600);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text.trim()).then(done, function () { fallbackCopy(text.trim()); done(); });
      } else {
        fallbackCopy(text.trim());
        done();
      }
    });
  });

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }

  /* ---------- Tabs ---------- */

  document.querySelectorAll("[data-tabs]").forEach(function (root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(tab); });
      tab.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowDown" || e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (next) { e.preventDefault(); select(next, true); }
      });
    });
  });

  /* ---------- Install: show the visitor's operating system first ---------- */

  var os = (function () {
    var p = ((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent || "").toLowerCase();
    if (p.indexOf("win") >= 0) return "windows";
    if (p.indexOf("mac") >= 0) return "macos";
    return "linux";
  })();
  document.querySelectorAll('[role="tab"][data-os="' + os + '"]').forEach(function (tab) { tab.click(); });
  document.querySelectorAll("[data-os-text-" + os + "]").forEach(function (el) {
    el.textContent = el.getAttribute("data-os-text-" + os);
  });
  document.querySelectorAll('[data-os-card="' + os + '"]').forEach(function (el) { el.classList.add("current"); });

  /* ---------- Card glow follows the pointer ---------- */

  document.querySelectorAll(".card").forEach(function (card) {
    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", (e.clientX - r.left) + "px");
      card.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  });

  /* ---------- Reveal on scroll, animated bars ---------- */

  var revealables = document.querySelectorAll(".reveal, .bars");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        if (en.target.classList.contains("bars")) fillBars(en.target);
        io.unobserve(en.target);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) {
      el.classList.add("in");
      if (el.classList.contains("bars")) fillBars(el);
    });
  }

  function fillBars(root) {
    root.querySelectorAll(".bar i").forEach(function (i) { i.style.width = i.getAttribute("data-w") + "%"; });
  }

  /* ---------- Docs: sidebar + scrollspy ---------- */

  var sidebar = document.querySelector(".sidebar");
  if (sidebar) {
    var sbToggle = document.querySelector(".sidebar-toggle");
    if (sbToggle) {
      sbToggle.addEventListener("click", function () {
        var open = sidebar.classList.toggle("open");
        sbToggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
      sidebar.querySelectorAll("a").forEach(function (a) {
        a.addEventListener("click", function () { sidebar.classList.remove("open"); sbToggle.setAttribute("aria-expanded", "false"); });
      });
    }

    var links = Array.prototype.slice.call(sidebar.querySelectorAll('a[href^="#"]'));
    var sections = links.map(function (a) { return document.querySelector(a.getAttribute("href")); }).filter(Boolean);
    var spy = function () {
      var y = window.scrollY + 120, current = sections[0];
      sections.forEach(function (s) { if (s.offsetTop <= y) current = s; });
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) current = sections[sections.length - 1];
      links.forEach(function (a) { a.classList.toggle("active", current && a.getAttribute("href") === "#" + current.id); });
    };
    spy();
    window.addEventListener("scroll", spy, { passive: true });
  }

  /* ---------- Footer year ---------- */

  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
