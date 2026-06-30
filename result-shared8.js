// ============================================================
// ============================================================
//   DATA / TEXT — everything editable lives here
// ============================================================
// ============================================================

// ------------------------------------------------------------
// Archetype content: headline, punchline (desc), perfume, colors
// ------------------------------------------------------------
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
    desc:     "You said five words in that meeting. Everyone's still quoting you.",
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
    desc:     "Your phone is at 12% and you're somehow relieved about it.",
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
    desc:     "You missed the flight and somehow made it the best part of the trip.",
    perfume:  'Solo Vulcan — Loewe',
    img:      'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69a564cad5ce2b482c477798_summer-solo.svg',
    bg:       '#a43f35',
    accent:   '#cac88f',
    text:     '#f6f6e9'
  },
  'THERAPIST': {
    headline: 'YOU ARE \nDANGEROUSLY\nEMPATHETIC.',
    desc:     "Someone's whole week made sense after just five minutes talking with you.",
    perfume:  'Black Tea — Jil Sander',
    img:      'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69a567233c9199821e9d3cde_therapist-blacktea.svg',
    bg:       '#8f9a54',
    accent:   '#1e2208',
    text:     '#f0f0e0'
  }
};

// ------------------------------------------------------------
// Tag-a-friend lines (one per archetype)
// ------------------------------------------------------------
var FMS_TAG_LINES = {
  CEO:        'tag the friend who has a system for everything',
  JAPAN:      'tag the friend who never panics, ever',
  HUG:        'tag the friend everyone calls at 2am',
  OFFGRID:    "tag the friend who'd disappear into the woods without telling anyone",
  OUTOFTIME:  'tag the friend who is always somewhere else in their head',
  SUMMER:     'tag the friend who makes any plan better just by showing up',
  THERAPIST:  'tag the friend who somehow already knows what is wrong'
};

// ------------------------------------------------------------
// Particle theme per archetype — controls ambient particle look
// ------------------------------------------------------------
var FMS_PARTICLE_THEMES = {
  CEO:        { type: 'frost',  color: '255,255,255', density: 40, speed: 0.15 },
  JAPAN:      { type: 'dust',   color: '255,255,255', density: 25, speed: 0.08 },
  HUG:        { type: 'warm',   color: '255,220,180', density: 30, speed: 0.10 },
  OFFGRID:    { type: 'smoke',  color: '255,255,255', density: 35, speed: 0.12 },
  OUTOFTIME:  { type: 'smoke',  color: '220,220,235', density: 45, speed: 0.07 },
  SUMMER:     { type: 'sparkle',color: '255,250,220', density: 35, speed: 0.18 },
  THERAPIST:  { type: 'dust',   color: '255,255,255', density: 28, speed: 0.09 }
};

// ------------------------------------------------------------
// Card layout constants — tweak spacing here without touching draw logic
// ------------------------------------------------------------
var FMS_CARD_LAYOUT = {
  W: 1080,
  H: 1920,
  PAD: 72,
  bottleOffsetX: 220,   // distance from right edge
  bottleCy: 220,
  bottleZoneR: 200,
  bottleDrawW: 220,
  bottleDrawH: 280,
  bottleAlpha: 0.7,
  punchY: 420,
  punchFontSize: 56,
  punchLineHeight: 66,
  headlineFontSize: 34,
  headlineLineHeight: 40,
  tagFontSize: 28,
  footerBottomOffset: 60
};

// ------------------------------------------------------------
// Share popup UI text
// ------------------------------------------------------------
var FMS_POPUP_TEXT = {
  title: 'Share your scent',
  saveBtn: '\uD83D\uDCF7 Save & share',
  saveBtnSaving: 'Saving…',
  saveBtnDefault: '\uD83D\uDCF7 Save'
};


// ============================================================
// ============================================================
//   FUNCTIONS — drawing, init, popup logic
// ============================================================
// ============================================================

// ------------------------------------------------------------
// Core lookups
// ------------------------------------------------------------
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
  return a ? a.headline.replace('\n', ' ') + '\n\n' + a.desc + '\n\nDiscover your scent archetype → ' + url : url;
}
function fmsDownloadCard(canvas, filename) {
  var k = fmsGetKey() || 'result';
  var a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = filename || ('findmysmell-' + k.toLowerCase() + '.png');
  a.click();
}

// ------------------------------------------------------------
// Shared draw helpers
// ------------------------------------------------------------
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

