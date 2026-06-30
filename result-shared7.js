// ============================================================
// SECTION 3 — FMS_ARCHETYPES (share card data)
// ============================================================

var FMS_ARCHETYPES = {
  'CEO': {
    headline: 'THIS IS WHAT A\nDECISION \nSMELLS LIKE.',
    desc:     "You replied to that email in 4 minutes and you're calling it work-life balance.",
    perfume:  'Concrete — Comme des Garçons',
    img:      'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/6997337efd1740fcd5bbd50a_ceo-concrete.svg',
    bg:       '#a43f35',
    accent:   '#000000',
    text:     '#f8f8f8'
  },
  'JAPAN': {
    headline: 'YOU ARE\nINSISTENTLY \nCALM.',
    desc:      "You said five words in that meeting. Everyone's still quoting you.",
    perfume:  'Dirty Hinoki — Heretic Parfum',
    img:      'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69e88e6c2d41e3859e44d7c7_hinoki-dirty.png',
    bg:       '#cac88f',
    accent:   '#5d663c',
    text:     '#000000'
  },
  'HUG': {
    headline: 'YOU ARE\nA HUG.',
    desc:     "Someone is mid-breakdown right now and texting you instead of their therapist.",
    perfume:  'Eau Duelle — Diptyque',
    img:      'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69a552a3ad178c4e36ba6acc_hug-eau.svg',
    bg:       '#7e3d30',
    accent:   '#f0c8a8',
    text:     '#fdf0e8'
  },
  'OFFGRID': {
    headline: 'YOU ARE\nSECRETLY PLANNING\nTO DISAPPEAR.',
    desc:      "Your phone is at 12% and you're somehow relieved about it.",
    perfume:  'Coven — Andrea Maack',
    img:      'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69a5595ac9e0cf46d4776711_offgrid-coven.svg',
    bg:       '#363636',
    accent:   '#ffffff',
    text:     '#e8f0e0'
  },
  'OUTOFTIME': {
    headline: 'YOU ARE\nCHRONICALLY \nELSEWHERE.',
    desc:     "You've read the message. You have no plans to respond. The universe approves this.",
    perfume:  'Gris Clair — Serge Lutens',
    img:      'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69a55e5c6cacbdd277d526dd_outoftime-gris.svg',
    bg:       '#604c65',
    accent:   '#dfdfdb',
    text:     '#f5eefa'
  },
  'SUMMER': {
    headline: 'YOU ARE\nPATHOLOGICALLY \nCHILL.',
    desc:      "You missed the flight and somehow made it the best part of the trip.",
    perfume:  'Solo Vulcan — Loewe',
    img:      'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69a564cad5ce2b482c477798_summer-solo.svg',
    bg:       '#a43f35',
    accent:   '#cac88f',
    text:     '#f6f6e9'
  },
  'THERAPIST': {
    headline: 'YOU ARE \nDANGEROUSLY\nEMPATHETIC.',
    desc:      "Someone's whole week made sense after just five minutes talking with you.",
    perfume:  'Black Tea — Jil Sander',
    img:      'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69a567233c9199821e9d3cde_therapist-blacktea.svg',
    bg:       '#8f9a54',
    accent:   '#1e2208',
    text:     '#f0f0e0'
  }
};

// ============================================================
// SECTION 6 — HELPER FUNCTIONS
// ============================================================

function fmsGetKey() {
  return (sessionStorage.getItem('quiz_result') || localStorage.getItem('quiz_result') || '').toUpperCase() || null;
}
function fmsGetArch() {
  var k = fmsGetKey();
  return k ? FMS_ARCHETYPES[k] || null : null;
}
function fmsShareText() {
  var a = fmsGetArch();
  var url = 'https://www.findmysmell.com/result';
  return a ? a.headline.replace('\n', ' ') + '\n' + a.tagline + '\n\nDiscover your scent archetype → ' + url : url;
}
function fmsDownloadCard(canvas, filename) {
  var k = fmsGetKey() || 'result';
  var a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = filename || ('findmysmell-' + k.toLowerCase() + '.png');
  a.click();
}

