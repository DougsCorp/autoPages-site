(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduceMotion.matches) return;

  var hero = document.getElementById("hero");
  var canvas = document.getElementById("hero-particles");
  if (!hero || !canvas) return;

  var ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  var PARTICLE_DENSITY = 0.00013;
  var BG_PARTICLE_DENSITY = 0.000045;
  var MAX_PARTICLES = 240;
  var MAX_BG = 90;
  var MOUSE_RADIUS = 180;
  var RETURN_SPEED = 0.08;
  var DAMPING = 0.9;
  var REPULSION_STRENGTH = 1.2;
  var ORANGE = { r: 255, g: 106, b: 0 };
  var ORANGE_SOFT = { r: 255, g: 140, b: 26 };

  var particles = [];
  var bgParticles = [];
  var mouse = { x: -1000, y: -1000, isActive: false };
  var width = 0;
  var height = 0;
  var dpr = 1;
  var frameId = 0;
  var visible = true;
  var resizeTimer = 0;

  function randomRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  function initParticles() {
    var area = width * height;
    var isMobile = width < 768;
    var density = isMobile ? PARTICLE_DENSITY * 0.55 : PARTICLE_DENSITY;
    var bgDensity = isMobile ? BG_PARTICLE_DENSITY * 0.6 : BG_PARTICLE_DENSITY;
    var count = Math.min(MAX_PARTICLES, Math.floor(area * density));
    var bgCount = Math.min(MAX_BG, Math.floor(area * bgDensity));
    var next = [];
    var i;
    var x;
    var y;
    var size;

    for (i = 0; i < count; i++) {
      x = Math.random() * width;
      y = Math.random() * height;
      size = randomRange(0.7, 3.2);
      next.push({
        x: x,
        y: y,
        originX: x,
        originY: y,
        vx: 0,
        vy: 0,
        size: size,
        isOrange: size >= 1.85,
        angle: Math.random() * Math.PI * 2,
      });
    }
    particles = next;

    var bg = [];
    for (i = 0; i < bgCount; i++) {
      bg.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        size: randomRange(0.4, 1.4),
        alpha: randomRange(0.12, 0.4),
        phase: Math.random() * Math.PI * 2,
      });
    }
    bgParticles = bg;
  }

  function resize() {
    var rect = hero.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initParticles();
  }

  function animate(time) {
    if (!visible) {
      frameId = 0;
      return;
    }

    ctx.clearRect(0, 0, width, height);

    var centerX = width / 2;
    var centerY = height / 2;
    var pulseOpacity = Math.sin(time * 0.0008) * 0.03 + 0.09;
    var glowRadius = Math.max(width, height) * 0.65;
    var gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius);
    gradient.addColorStop(0, "rgba(" + ORANGE.r + "," + ORANGE.g + "," + ORANGE.b + "," + pulseOpacity + ")");
    gradient.addColorStop(0.45, "rgba(" + ORANGE_SOFT.r + "," + ORANGE_SOFT.g + "," + ORANGE_SOFT.b + "," + pulseOpacity * 0.35 + ")");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    var i;
    var p;
    var twinkle;
    var currentAlpha;

    ctx.fillStyle = "#ffffff";
    for (i = 0; i < bgParticles.length; i++) {
      p = bgParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      twinkle = Math.sin(time * 0.002 + p.phase) * 0.5 + 0.5;
      currentAlpha = p.alpha * (0.3 + 0.7 * twinkle);
      ctx.globalAlpha = currentAlpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    var j;
    var p1;
    var p2;
    var dx;
    var dy;
    var distance;
    var distSq;
    var minDist;
    var dist;
    var nx;
    var ny;
    var overlap;
    var force;
    var repulsion;
    var springDx;
    var springDy;
    var dvx;
    var dvy;
    var velocityAlongNormal;
    var m1;
    var m2;
    var impulseMagnitude;
    var impulseX;
    var impulseY;
    var velocity;
    var opacity;
    var color;

    for (i = 0; i < particles.length; i++) {
      p = particles[i];
      dx = mouse.x - p.x;
      dy = mouse.y - p.y;
      distance = Math.sqrt(dx * dx + dy * dy);

      if (mouse.isActive && distance < MOUSE_RADIUS && distance > 0.01) {
        force = (MOUSE_RADIUS - distance) / MOUSE_RADIUS;
        repulsion = force * REPULSION_STRENGTH;
        p.vx -= (dx / distance) * repulsion * 5;
        p.vy -= (dy / distance) * repulsion * 5;
      }

      p.angle += 0.008;
      p.vx += Math.sin(p.angle + time * 0.0004) * 0.012;
      p.vy += Math.cos(p.angle + time * 0.00035) * 0.012;

      springDx = p.originX - p.x;
      springDy = p.originY - p.y;
      p.vx += springDx * RETURN_SPEED;
      p.vy += springDy * RETURN_SPEED;
    }

    for (i = 0; i < particles.length; i++) {
      p1 = particles[i];
      for (j = i + 1; j < particles.length; j++) {
        p2 = particles[j];
        dx = p2.x - p1.x;
        dy = p2.y - p1.y;
        distSq = dx * dx + dy * dy;
        minDist = p1.size + p2.size;
        if (distSq >= minDist * minDist) continue;

        dist = Math.sqrt(distSq);
        if (dist <= 0.01) continue;

        nx = dx / dist;
        ny = dy / dist;
        overlap = minDist - dist;
        p1.x -= nx * overlap * 0.5;
        p1.y -= ny * overlap * 0.5;
        p2.x += nx * overlap * 0.5;
        p2.y += ny * overlap * 0.5;

        dvx = p1.vx - p2.vx;
        dvy = p1.vy - p2.vy;
        velocityAlongNormal = dvx * nx + dvy * ny;
        if (velocityAlongNormal <= 0) continue;

        m1 = p1.size;
        m2 = p2.size;
        impulseMagnitude = (-(1 + 0.85) * velocityAlongNormal) / (1 / m1 + 1 / m2);
        impulseX = impulseMagnitude * nx;
        impulseY = impulseMagnitude * ny;
        p1.vx += impulseX / m1;
        p1.vy += impulseY / m1;
        p2.vx -= impulseX / m2;
        p2.vy -= impulseY / m2;
      }
    }

    for (i = 0; i < particles.length; i++) {
      p = particles[i];
      p.vx *= DAMPING;
      p.vy *= DAMPING;
      p.x += p.vx;
      p.y += p.vy;

      velocity = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      opacity = Math.min(0.28 + velocity * 0.12, 0.95);
      color = p.isOrange ? ORANGE : { r: 255, g: 255, b: 255 };

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + color.r + "," + color.g + "," + color.b + "," + opacity + ")";
      ctx.fill();
    }

    frameId = requestAnimationFrame(animate);
  }

  function start() {
    if (!frameId) frameId = requestAnimationFrame(animate);
  }

  function stop() {
    if (frameId) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    }
  }

  function onPointerMove(e) {
    var rect = hero.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.isActive = true;
  }

  function onPointerLeave() {
    mouse.isActive = false;
  }

  hero.addEventListener("pointermove", onPointerMove, { passive: true });
  hero.addEventListener("pointerleave", onPointerLeave);

  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      function (entries) {
        visible = entries[0] && entries[0].isIntersecting;
        if (visible) start();
        else stop();
      },
      { threshold: 0.05 }
    ).observe(hero);
  }

  resize();
  start();
})();
