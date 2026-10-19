/* Marlin — hero ocean: drifting plankton, rising bubbles and a marlin that darts across. */
(function () {
  "use strict";

  var hero = document.querySelector(".hero");
  if (!hero) return;

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canvas = hero.querySelector("canvas.ocean");
  var ctx = canvas && canvas.getContext("2d");
  var fishEl = hero.querySelector(".hero-fish");
  var school = hero.querySelector(".school");

  var W = 0, H = 0, DPR = 1;
  var plankton = [], bubbles = [];
  var running = true, visible = true;

  function resize() {
    var r = hero.getBoundingClientRect();
    W = r.width; H = r.height;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas) {
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    var target = Math.round(Math.min(140, (W * H) / 9000));
    while (plankton.length < target) plankton.push(newPlankton(true));
    plankton.length = target;
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function newPlankton(anywhere) {
    return {
      x: rand(0, W), y: anywhere ? rand(0, H) : H + 10,
      r: rand(0.5, 1.9), vx: rand(-0.08, 0.08), vy: rand(-0.25, -0.05),
      a: rand(0.15, 0.6), tw: rand(0, Math.PI * 2)
    };
  }

  function addBubble(x, y, big) {
    if (bubbles.length > 260) return;
    bubbles.push({
      x: x + rand(-6, 6), y: y + rand(-6, 6),
      r: big ? rand(2.5, 6) : rand(1, 3.2),
      vx: rand(-0.4, 0.4), vy: rand(-1.4, -0.5),
      life: 1, decay: rand(0.004, 0.011), wob: rand(0, Math.PI * 2)
    });
  }

  /* ---------- Background school (slow, far away) ---------- */

  if (school && window.MarlinFish && !reduceMotion) {
    var far = [
      { top: 22, size: 120, dur: 46, delay: -8, rtl: false },
      { top: 58, size: 80, dur: 38, delay: -30, rtl: true },
      { top: 72, size: 150, dur: 60, delay: -20, rtl: false },
      { top: 36, size: 64, dur: 32, delay: -4, rtl: true }
    ];
    far.forEach(function (f) {
      var d = document.createElement("div");
      d.className = "far-fish" + (f.rtl ? " rtl" : "");
      d.style.top = f.top + "%";
      d.style.width = f.size + "px";
      d.style.animationDuration = f.dur + "s";
      d.style.animationDelay = f.delay + "s";
      d.style.setProperty("--tail-speed", "0.9s");
      d.innerHTML = window.MarlinFish();
      school.appendChild(d);
    });
  }

  /* ---------- The hero marlin ---------- */

  var fish = null;
  if (fishEl && window.MarlinFish) {
    fishEl.insertAdjacentHTML("beforeend", window.MarlinFish());
    fish = {
      el: fishEl, active: false, start: 0, dur: 2600, dir: 1, y0: 0, amp: 0,
      next: performance.now() + 700, w: 0
    };
  }

  function launch(now) {
    fish.w = fish.el.getBoundingClientRect().width || 500;
    fish.dir = Math.random() < 0.7 ? 1 : -1;
    fish.y0 = H * rand(0.18, 0.62);
    fish.amp = rand(18, 46);
    fish.dur = rand(1900, 2900) * Math.max(0.75, Math.min(1.25, W / 1400));
    fish.start = now;
    fish.active = true;
    fish.el.classList.add("dashing");
    fish.el.style.setProperty("--tail-speed", "0.16s");
  }

  // Slow in, burst through the middle, glide out.
  function ease(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function updateFish(now) {
    if (!fish) return;
    if (!fish.active) {
      if (now >= fish.next) launch(now);
      else return;
    }
    var t = (now - fish.start) / fish.dur;
    if (t >= 1) {
      fish.active = false;
      fish.el.classList.remove("dashing");
      fish.el.style.setProperty("--tail-speed", "0.6s");
      fish.el.style.transform = "translate3d(-200%, 0, 0)";
      fish.next = now + rand(1400, 3600);
      return;
    }
    var e = ease(t);
    var from = -fish.w * 1.1, to = W + fish.w * 0.15;
    var x = fish.dir > 0 ? from + (to - from) * e : to - (to - from) * e - fish.w * 0.05;
    var phase = t * Math.PI * 2.2;
    var y = fish.y0 + Math.sin(phase) * fish.amp;
    var slope = Math.cos(phase) * fish.amp * 2.2 * Math.PI / ((to - from) * 0.9);
    var angle = Math.atan(slope) * (180 / Math.PI) * 0.8;
    var speed = Math.abs(t < 0.5 ? 12 * t * t : 12 * Math.pow(1 - t, 2)); // derivative of ease
    var squash = 1 + Math.min(speed, 3) * 0.02;

    fish.el.style.transform =
      "translate3d(" + x.toFixed(1) + "px," + (y - fish.w * 0.17).toFixed(1) + "px,0)" +
      " rotate(" + (angle * fish.dir).toFixed(2) + "deg)" +
      " scale(" + (fish.dir * squash).toFixed(3) + "," + (1 / squash).toFixed(3) + ")";

    // Wake: bubbles from the tail, more of them at full speed.
    var tailX = fish.dir > 0 ? x + fish.w * 0.12 : x + fish.w * 0.88;
    var count = speed > 1.2 ? 3 : speed > 0.5 ? 2 : 1;
    for (var i = 0; i < count; i++) addBubble(tailX, y, Math.random() < 0.25);
  }

  /* ---------- Loop ---------- */

  function frame(now) {
    if (!running) return;
    if (visible && !document.hidden) {
      if (ctx) draw(now);
      updateFish(now);
    }
    requestAnimationFrame(frame);
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);

    for (var i = 0; i < plankton.length; i++) {
      var p = plankton[i];
      p.x += p.vx; p.y += p.vy; p.tw += 0.02;
      if (p.y < -10 || p.x < -10 || p.x > W + 10) { plankton[i] = newPlankton(false); continue; }
      ctx.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(p.tw));
      ctx.fillStyle = "#bfefff";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }

    // A few ambient bubbles rising from below.
    if (Math.random() < 0.06) addBubble(rand(0, W), H + 8, Math.random() < 0.3);

    for (var j = bubbles.length - 1; j >= 0; j--) {
      var b = bubbles[j];
      b.wob += 0.08;
      b.x += b.vx + Math.sin(b.wob) * 0.3;
      b.y += b.vy;
      b.vx *= 0.98;
      b.life -= b.decay;
      if (b.life <= 0 || b.y < -20) { bubbles.splice(j, 1); continue; }
      ctx.globalAlpha = Math.max(0, b.life) * 0.75;
      ctx.strokeStyle = "rgba(200, 245, 255, 0.9)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.beginPath(); ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, Math.max(0.6, b.r * 0.25), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Click anywhere in the hero to call the marlin back.
  hero.addEventListener("click", function (e) {
    if (!fish || fish.active || e.target.closest("a, button")) return;
    fish.next = 0;
  });

  // Bubbles follow the pointer a little.
  var lastMove = 0;
  hero.addEventListener("pointermove", function (e) {
    var now = performance.now();
    if (now - lastMove < 60 || reduceMotion) return;
    lastMove = now;
    var r = hero.getBoundingClientRect();
    addBubble(e.clientX - r.left, e.clientY - r.top, false);
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0 }).observe(hero);
  }

  window.addEventListener("resize", resize);
  resize();

  if (reduceMotion) {
    // A still marlin resting on the right; no animation.
    running = false;
    if (fish) {
      fish.w = fishEl.getBoundingClientRect().width || 500;
      fishEl.style.transform = "translate3d(" + (W - fish.w * 0.95) + "px," + (H * 0.62) + "px,0) rotate(-6deg)";
      fishEl.style.opacity = "0.5";
    }
    if (ctx) {
      for (var k = 0; k < plankton.length; k++) {
        var p = plankton[k];
        ctx.globalAlpha = p.a; ctx.fillStyle = "#bfefff";
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
    }
    return;
  }

  requestAnimationFrame(frame);
})();