// ============================================================
// SECTION 7A — SHARED DRAW HELPERS
// ============================================================

function fmsDrawBase(ctx, arch, S, PAD) {
  ctx.fillStyle = arch.bg;
  ctx.fillRect(0, 0, S, S);

  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.08;
  for (var gy = 0; gy < S; gy += 2) {
    for (var gx = 0; gx < S; gx += 2) {
      var gv = Math.floor(Math.random() * 255);
      ctx.fillStyle = 'rgb(' + gv + ',' + gv + ',' + gv + ')';
      ctx.fillRect(gx, gy, 2, 2);
    }
  }
  ctx.restore();

  ctx.font = '400 26px Inconsolata,monospace';
  ctx.fillStyle = arch.accent;
  ctx.globalAlpha = 0.55;
  ctx.fillText('FIND MY SMELL  ·  Perfume Personality Quiz', PAD, 78);
  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.moveTo(PAD, 96);
  ctx.lineTo(S - PAD, 96);
  ctx.strokeStyle = arch.accent;
  ctx.globalAlpha = 0.2;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function fmsDrawFooter(ctx, arch, S, PAD) {
  ctx.beginPath();
  ctx.moveTo(PAD, S - 90);
  ctx.lineTo(S - PAD, S - 90);
  ctx.strokeStyle = arch.accent;
  ctx.globalAlpha = 0.2;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.font = '400 22px Inconsolata,monospace';
  ctx.fillStyle = arch.accent;
  ctx.globalAlpha = 0.42;
  ctx.fillText(' find yours now on  ·  findmysmell.com ', PAD, S - 44);
  ctx.globalAlpha = 1;
}

function fmsDrawFullRule(ctx, arch, S, PAD, y) {
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(S - PAD, y);
  ctx.strokeStyle = arch.accent;
  ctx.globalAlpha = 0.2;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function fmsWrapText(ctx, text, x, y, maxW, lineH) {
  var words = text.split(' '), line = '', ly = y;
  words.forEach(function(w) {
    var t = (line + ' ' + w).trim();
    if (ctx.measureText(t).width > maxW && line) {
      ctx.fillText(line, x, ly);
      line = w; ly += lineH;
    } else { line = t; }
  });
  if (line) ctx.fillText(line, x, ly);
  return ly + lineH;
}

// Load multiple images in parallel, returns map of src -> Image (or null on error)
function fmsLoadImages(sources, callback) {
  var images = {};
  var total = sources.length;
  if (total === 0) { callback(images); return; }
  var loaded = 0;
  sources.forEach(function(src) {
    if (!src) { images[src] = null; loaded++; if (loaded === total) callback(images); return; }
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      images[src] = img; loaded++;
      if (loaded === total) callback(images);
    };
    img.onerror = function() {
      images[src] = null; loaded++;
      if (loaded === total) callback(images);
    };
    img.src = src;
  });
}

// Draw an image clipped to a circle
function fmsDrawCircleImg(ctx, img, cx, cy, r, alpha) {
  if (!img) return;
  ctx.save();
  ctx.globalAlpha = alpha || 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  var nw = img.naturalWidth || img.width || r * 2;
  var nh = img.naturalHeight || img.height || r * 2;
  var scale = Math.max((r * 2) / nw, (r * 2) / nh);
  var dw = nw * scale, dh = nh * scale;
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.restore();
}

// Draw a bottle image fitted into a rect
function fmsDrawBottleImg(ctx, img, x, y, w, h, alpha) {
  if (!img) return;
  ctx.save();
  ctx.globalAlpha = alpha || 0.92;
  var nw = img.naturalWidth || img.width || w;
  var nh = img.naturalHeight || img.height || h;
  var scale = Math.min(w / nw, h / nh);
  var dw = nw * scale, dh = nh * scale;
  var dx = x + (w - dw) / 2, dy = y + (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

// ============================================================
// SECTION 7 — UNIFIED SHARE CARD (replaces old Card 1/2/3)
// Works for EN/FR/RU automatically — pulls text from FMS_ARCHETYPES
// which already has headline/tagline/scene per language.
// ============================================================

// Particle theme per archetype — maps to the mood of each scene.
var FMS_PARTICLE_THEMES = {
  CEO:        { type: 'frost',  color: '255,255,255', density: 40, speed: 0.15 },
  JAPAN:      { type: 'dust',   color: '255,255,255', density: 25, speed: 0.08 },
  HUG:        { type: 'warm',   color: '255,220,180', density: 30, speed: 0.10 },
  OFFGRID:    { type: 'smoke',  color: '255,255,255', density: 35, speed: 0.12 },
  OUTOFTIME:  { type: 'smoke',  color: '220,220,235', density: 45, speed: 0.07 },
  SUMMER:     { type: 'sparkle',color: '255,250,220', density: 35, speed: 0.18 },
  THERAPIST:  { type: 'dust',   color: '255,255,255', density: 28, speed: 0.09 }
};

// Draws ambient particles (dust/smoke/frost/sparkle) around a center point
function fmsDrawParticles(ctx, theme, cx, cy, radius, S) {
  var n = theme.density;
  for (var i = 0; i < n; i++) {
    var seed = i * 137.5; // golden angle distribution
    var angle = (seed % 360) * Math.PI / 180;
    var dist = radius * (0.3 + (i % 7) / 7 * 0.9);
    var px = cx + Math.cos(angle) * dist + (Math.sin(i * 12.9) * 30);
    var py = cy + Math.sin(angle) * dist * 1.3 + (Math.cos(i * 7.3) * 40);

    var size = theme.type === 'smoke' ? (8 + (i % 5) * 6) :
               theme.type === 'sparkle' ? (1.5 + (i % 3)) :
               theme.type === 'frost' ? (2 + (i % 4) * 1.5) :
               (1 + (i % 3) * 1.2);

    var alpha = theme.type === 'smoke' ? (0.04 + (i % 4) * 0.02) :
                theme.type === 'sparkle' ? (0.5 + (i % 3) * 0.15) :
                (0.15 + (i % 5) * 0.06);

    ctx.beginPath();
    if (theme.type === 'sparkle') {
      // small 4-point star
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(seed);
      ctx.moveTo(0, -size * 2); ctx.lineTo(size * 0.5, -size * 0.5);
      ctx.lineTo(size * 2, 0); ctx.lineTo(size * 0.5, size * 0.5);
      ctx.lineTo(0, size * 2); ctx.lineTo(-size * 0.5, size * 0.5);
      ctx.lineTo(-size * 2, 0); ctx.lineTo(-size * 0.5, -size * 0.5);
      ctx.closePath();
      ctx.restore();
    } else {
      ctx.arc(px, py, size, 0, Math.PI * 2);
    }
    ctx.fillStyle = 'rgba(' + theme.color + ',' + alpha + ')';
    ctx.fill();
  }
}

// Soft radial glow behind the bottle
function fmsDrawGlow(ctx, cx, cy, r, color) {
  var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0, 'rgba(' + color + ',0.22)');
  grad.addColorStop(0.5, 'rgba(' + color + ',0.08)');
  grad.addColorStop(1, 'rgba(' + color + ',0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function fmsDrawShareCard(canvas, callback) {
  var arch = fmsGetArch();
  var k = fmsGetKey();
  var fullArch = window.FMS_FULL_ARCH && k ? window.FMS_FULL_ARCH[k] : null;
  if (!arch) { if (callback) callback(); return; }

  var W = 1080, H = 1920;
  canvas.width = W;
  canvas.height = H;
  var ctx = canvas.getContext('2d');
  var PAD = 72;

  // 1. Solid background fill
  ctx.fillStyle = arch.bg;
  ctx.fillRect(0, 0, W, H);

  // 2. Subtle grain
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.06;
  for (var gy = 0; gy < H; gy += 3) {
    for (var gx = 0; gx < W; gx += 3) {
      var gv = Math.floor(Math.random() * 255);
      ctx.fillStyle = 'rgb(' + gv + ',' + gv + ',' + gv + ')';
      ctx.fillRect(gx, gy, 3, 3);
    }
  }
  ctx.restore();

  // 3. Top brand label
  ctx.font = '400 22px Inconsolata,monospace';
  ctx.fillStyle = arch.accent;
  ctx.globalAlpha = 0.5;
  ctx.fillText('FIND MY SMELL', PAD, 70);
  ctx.globalAlpha = 1;

  // 4. Headline (top, above bottle)
  var hlLines = arch.headline.split('\n');
  var hlSize = 60;
  ctx.font = '900 ' + hlSize + 'px Arial Black,Arial,sans-serif';
  ctx.fillStyle = arch.text;
  ctx.globalAlpha = 0.97;
  var hlY = 160;
  hlLines.forEach(function(line) {
    ctx.fillText(line, PAD, hlY);
    hlY += hlSize + 4;
  });
  ctx.globalAlpha = 1;

  // 5. Bottle zone with glow + particles
  var bottleCx = W / 2;
  var bottleCy = hlY + 290;
  var bottleZoneR = 360;

  var theme = FMS_PARTICLE_THEMES[k] || FMS_PARTICLE_THEMES.CEO;
  fmsDrawGlow(ctx, bottleCx, bottleCy, bottleZoneR, theme.color);
  fmsDrawParticles(ctx, theme, bottleCx, bottleCy, bottleZoneR, W);

  function drawBottleAndRest() {
    fmsDrawParticles(ctx, theme, bottleCx, bottleCy, bottleZoneR * 0.6, W); // foreground layer

    // 6. Punchline summary (from arch.desc), wrapped, sits below bottle
    var punchY = bottleCy + bottleZoneR * 0.62 + 90;
    ctx.font = '400 34px Georgia,serif';
    ctx.fillStyle = arch.text;
    ctx.globalAlpha = 0.85;
    var ly = fmsWrapText(ctx, arch.desc, PAD, punchY, W - PAD * 2, 48);
    ctx.globalAlpha = 1;

    // 7. Bottom rule + perfume name
    var perfY = H - 150;
    ctx.beginPath();
    ctx.moveTo(PAD, perfY - 24); ctx.lineTo(W - PAD, perfY - 24);
    ctx.strokeStyle = arch.accent; ctx.globalAlpha = 0.2; ctx.lineWidth = 1;
    ctx.stroke(); ctx.globalAlpha = 1;

    var perfumeParts = arch.perfume.split(' \u2014 ');
    ctx.font = '700 46px Arial Black,Arial,sans-serif';
    ctx.fillStyle = arch.text; ctx.globalAlpha = 0.95;
    ctx.fillText(perfumeParts[0] || '', PAD, perfY + 14);
    ctx.globalAlpha = 1;

    ctx.font = '400 24px Inconsolata,monospace';
    ctx.fillStyle = arch.accent; ctx.globalAlpha = 0.65;
    ctx.fillText(perfumeParts[1] || '', PAD, perfY + 52);
    ctx.globalAlpha = 1;

    // 8. Footer URL
    ctx.font = '400 22px Inconsolata,monospace';
    ctx.fillStyle = arch.accent; ctx.globalAlpha = 0.42;
    ctx.fillText('findmysmell.com  \u00b7  perfume personality test', PAD, H - 50);
    ctx.globalAlpha = 1;

    if (callback) callback();
  }

  var imgSrc = (fullArch && fullArch.main && fullArch.main.img) ? fullArch.main.img : arch.img;
  var imgEl = new Image();
  imgEl.crossOrigin = 'anonymous';
  imgEl.onload = function() {
    var bw = 440, bh = 560;
    var nw = imgEl.naturalWidth || imgEl.width || bw;
    var nh = imgEl.naturalHeight || imgEl.height || bh;
    var scale = Math.min(bw / nw, bh / nh);
    var dw = nw * scale, dh = nh * scale;
    var dx = bottleCx - dw / 2, dy = bottleCy - dh / 2;
    ctx.globalAlpha = 0.95;
    ctx.drawImage(imgEl, dx, dy, dw, dh);
    ctx.globalAlpha = 1;
    drawBottleAndRest();
  };
  imgEl.onerror = drawBottleAndRest;
  imgEl.src = imgSrc;
}

// ============================================================
// SECTION 7E — SINGLE CARD INIT (replaces old fmsInitCarousel)
// ============================================================

function fmsInitShareCard(canvas, saveBtn) {
  var k = fmsGetKey() || 'result';
  var label = k.toLowerCase();

  if (saveBtn) {
    saveBtn.addEventListener('click', function() {
      saveBtn.textContent = 'Saving…';
      saveBtn.disabled = true;
      fmsDownloadCard(canvas, 'findmysmell-' + label + '.png');
      setTimeout(function() {
        saveBtn.textContent = '\uD83D\uDCF7 Save';
        saveBtn.disabled = false;
      }, 1200);
    });
  }

  setTimeout(function() {
    fmsDrawShareCard(canvas, null);
  }, 600);
}

// ============================================================
// SECTION 7F — SHARE POPUP (styles + build + scroll trigger)
// ============================================================

function injectSharePopupStyles() {
  if (document.getElementById('fms-share-popup-styles')) return;
  var style = document.createElement('style');
  style.id = 'fms-share-popup-styles';
  style.textContent = [
    '.fms-z5-share {',
    '  margin-bottom: 32px;',
    '  display: flex;',
    '  flex-direction: column;',
    '  align-items: center;',
    '  gap: 16px;',
    '}',
    '.fms-z5-card-canvas {',
    '  width: 100%;',
    '  max-width: 360px;',
    '  aspect-ratio: 9 / 16;',
    '  display: block;',
    '  border-radius: 8px;',
    '  background: rgba(0,0,0,0.06);',
    '}',
    '.fms-z5-card-save {',
    '  padding: 14px 28px;',
    '  background: #fff;',
    '  color: #1a1a1a;',
    '  border: none;',
    '  border-radius: 3px;',
    '  font-size: 13px;',
    '  font-weight: 700;',
    '  letter-spacing: 0.08em;',
    '  text-transform: uppercase;',
    '  cursor: pointer;',
    '  white-space: nowrap;',
    '  transition: opacity 0.2s;',
    '  font-family: inherit;',
    '}',
    '.fms-z5-card-save:hover { opacity: 0.85; }',
    '.fms-z5-card-save:disabled { opacity: 0.4; cursor: default; }',
    '#fms-share-popup-overlay {',
    '  display: none;',
    '  position: fixed;',
    '  inset: 0;',
    '  z-index: 9998;',
    '  background: rgba(0,0,0,0.7);',
    '  backdrop-filter: blur(6px);',
    '  -webkit-backdrop-filter: blur(6px);',
    '  align-items: center;',
    '  justify-content: center;',
    '  padding: 24px;',
    '  box-sizing: border-box;',
    '}',
    '#fms-share-popup-overlay.fms-popup-open { display: flex; }',
    '#fms-share-popup-box {',
    '  background: rgba(20,20,20,0.92);',
    '  border: 1px solid rgba(255,255,255,0.1);',
    '  border-radius: 12px;',
    '  max-width: 420px;',
    '  width: 100%;',
    '  padding: 32px 28px 28px;',
    '  text-align: center;',
    '  position: relative;',
    '}',
    '#fms-share-popup-close {',
    '  position: absolute;',
    '  top: 14px;',
    '  right: 16px;',
    '  background: none;',
    '  border: none;',
    '  color: rgba(255,255,255,0.5);',
    '  font-size: 22px;',
    '  line-height: 1;',
    '  cursor: pointer;',
    '  padding: 4px;',
    '}',
    '#fms-share-popup-title {',
    '  font-family: HIGHCRUISER, "Arial Black", Arial, sans-serif;',
    '  font-size: 26px;',
    '  color: #fff;',
    '  letter-spacing: 0.04em;',
    '  text-transform: uppercase;',
    '  margin-bottom: 20px;',
    '}',
    '#fms-share-popup-canvas {',
    '  width: 100%;',
    '  max-width: 240px;',
    '  aspect-ratio: 9 / 16;',
    '  display: block;',
    '  margin: 0 auto 20px;',
    '  border-radius: 8px;',
    '  background: rgba(0,0,0,0.06);',
    '}',
    '#fms-share-popup-save {',
    '  padding: 14px 28px;',
    '  background: #fff;',
    '  color: #1a1a1a;',
    '  border: none;',
    '  border-radius: 3px;',
    '  font-size: 13px;',
    '  font-weight: 700;',
    '  letter-spacing: 0.08em;',
    '  text-transform: uppercase;',
    '  cursor: pointer;',
    '  width: 100%;',
    '  transition: opacity 0.2s;',
    '  font-family: inherit;',
    '}',
    '#fms-share-popup-save:hover { opacity: 0.85; }'
  ].join('\n');
  document.head.appendChild(style);
}

function fmsBuildSharePopup() {
  injectSharePopupStyles();
  if (document.getElementById('fms-share-popup-overlay')) return;

  var overlay = document.createElement('div');
  overlay.id = 'fms-share-popup-overlay';
  overlay.innerHTML =
    '<div id="fms-share-popup-box">' +
      '<button id="fms-share-popup-close" aria-label="Close">\u2715</button>' +
      '<div id="fms-share-popup-title">Share your scent</div>' +
      '<canvas id="fms-share-popup-canvas"></canvas>' +
      '<button id="fms-share-popup-save">\uD83D\uDCF7 Save & share</button>' +
    '</div>';
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) fmsCloseSharePopup();
  });
  document.getElementById('fms-share-popup-close').addEventListener('click', fmsCloseSharePopup);

  var canvas = document.getElementById('fms-share-popup-canvas');
  var saveBtn = document.getElementById('fms-share-popup-save');
  fmsInitShareCard(canvas, saveBtn);
}

