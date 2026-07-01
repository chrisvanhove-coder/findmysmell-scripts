// ============================================================
// ============================================================
//   DATA / TEXT — everything editable lives here
// ============================================================
// ============================================================

// ------------------------------------------------------------
// Punchline typography — each archetype has manually sized lines
// for a poster/editorial effect. Each entry: [text, fontSize]
// ------------------------------------------------------------
var FMS_PUNCH_LINES = {
  CEO: [
    ["You replied to that email", 38],
    ["in 4 minutes", 58],
    ["and", 80],
    ["you're calling it", 38],
    ["work-life balance.", 52]
  ],
  JAPAN: [
    ["You said", 42],
    ["five words", 80],
    ["in that meeting.", 36],
    ["Everyone's still", 36],
    ["quoting you.", 64]
  ],
  HUG: [
    ["Someone is", 42],
    ["mid-breakdown", 56],
    ["right now", 48],
    ["and texting you", 34],
    ["instead of their therapist.", 36]
  ],
  OFFGRID: [
    ["Your phone is at", 38],
    ["12%", 90],
    ["and you're", 36],
    ["somehow relieved", 52],
    ["about it.", 42]
  ],
  OUTOFTIME: [
    ["You've read", 44],
    ["the message.", 62],
    ["You have no plans to respond.", 32],
    ["The universe", 48],
    ["approves this.", 56]
  ],
  SUMMER: [
    ["You missed", 44],
    ["the flight", 72],
    ["and somehow made it", 32],
    ["the best part", 52],
    ["of the trip.", 64]
  ],
  THERAPIST: [
    ["Someone's whole week", 34],
    ["made sense", 64],
    ["after just", 42],
    ["five minutes", 68],
    ["talking with you.", 36]
  ]
};

// ------------------------------------------------------------
// Archetype: headline, perfume name, colors, bottle image
// ------------------------------------------------------------
var FMS_ARCHETYPES = {
  'CEO': {
    headline: 'THIS IS WHAT A DECISION SMELLS LIKE.',
    perfume:  'Concrete — Comme des Garçons',
    img:      'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/6997337efd1740fcd5bbd50a_ceo-concrete.svg',
    bg:       '#a43f35', accent: '#000000', text: '#f8f8f8'
  },
  'JAPAN': {
    headline: 'YOU ARE INSISTENTLY CALM.',
    perfume:  'Dirty Hinoki — Heretic Parfum',
    img:      'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69e88e6c2d41e3859e44d7c7_hinoki-dirty.png',
    bg:       '#cac88f', accent: '#5d663c', text: '#000000'
  },
  'HUG': {
    headline: 'YOU ARE A HUG.',
    perfume:  'Eau Duelle — Diptyque',
    img:      'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69a552a3ad178c4e36ba6acc_hug-eau.svg',
    bg:       '#7e3d30', accent: '#f0c8a8', text: '#fdf0e8'
  },
  'OFFGRID': {
    headline: 'YOU ARE SECRETLY PLANNING TO DISAPPEAR.',
    perfume:  'Coven — Andrea Maack',
    img:      'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69a5595ac9e0cf46d4776711_offgrid-coven.svg',
    bg:       '#363636', accent: '#ffffff', text: '#e8f0e0'
  },
  'OUTOFTIME': {
    headline: 'YOU ARE CHRONICALLY ELSEWHERE.',
    perfume:  'Gris Clair — Serge Lutens',
    img:      'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69a55e5c6cacbdd277d526dd_outoftime-gris.svg',
    bg:       '#604c65', accent: '#dfdfdb', text: '#f5eefa'
  },
  'SUMMER': {
    headline: 'YOU ARE PATHOLOGICALLY CHILL.',
    perfume:  'Solo Vulcan — Loewe',
    img:      'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69a564cad5ce2b482c477798_summer-solo.svg',
    bg:       '#a43f35', accent: '#cac88f', text: '#f6f6e9'
  },
  'THERAPIST': {
    headline: 'YOU ARE DANGEROUSLY EMPATHETIC.',
    perfume:  'Black Tea — Jil Sander',
    img:      'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69a567233c9199821e9d3cde_therapist-blacktea.svg',
    bg:       '#8f9a54', accent: '#1e2208', text: '#f0f0e0'
  }
};

