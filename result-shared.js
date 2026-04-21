// ============================================================
// SECTION 3 — FMS_ARCHETYPES (share card data)
// ============================================================

var FMS_ARCHETYPES = {
  'CEO': {
    headline: 'THIS IS WHAT A\nDECISION \nSMELLS LIKE.',
    tagline:  'Clean. Architectural. Focused.',
    desc:     "You don't need another recommendation. You need something that works. No coziness. No backstory. No \u201chow does this make you feel?\u201d",
    perfume:  'Concrete — Comme des Garçons',
    img:      'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/6997337efd1740fcd5bbd50a_ceo-concrete.svg',
    bg:       '#a43f35',
    accent:   '#000000',
    text:     '#f8f8f8'
  },
  'JAPAN': {
    headline: 'YOU ARE\nINSISTENTLY \nCALM.',
    tagline:  'Minimal. Intentional. Above the noise.',
    desc:     "You speak less. You choose better. You move with intention. Calm, because you don't need to prove anything.",
    perfume:  'Miyako — Auphorie',
    img:      'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/699826c6a65ed022b44b9d61_japan-miyako.svg',
    bg:       '#cac88f',
    accent:   '#5d663c',
    text:     '#000000'
  },
  'HUG': {
    headline: 'YOU ARE\nA HUG.',
    tagline:  'Open. Present. Quietly reassuring.',
    desc:     "You listen without fixing. You stay without judging. Warmth, for you, isn't performance.",
    perfume:  'Eau Duelle — Diptyque',
    img:      'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69a552a3ad178c4e36ba6acc_hug-eau.svg',
    bg:       '#7e3d30',
    accent:   '#f0c8a8',
    text:     '#fdf0e8'
  },
  'OFFGRID': {
    headline: 'YOU ARE\nSECRETLY PLANNING\nTO DISAPPEAR.',
    tagline:  'Raw. Grounded. Present.',
    desc:     "You don't fantasise about escape. You prepare for it. You prefer movement over conversation. Silence over explanations. You don't need comfort. You need space.",
    perfume:  'Coven — Andrea Maack',
    img:      'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69a5595ac9e0cf46d4776711_offgrid-coven.svg',
    bg:       '#363636',
    accent:   '#ffffff',
    text:     '#e8f0e0'
  },
  'OUTOFTIME': {
    headline: 'YOU ARE\nCHRONICALLY \nELSEWHERE.',
    tagline:  'Introverted. Mysterious. Entirely your own.',
    desc:     "You're not behind the world. You're slightly aside from it. You let things reveal themselves.",
    perfume:  'Gris Clair — Serge Lutens',
    img:      'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69a55e5c6cacbdd277d526dd_outoftime-gris.svg',
    bg:       '#604c65',
    accent:   '#dfdfdb',
    text:     '#f5eefa'
  },
  'SUMMER': {
    headline: 'YOU ARE\nPATHOLOGICALLY \nCHILL.',
    tagline:  'Light. Moving. Confident.',
    desc:     "You move easily between people, plans, and situations. You trust the process and you keep things light.",
    perfume:  'Solo Vulcan — Loewe',
    img:      'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69a564cad5ce2b482c477798_summer-solo.svg',
    bg:       '#a43f35',
    accent:   '#cac88f',
    text:     '#f6f6e9'
  },
  'THERAPIST': {
    headline: 'YOU ARE \nDANGEROUSLY\nEMPATHETIC.',
    tagline:  'Present. Intentional. Selective.',
    desc:     "You understand people quickly — because you notice what actually matters. You're not for everyone. And you're not trying to be.",
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
function fmsDownloadCard(canvas) {
  var k = fmsGetKey() || 'result';
  var a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = 'findmysmell-' + k.toLowerCase() + '.png';
  a.click();
}

// ============================================================
// SECTION 7 — SHARE CARD DRAW FUNCTION
// ============================================================

function fmsDrawCard(canvas, callback) {
  var arch = fmsGetArch();
  if (!arch) { if (callback) callback(); return; }

  var S = 1200;
  canvas.width = canvas.height = S;
  var ctx = canvas.getContext('2d');

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

  var PAD = 80, W = S - PAD * 2;

  ctx.font = '400 26px Inconsolata,monospace';
  ctx.fillStyle = arch.accent; ctx.globalAlpha = 0.55;
  ctx.fillText('FIND MY SMELL  ·  Perfume Personality Quiz', PAD, 78);
  ctx.globalAlpha = 1;

  ctx.beginPath(); ctx.moveTo(PAD, 96); ctx.lineTo(S - PAD, 96);
  ctx.strokeStyle = arch.accent; ctx.globalAlpha = 0.2;
  ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1;

  var hlLines = arch.headline.split('\n');
  var hlSize = 86;
  ctx.font = '900 ' + hlSize + 'px Arial Black,Arial,sans-serif';
  ctx.fillStyle = arch.text; ctx.globalAlpha = 0.96;
  var hlY = 190;
  hlLines.forEach(function(line) { ctx.fillText(line, PAD, hlY); hlY += hlSize + 10; });
  ctx.globalAlpha = 1;

  var ruleY = hlY + 10;
  ctx.beginPath(); ctx.moveTo(PAD, ruleY); ctx.lineTo(PAD + 120, ruleY);
  ctx.strokeStyle = arch.accent; ctx.globalAlpha = 0.9;
  ctx.lineWidth = 3; ctx.stroke(); ctx.globalAlpha = 1;

  ctx.font = '400 36px Inconsolata,monospace';
  ctx.fillStyle = arch.accent; ctx.globalAlpha = 0.85;
  ctx.fillText(arch.tagline, PAD, ruleY + 56); ctx.globalAlpha = 1;

  var descY = ruleY + 110;
  ctx.font = '400 30px Georgia,serif';
  ctx.fillStyle = arch.text; ctx.globalAlpha = 0.58;
  var words = arch.desc.split(' '), line = '', ly = descY;
  words.forEach(function(w) {
    var t = (line + ' ' + w).trim();
    if (ctx.measureText(t).width > W - 20 && line) {
      ctx.fillText(line, PAD, ly); line = w; ly += 46;
    } else { line = t; }
  });
  if (line) ctx.fillText(line, PAD, ly);
  ctx.globalAlpha = 1;

  var afterDesc = ly + 46;

  function finishCard() {
    var perfY = S - 170;
    ctx.beginPath(); ctx.moveTo(PAD, perfY - 20); ctx.lineTo(S - PAD, perfY - 20);
    ctx.strokeStyle = arch.accent; ctx.globalAlpha = 0.2;
    ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1;

    ctx.font = '400 22px Inconsolata,monospace';
    ctx.fillStyle = arch.accent; ctx.globalAlpha = 0.55;
    ctx.fillText('RECOMMENDED SCENT', PAD, perfY + 6); ctx.globalAlpha = 1;

    ctx.font = '500 38px Inconsolata,monospace';
    ctx.fillStyle = arch.accent; ctx.globalAlpha = 0.92;
    ctx.fillText(arch.perfume, PAD, perfY + 52); ctx.globalAlpha = 1;

    ctx.font = '400 22px Inconsolata,monospace';
    ctx.fillStyle = arch.accent; ctx.globalAlpha = 0.42;
    ctx.fillText(' find yours now on  ·  findmysmell.com ', PAD, S - 44); ctx.globalAlpha = 1;

    if (callback) callback();
  }

  var imgEl = new Image();
  imgEl.crossOrigin = 'anonymous';
  imgEl.onload = function() {
    var imgAreaTop = afterDesc + 20, imgAreaBot = S - 210;
    var imgAreaH = imgAreaBot - imgAreaTop, imgAreaW = W;
    var scale = Math.min(imgAreaW / imgEl.naturalWidth, imgAreaH / imgEl.naturalHeight, 1);
    var dw = imgEl.naturalWidth * scale, dh = imgEl.naturalHeight * scale;
    var dx = PAD + (imgAreaW - dw) / 2, dy = imgAreaTop + (imgAreaH - dh) / 2;
    ctx.globalAlpha = 0.88;
    ctx.drawImage(imgEl, dx, dy, dw, dh);
    ctx.globalAlpha = 1;
    finishCard();
  };
  imgEl.onerror = function() { finishCard(); };
  imgEl.src = arch.img;
}

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