function fmsCloseSharePopup() {
  var overlay = document.getElementById('fms-share-popup-overlay');
  if (overlay) overlay.classList.remove('fms-popup-open');
}

function fmsShowSharePopup() {
  var overlay = document.getElementById('fms-share-popup-overlay');
  if (overlay) overlay.classList.add('fms-popup-open');
}

// Scroll-to-bottom trigger — shows popup once per session when user
// reaches the end of the result page.
(function() {
  var shown = false;
  function checkScrollEnd() {
    if (shown) return;
    if (sessionStorage.getItem('fms_share_popup_shown') === '1') { shown = true; return; }
    var scrollBottom = window.innerHeight + window.scrollY;
    var pageHeight = document.documentElement.scrollHeight;
    if (scrollBottom >= pageHeight - 80) {
      var winner = sessionStorage.getItem('quiz_result') || localStorage.getItem('quiz_result');
      if (!winner) return;
      shown = true;
      sessionStorage.setItem('fms_share_popup_shown', '1');
      fmsBuildSharePopup();
      setTimeout(fmsShowSharePopup, 300);
      window.removeEventListener('scroll', checkScrollEnd);
    }
  }
  window.addEventListener('scroll', checkScrollEnd, { passive: true });
})();

// ============================================================
// SECTION 8 — GRAIN ANIMATION
// ============================================================

(function() {
  var grain = document.getElementById('fms-grain');
  if (grain) {
    var gctx = grain.getContext('2d');
    function rg() { grain.width = window.innerWidth; grain.height = window.innerHeight; }
    rg(); window.addEventListener('resize', rg);
    var gl = 0;
    (function gloop(ts) {
      if (ts - gl > 80) {
        var img = gctx.createImageData(grain.width, grain.height);
        for (var i = 0; i < img.data.length; i += 4) {
          var v = Math.random() * 255;
          img.data[i] = img.data[i+1] = img.data[i+2] = v; img.data[i+3] = 255;
        }
        gctx.putImageData(img, 0, 0); gl = ts;
      }
      requestAnimationFrame(gloop);
    })(0);
  }
})();
