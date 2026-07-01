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
  CEO:        '@tag the friend who has a system for everything',
  JAPAN:      '@tag the friend who never panics, ever',
  HUG:        '@tag the friend everyone calls at 2am',
  OFFGRID:    "@tag the friend who'd disappear into the woods without telling anyone",
  OUTOFTIME:  '@tag the friend who is always somewhere else in their head',
  SUMMER:     '@tag the friend who makes any plan better just by showing up',
  THERAPIST:  '@tag the friend who somehow already knows the solution to everything'
};

// ------------------------------------------------------------
// Card layout constants — 4:5 ratio (1080x1350)
// ------------------------------------------------------------
var FMS_CARD_LAYOUT = {
  W: 1080,
  H: 1350,
  PAD: 72,
  punchY: 130,
  punchFontSize: 58,
  punchLineHeight: 68,
  bottleW: 320,
  bottleH: 400,
  bottleGapAfterPunch: 50,
  bottleGapAfterBottle: 40,
  perfumeFontSize: 36,
  headlineGapAfterPerfume: 90,
  headlineFontSize: 30,
  headlineLineHeight: 36,
  tagGapAfterHeadline: 36,
  tagFontSize: 26,
  footerFontSize: 32,
  footerBottomOffset: 64
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

// Centered version of fmsWrapText — returns the Y position after the last line
function fmsWrapTextCentered(ctx, text, cx, y, maxW, lineH) {
  var words = text.split(' '), line = '', ly = y;
  var lines = [];
  words.forEach(function(w) {
    var t = (line + ' ' + w).trim();
    if (ctx.measureText(t).width > maxW && line) {
      lines.push(line);
      line = w;
    } else { line = t; }
  });
  if (line) lines.push(line);
  lines.forEach(function(l) {
    ctx.fillText(l, cx, ly);
    ly += lineH;
  });
  return ly - lineH;
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

// ------------------------------------------------------------
// Main share card draw function — 4:5 ratio
// Layout order (top to bottom): punchline (hero) → bottle
// (medium, centered, clean — no particles/dust) → perfume name
// → headline → tag line (italic) → website link (bottom right,
// large + visible)
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

  // Subtle grain (fine page texture, not particles)
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.05;
  for (var gy = 0; gy < H; gy += 3) {
    for (var gx = 0; gx < W; gx += 3) {
      var gv = Math.floor(Math.random() * 255);
      ctx.fillStyle = 'rgb(' + gv + ',' + gv + ',' + gv + ')';
      ctx.fillRect(gx, gy, 3, 3);
    }
  }
  ctx.restore();

  // 1. PUNCHLINE — hero text, top of card
  ctx.font = '900 ' + L.punchFontSize + 'px Arial Black,Arial,sans-serif';
  ctx.fillStyle = arch.text;
  ctx.globalAlpha = 0.98;
  ctx.textAlign = 'left';
  var punchEndY = fmsWrapText(ctx, arch.desc, PAD, L.punchY, W - PAD * 2, L.punchLineHeight);
  ctx.globalAlpha = 1;

  function finishCard() {
    var cursorY = punchEndY + L.bottleGapAfterPunch + L.bottleH;

    // 3. Perfume name + brand — directly below bottle
    var perfumeParts = arch.perfume.split(' \u2014 ');
    cursorY += L.bottleGapAfterBottle;
    ctx.font = '700 ' + L.perfumeFontSize + 'px Arial Black,Arial,sans-serif';
    ctx.fillStyle = arch.text;
    ctx.globalAlpha = 0.95;
    ctx.textAlign = 'center';
    ctx.fillText(perfumeParts[0] || '', W / 2, cursorY);
    ctx.globalAlpha = 1;

    cursorY += 40;
    ctx.font = '400 22px Inconsolata,monospace';
    ctx.fillStyle = arch.accent;
    ctx.globalAlpha = 0.65;
    ctx.fillText(perfumeParts[1] || '', W / 2, cursorY);
    ctx.globalAlpha = 1;

    // 4. Headline — below perfume name
    cursorY += L.headlineGapAfterPerfume;
    ctx.font = '700 ' + L.headlineFontSize + 'px Inconsolata,monospace';
    ctx.fillStyle = arch.accent;
    ctx.globalAlpha = 0.8;
    cursorY = fmsWrapTextCentered(ctx, arch.headline.split('\n').join(' '), W / 2, cursorY, W - PAD * 2, L.headlineLineHeight);
    ctx.globalAlpha = 1;

    // 5. Bottom row: @tag left, findmysmell.com right
    var bottomY = H - L.footerBottomOffset;
    ctx.font = 'italic 400 ' + L.tagFontSize + 'px Georgia,serif';
    ctx.fillStyle = arch.text;
    ctx.globalAlpha = 0.6;
    ctx.textAlign = 'left';
    ctx.fillText(FMS_TAG_LINES[k] || '', PAD, bottomY);
    ctx.globalAlpha = 1;

    ctx.font = '700 ' + L.footerFontSize + 'px Inconsolata,monospace';
    ctx.fillStyle = arch.text;
    ctx.globalAlpha = 1;
    ctx.textAlign = 'right';
    ctx.fillText('findmysmell.com', W - PAD, bottomY);
    ctx.textAlign = 'left';

    // 6. Website link — bottom right, large and visible (drives traffic)
    ctx.font = '700 ' + L.footerFontSize + 'px Inconsolata,monospace';
    ctx.fillStyle = arch.text;
    ctx.globalAlpha = 1;
    ctx.textAlign = 'right';
    ctx.fillText('findmysmell.com', W - PAD, H - L.footerBottomOffset);
    ctx.textAlign = 'left';

    if (callback) callback();
  }

  var imgSrc = (fullArch && fullArch.main && fullArch.main.img) ? fullArch.main.img : arch.img;
  var imgEl = new Image();
  imgEl.crossOrigin = 'anonymous';
  imgEl.onload = function() {
    var bottleCx = W / 2;
    var bottleTop = punchEndY + L.bottleGapAfterPunch;
    var nw = imgEl.naturalWidth || imgEl.width || L.bottleW;
    var nh = imgEl.naturalHeight || imgEl.height || L.bottleH;
    var scale = Math.min(L.bottleW / nw, L.bottleH / nh);
    var dw = nw * scale, dh = nh * scale;
    var dx = bottleCx - dw / 2, dy = bottleTop + (L.bottleH - dh) / 2;
    ctx.globalAlpha = 1;
    ctx.drawImage(imgEl, dx, dy, dw, dh);
    finishCard();
  };
  imgEl.onerror = finishCard;
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
    '  max-width: 260px;',
    '  aspect-ratio: 4 / 5;',
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