function fmsDrawParticles(ctx, theme, cx, cy, radius) {
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

// ------------------------------------------------------------
// Main share card draw function
// Layout order: bottle (small, side, background) → punchline
// (hero) → rule → headline (secondary) → tag-a-friend → perfume
// name/brand → footer
// ------------------------------------------------------------
function fmsDrawShareCard(canvas, callback) {
  var arch = fmsGetArch();
  var k = fmsGetKey();
  var fullArch = window.FMS_FULL_ARCH && k ? window.FMS_FULL_ARCH[k] : null;
  if (!arch) { if (callback) callback(); return; }

  var L = FMS_CARD_LAYOUT;
  var W = L.W, H = L.H, PAD = L.PAD;
  canvas.width = W;
  canvas.height = H;
  var ctx = canvas.getContext('2d');

  // Background fill
  ctx.fillStyle = arch.bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle grain
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

  // Bottle zone — small, off to the side, drawn first as background detail
  var theme = FMS_PARTICLE_THEMES[k] || FMS_PARTICLE_THEMES.CEO;
  var bottleCx = W - L.bottleOffsetX;
  var bottleCy = L.bottleCy;
  fmsDrawGlow(ctx, bottleCx, bottleCy, L.bottleZoneR, theme.color);
  fmsDrawParticles(ctx, theme, bottleCx, bottleCy, L.bottleZoneR);

  function drawTextAndRest() {
    fmsDrawParticles(ctx, theme, bottleCx, bottleCy, L.bottleZoneR * 0.6);

    // PUNCHLINE — hero text
    ctx.font = '900 ' + L.punchFontSize + 'px Arial Black,Arial,sans-serif';
    ctx.fillStyle = arch.text;
    ctx.globalAlpha = 0.98;
    var ly = fmsWrapText(ctx, arch.desc, PAD, L.punchY, W - PAD * 2, L.punchLineHeight);
    ctx.globalAlpha = 1;

    // Small rule
    var ruleY = ly + 30;
    ctx.beginPath();
    ctx.moveTo(PAD, ruleY); ctx.lineTo(PAD + 90, ruleY);
    ctx.strokeStyle = arch.accent; ctx.globalAlpha = 0.85; ctx.lineWidth = 3;
    ctx.stroke(); ctx.globalAlpha = 1;

    // Headline — secondary
    var hlLines = arch.headline.split('\n');
    ctx.font = '700 ' + L.headlineFontSize + 'px Inconsolata,monospace';
    ctx.fillStyle = arch.accent;
    ctx.globalAlpha = 0.85;
    var hlY = ruleY + 56;
    hlLines.forEach(function(line) {
      ctx.fillText(line, PAD, hlY);
      hlY += L.headlineLineHeight;
    });
    ctx.globalAlpha = 1;

    // Tag-a-friend line
    var tagY = hlY + 70;
    ctx.font = 'italic 400 ' + L.tagFontSize + 'px Georgia,serif';
    ctx.fillStyle = arch.text;
    ctx.globalAlpha = 0.55;
    ctx.fillText(FMS_TAG_LINES[k] || '', PAD, tagY);
    ctx.globalAlpha = 1;

    // Perfume name + brand
    var perfY = H - 220;
    ctx.beginPath();
    ctx.moveTo(PAD, perfY - 24); ctx.lineTo(W - PAD, perfY - 24);
    ctx.strokeStyle = arch.accent; ctx.globalAlpha = 0.2; ctx.lineWidth = 1;
    ctx.stroke(); ctx.globalAlpha = 1;

    var perfumeParts = arch.perfume.split(' \u2014 ');
    ctx.font = '700 40px Arial Black,Arial,sans-serif';
    ctx.fillStyle = arch.text; ctx.globalAlpha = 0.95;
    ctx.fillText(perfumeParts[0] || '', PAD, perfY + 12);
    ctx.globalAlpha = 1;

    ctx.font = '400 22px Inconsolata,monospace';
    ctx.fillStyle = arch.accent; ctx.globalAlpha = 0.65;
    ctx.fillText(perfumeParts[1] || '', PAD, perfY + 46);
    ctx.globalAlpha = 1;

    // Footer URL — small bottom spacing
    ctx.font = '400 22px Inconsolata,monospace';
    ctx.fillStyle = arch.accent; ctx.globalAlpha = 0.42;
    ctx.fillText('findmysmell.com  \u00b7  perfume personality test', PAD, H - L.footerBottomOffset);
    ctx.globalAlpha = 1;

    if (callback) callback();
  }

  var imgSrc = (fullArch && fullArch.main && fullArch.main.img) ? fullArch.main.img : arch.img;
  var imgEl = new Image();
  imgEl.crossOrigin = 'anonymous';
  imgEl.onload = function() {
    var bw = L.bottleDrawW, bh = L.bottleDrawH;
    var nw = imgEl.naturalWidth || imgEl.width || bw;
    var nh = imgEl.naturalHeight || imgEl.height || bh;
    var scale = Math.min(bw / nw, bh / nh);
    var dw = nw * scale, dh = nh * scale;
    var dx = bottleCx - dw / 2, dy = bottleCy - dh / 2;
    ctx.globalAlpha = L.bottleAlpha;
    ctx.drawImage(imgEl, dx, dy, dw, dh);
    ctx.globalAlpha = 1;
    drawTextAndRest();
  };
  imgEl.onerror = drawTextAndRest;
  imgEl.src = imgSrc;
}

// ------------------------------------------------------------
// Card init — wires the save button + draws after a short delay
// ------------------------------------------------------------
function fmsInitShareCard(canvas, saveBtn) {
  var k = fmsGetKey() || 'result';
  var label = k.toLowerCase();

  if (saveBtn) {
    saveBtn.addEventListener('click', function() {
      saveBtn.textContent = FMS_POPUP_TEXT.saveBtnSaving;
      saveBtn.disabled = true;
      fmsDownloadCard(canvas, 'findmysmell-' + label + '.png');
      setTimeout(function() {
        saveBtn.textContent = FMS_POPUP_TEXT.saveBtnDefault;
        saveBtn.disabled = false;
      }, 1200);
    });
  }

  setTimeout(function() {
    fmsDrawShareCard(canvas, null);
  }, 600);
}

// ------------------------------------------------------------
// Share popup — styles, build, open/close, scroll trigger
// ------------------------------------------------------------
function injectSharePopupStyles() {
  if (document.getElementById('fms-share-popup-styles')) return;
  var style = document.createElement('style');
  style.id = 'fms-share-popup-styles';
  style.textContent = [
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
      '<div id="fms-share-popup-title">' + FMS_POPUP_TEXT.title + '</div>' +
      '<canvas id="fms-share-popup-canvas"></canvas>' +
      '<button id="fms-share-popup-save">' + FMS_POPUP_TEXT.saveBtn + '</button>' +
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

// Scroll-to-bottom trigger — shows popup once per session
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

// ------------------------------------------------------------
// Background grain animation (page-wide canvas, separate from card)
// ------------------------------------------------------------
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