// ------------------------------------------------------------
// Tag-a-friend lines
// ------------------------------------------------------------
var FMS_TAG_LINES = {
  CEO:        '@tag the friend who has a system for everything',
  JAPAN:      '@tag the friend who never panics, ever',
  HUG:        '@tag the friend everyone calls at 2am',
  OFFGRID:    "@tag the friend who'd disappear into the woods without telling anyone",
  OUTOFTIME:  '@tag the friend who is always somewhere else in their head',
  SUMMER:     '@tag the friend who makes any plan better just by showing up',
  THERAPIST:  '@tag the friend who somehow already knows what is wrong'
};

// ------------------------------------------------------------
// Card layout — fixed Y zones
// ------------------------------------------------------------
var FMS_CARD_LAYOUT = {
  W: 1080,
  H: 1350,
  PAD: 60,
  punchStartY: 90,
  punchLineGap: 12,      // extra gap between punchline rows
  bottleZoneTop: 620,    // fixed top of bottle area
  bottleW: 280,
  bottleH: 300,
  perfumeNameY: 990,
  perfumeFontSize: 30,
  perfumeBrandY: 1030,
  headlineY: 1090,
  headlineFontSize: 24,
  footerY: 1290,
  tagFontSize: 22,
  footerFontSize: 28
};

// ------------------------------------------------------------
// Popup text
// ------------------------------------------------------------
var FMS_POPUP_TEXT = {
  title: 'Share your scent',
  saveBtn: '\uD83D\uDCF7 Save & share',
  saveBtnSaving: 'Saving\u2026',
  saveBtnDefault: '\uD83D\uDCF7 Save'
};


// ============================================================
// ============================================================
//   FUNCTIONS
// ============================================================
// ============================================================

function fmsGetKey() {
  return (sessionStorage.getItem('quiz_result') || localStorage.getItem('quiz_result') || '').toUpperCase() || null;
}
function fmsGetArch() {
  var k = fmsGetKey();
  return k ? FMS_ARCHETYPES[k] || null : null;
}
function fmsDownloadCard(canvas, filename) {
  var k = fmsGetKey() || 'result';
  var a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = filename || ('findmysmell-' + k.toLowerCase() + '.png');
  a.click();
}

// ------------------------------------------------------------
// Main draw function
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

  // Background
  ctx.fillStyle = arch.bg;
  ctx.fillRect(0, 0, W, H);

  // Grain
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

  // 1. PUNCHLINE — typographic, each line individually sized
  var lines = FMS_PUNCH_LINES[k] || [];
  var curY = L.punchStartY;
  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
  lines.forEach(function(line) {
    var txt = line[0];
    var size = line[1];
    ctx.font = size + 'px Impact,"Arial Black",Arial,sans-serif';
    ctx.fillStyle = arch.text;
    ctx.fillText(txt, PAD, curY + size);
    curY += size + L.punchLineGap;
  });

  function finishCard() {
    // 3. Perfume name — right aligned
    var perfumeParts = arch.perfume.split(' \u2014 ');
    ctx.font = '700 ' + L.perfumeFontSize + 'px Arial Black,Arial,sans-serif';
    ctx.fillStyle = arch.text;
    ctx.globalAlpha = 0.95;
    ctx.textAlign = 'right';
    ctx.fillText(perfumeParts[0] || '', W - PAD, L.perfumeNameY);

    ctx.font = '400 20px Inconsolata,monospace';
    ctx.fillStyle = arch.accent;
    ctx.globalAlpha = 0.75;
    ctx.fillText(perfumeParts[1] || '', W - PAD, L.perfumeBrandY);
    ctx.globalAlpha = 1;

    // 4. Headline — right aligned
    ctx.font = '700 ' + L.headlineFontSize + 'px Inconsolata,monospace';
    ctx.fillStyle = arch.accent;
    ctx.globalAlpha = 0.85;
    ctx.textAlign = 'right';
    ctx.fillText(arch.headline, W - PAD, L.headlineY);
    ctx.globalAlpha = 1;

    // 5. Footer — @tag left, findmysmell.com right
    ctx.font = 'italic 400 ' + L.tagFontSize + 'px Georgia,serif';
    ctx.fillStyle = arch.text;
    ctx.globalAlpha = 0.6;
    ctx.textAlign = 'left';
    ctx.fillText(FMS_TAG_LINES[k] || '', PAD, L.footerY);

    ctx.font = '700 ' + L.footerFontSize + 'px Inconsolata,monospace';
    ctx.fillStyle = arch.text;
    ctx.globalAlpha = 1;
    ctx.textAlign = 'right';
    ctx.fillText('findmysmell.com', W - PAD, L.footerY);
    ctx.textAlign = 'left';

    if (callback) callback();
  }

  // 2. Bottle — fixed zone, centered
  var imgSrc = (fullArch && fullArch.main && fullArch.main.img) ? fullArch.main.img : arch.img;
  var imgEl = new Image();
  imgEl.crossOrigin = 'anonymous';
  imgEl.onload = function() {
    var bottleCx = W / 2;
    var nw = imgEl.naturalWidth || imgEl.width || L.bottleW;
    var nh = imgEl.naturalHeight || imgEl.height || L.bottleH;
    var scale = Math.min(L.bottleW / nw, L.bottleH / nh);
    var dw = nw * scale, dh = nh * scale;
    var dx = bottleCx - dw / 2;
    var dy = L.bottleZoneTop + (L.bottleH - dh) / 2;
    ctx.globalAlpha = 1;
    ctx.drawImage(imgEl, dx, dy, dw, dh);
    finishCard();
  };
  imgEl.onerror = finishCard;
  imgEl.src = imgSrc;
}

// ------------------------------------------------------------
// Card init
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
  setTimeout(function() { fmsDrawShareCard(canvas, null); }, 600);
}

// ------------------------------------------------------------
// Popup
// ------------------------------------------------------------
function injectSharePopupStyles() {
  if (document.getElementById('fms-share-popup-styles')) return;
  var style = document.createElement('style');
  style.id = 'fms-share-popup-styles';
  style.textContent = [
    '#fms-share-popup-overlay {',
    '  display: none; position: fixed; inset: 0; z-index: 9998;',
    '  background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);',
    '  -webkit-backdrop-filter: blur(6px);',
    '  align-items: center; justify-content: center;',
    '  padding: 24px; box-sizing: border-box;',
    '}',
    '#fms-share-popup-overlay.fms-popup-open { display: flex; }',
    '#fms-share-popup-box {',
    '  background: rgba(20,20,20,0.92);',
    '  border: 1px solid rgba(255,255,255,0.1);',
    '  border-radius: 12px; max-width: 420px; width: 100%;',
    '  padding: 32px 28px 28px; text-align: center; position: relative;',
    '}',
    '#fms-share-popup-close {',
    '  position: absolute; top: 14px; right: 16px;',
    '  background: none; border: none; color: rgba(255,255,255,0.5);',
    '  font-size: 22px; line-height: 1; cursor: pointer; padding: 4px;',
    '}',
    '#fms-share-popup-title {',
    '  font-family: HIGHCRUISER,"Arial Black",Arial,sans-serif;',
    '  font-size: 26px; color: #fff; letter-spacing: 0.04em;',
    '  text-transform: uppercase; margin-bottom: 20px;',
    '}',
    '#fms-share-popup-canvas {',
    '  width: 100%; max-width: 260px; aspect-ratio: 4 / 5;',
    '  display: block; margin: 0 auto 20px;',
    '  border-radius: 8px; background: rgba(0,0,0,0.06);',
    '}',
    '#fms-share-popup-save {',
    '  padding: 14px 28px; background: #fff; color: #1a1a1a;',
    '  border: none; border-radius: 3px; font-size: 13px;',
    '  font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;',
    '  cursor: pointer; width: 100%; transition: opacity 0.2s; font-family: inherit;',
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
  overlay.addEventListener('click', function(e) { if (e.target === overlay) fmsCloseSharePopup(); });
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

// Scroll trigger
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

// Grain animation
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
