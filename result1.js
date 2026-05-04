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
    perfume:  'Dirty Hinoki — Heretic Parfum',
    img:      'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69e88e6c2d41e3859e44d7c7_hinoki-dirty.png',
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
  var scale = Math.max((r * 2) / img.naturalWidth, (r * 2) / img.naturalHeight);
  var dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.restore();
}

// Draw a bottle image fitted into a rect
function fmsDrawBottleImg(ctx, img, x, y, w, h, alpha) {
  if (!img) return;
  ctx.save();
  ctx.globalAlpha = alpha || 0.92;
  var scale = Math.min(w / img.naturalWidth, h / img.naturalHeight, 1);
  var dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
  var dx = x + (w - dw) / 2, dy = y + (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

// ============================================================
// SECTION 7B — CARD 1: IDENTITY
// ============================================================

function fmsDrawCard(canvas, callback) {
  var arch = fmsGetArch();
  if (!arch) { if (callback) callback(); return; }

  var S = 1200;
  canvas.width = canvas.height = S;
  var ctx = canvas.getContext('2d');
  var PAD = 80, W = S - PAD * 2;

  fmsDrawBase(ctx, arch, S, PAD);

  var hlLines = arch.headline.split('\n');
  var hlSize = 86;
  ctx.font = '900 ' + hlSize + 'px Arial Black,Arial,sans-serif';
  ctx.fillStyle = arch.text;
  ctx.globalAlpha = 0.96;
  var hlY = 190;
  hlLines.forEach(function(line) { ctx.fillText(line, PAD, hlY); hlY += hlSize + 10; });
  ctx.globalAlpha = 1;

  var ruleY = hlY + 10;
  ctx.beginPath(); ctx.moveTo(PAD, ruleY); ctx.lineTo(PAD + 120, ruleY);
  ctx.strokeStyle = arch.accent; ctx.globalAlpha = 0.9; ctx.lineWidth = 3;
  ctx.stroke(); ctx.globalAlpha = 1;

  ctx.font = '400 36px Inconsolata,monospace';
  ctx.fillStyle = arch.accent; ctx.globalAlpha = 0.85;
  ctx.fillText(arch.tagline, PAD, ruleY + 56); ctx.globalAlpha = 1;

  var descY = ruleY + 110;
  ctx.font = '400 30px Georgia,serif';
  ctx.fillStyle = arch.text; ctx.globalAlpha = 0.58;
  var ly = fmsWrapText(ctx, arch.desc, PAD, descY, W - 20, 46);
  ctx.globalAlpha = 1;

  function finishCard() {
    var perfY = S - 170;
    fmsDrawFullRule(ctx, arch, S, PAD, perfY - 20);

    ctx.font = '400 22px Inconsolata,monospace';
    ctx.fillStyle = arch.accent; ctx.globalAlpha = 0.55;
    ctx.fillText('RECOMMENDED SCENT', PAD, perfY + 6); ctx.globalAlpha = 1;

    ctx.font = '500 38px Inconsolata,monospace';
    ctx.fillStyle = arch.accent; ctx.globalAlpha = 0.92;
    ctx.fillText(arch.perfume, PAD, perfY + 52); ctx.globalAlpha = 1;

    fmsDrawFooter(ctx, arch, S, PAD);
    if (callback) callback();
  }

  var imgEl = new Image();
  imgEl.crossOrigin = 'anonymous';
  imgEl.onload = function() {
    var imgAreaTop = ly + 20, imgAreaBot = S - 210;
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
// SECTION 7C — CARD 2: YOUR SCENT (main bottle + alternatives)
// ============================================================

function fmsDrawCard2(canvas, callback) {
  var arch = fmsGetArch();
  var k = fmsGetKey();
  var fullArch = window.FMS_FULL_ARCH && k ? window.FMS_FULL_ARCH[k] : null;
  if (!arch) { if (callback) callback(); return; }

  var alts = fullArch && fullArch.alts ? fullArch.alts : [];
  var mainImg = arch.img;
  var altImgs = alts.map(function(a) { return a.img || ''; });
  var allSrcs = [mainImg].concat(altImgs).filter(Boolean);

  fmsLoadImages(allSrcs, function(images) {
    var S = 1200;
    canvas.width = canvas.height = S;
    var ctx = canvas.getContext('2d');
    var PAD = 80;

    fmsDrawBase(ctx, arch, S, PAD);

    // Card label
    ctx.font = '400 22px Inconsolata,monospace';
    ctx.fillStyle = arch.accent; ctx.globalAlpha = 0.55;
    ctx.fillText('YOUR SCENT  ·  02 / 03', PAD, 136); ctx.globalAlpha = 1;

    // Layout: left text column (55%), right bottle image (45%)
    var colSplit = 640;
    var textW = colSplit - PAD - 40;
    var imgX = colSplit, imgW = S - PAD - colSplit, imgH = 420;

    // Main bottle image — right column, top area
    fmsDrawBottleImg(ctx, images[mainImg], imgX, 110, imgW, imgH, 0.92);

    // Perfume name + house — left column
    var parts = arch.perfume.split(' — ');
    var perfName = parts[0] || arch.perfume;
    var perfHouse = parts[1] || '';

    ctx.font = '900 68px Arial Black,Arial,sans-serif';
    ctx.fillStyle = arch.text; ctx.globalAlpha = 0.96;
    // wrap name if needed
    var nameY = 210;
    if (ctx.measureText(perfName.toUpperCase()).width > textW) {
      var words = perfName.toUpperCase().split(' '), ln = '';
      words.forEach(function(w) {
        var t = (ln + ' ' + w).trim();
        if (ctx.measureText(t).width > textW && ln) {
          ctx.fillText(ln, PAD, nameY); ln = w; nameY += 76;
        } else { ln = t; }
      });
      ctx.fillText(ln, PAD, nameY); nameY += 76;
    } else {
      ctx.fillText(perfName.toUpperCase(), PAD, nameY); nameY += 76;
    }
    ctx.globalAlpha = 1;

    ctx.font = '400 30px Inconsolata,monospace';
    ctx.fillStyle = arch.accent; ctx.globalAlpha = 0.7;
    ctx.fillText(perfHouse, PAD, nameY + 4); ctx.globalAlpha = 1;

    var mainDesc = fullArch && fullArch.main && fullArch.main.desc ? fullArch.main.desc : '';
    ctx.font = '400 26px Georgia,serif';
    ctx.fillStyle = arch.text; ctx.globalAlpha = 0.55;
    fmsWrapText(ctx, mainDesc, PAD, nameY + 52, textW, 40);
    ctx.globalAlpha = 1;

    // Divider
    var divY = 550;
    fmsDrawFullRule(ctx, arch, S, PAD, divY);

    // "ALSO CONSIDER"
    ctx.font = '400 22px Inconsolata,monospace';
    ctx.fillStyle = arch.accent; ctx.globalAlpha = 0.55;
    ctx.fillText('ALSO CONSIDER', PAD, divY + 42); ctx.globalAlpha = 1;

    // Alternatives — each row: circle image left, name+house+desc right
    var altAreaTop = divY + 70;
    var altAreaBot = S - 110;
    var altSlot = Math.floor((altAreaBot - altAreaTop) / Math.max(alts.length, 1));
    var circR = Math.min(48, Math.floor(altSlot / 2) - 4);
    var textStartX = PAD + circR * 2 + 24;

    alts.forEach(function(alt, i) {
      var rowMidY = altAreaTop + i * altSlot + altSlot / 2;

      // Separator (not before first)
      if (i > 0) {
        ctx.beginPath();
        ctx.moveTo(PAD, altAreaTop + i * altSlot);
        ctx.lineTo(S - PAD, altAreaTop + i * altSlot);
        ctx.strokeStyle = arch.accent; ctx.globalAlpha = 0.08; ctx.lineWidth = 1;
        ctx.stroke(); ctx.globalAlpha = 1;
      }

      // Circle bottle image
      fmsDrawCircleImg(ctx, images[alt.img], PAD + circR, rowMidY, circR, 0.90);

      // Alt name
      ctx.font = '700 32px Arial Black,Arial,sans-serif';
      ctx.fillStyle = arch.text; ctx.globalAlpha = 0.92;
      ctx.fillText((alt.name + '  ·  ' + alt.house).toUpperCase(), textStartX, rowMidY - 10);
      ctx.globalAlpha = 1;

      // Alt desc
      ctx.font = '400 24px Georgia,serif';
      ctx.fillStyle = arch.text; ctx.globalAlpha = 0.50;
      ctx.fillText(alt.desc, textStartX, rowMidY + 30);
      ctx.globalAlpha = 1;
    });

    fmsDrawFooter(ctx, arch, S, PAD);
    if (callback) callback();
  });
}

// ============================================================
// SECTION 7D — CARD 3: INGREDIENTS
// ============================================================

function fmsDrawCard3(canvas, callback) {
  var arch = fmsGetArch();
  var k = fmsGetKey();
  var fullArch = window.FMS_FULL_ARCH && k ? window.FMS_FULL_ARCH[k] : null;
  if (!arch) { if (callback) callback(); return; }

  var ings = fullArch && fullArch.ingredients ? fullArch.ingredients : [];
  var imgSrcs = ings.map(function(i) { return i.img || ''; }).filter(Boolean);

  fmsLoadImages(imgSrcs, function(images) {
    var S = 1200;
    canvas.width = canvas.height = S;
    var ctx = canvas.getContext('2d');
    var PAD = 80;

    fmsDrawBase(ctx, arch, S, PAD);

    // Card label
    ctx.font = '400 22px Inconsolata,monospace';
    ctx.fillStyle = arch.accent; ctx.globalAlpha = 0.55;
    ctx.fillText('INGREDIENTS WORTH DISCOVERING  ·  03 / 03', PAD, 136); ctx.globalAlpha = 1;

    fmsDrawFullRule(ctx, arch, S, PAD, 154);

    // 5 ingredient rows
    var areaTop = 160;
    var areaBot = S - 110;
    var slot = Math.floor((areaBot - areaTop) / Math.max(ings.length, 1));
    var circR = Math.min(62, Math.floor(slot / 2) - 8);
    var textX = PAD + circR * 2 + 32;
    var textW = S - PAD - textX;

    ings.forEach(function(ing, i) {
      var rowTop = areaTop + i * slot;
      var rowMidY = rowTop + slot / 2;

      // Separator (not before first)
      if (i > 0) {
        ctx.beginPath();
        ctx.moveTo(PAD, rowTop);
        ctx.lineTo(S - PAD, rowTop);
        ctx.strokeStyle = arch.accent; ctx.globalAlpha = 0.12; ctx.lineWidth = 1;
        ctx.stroke(); ctx.globalAlpha = 1;
      }

      // Circle ingredient image
      fmsDrawCircleImg(ctx, images[ing.img], PAD + circR, rowMidY, circR, 0.92);

      // Ingredient name
      ctx.font = '900 50px Arial Black,Arial,sans-serif';
      ctx.fillStyle = arch.text; ctx.globalAlpha = 0.94;
      ctx.fillText(ing.name.toUpperCase(), textX, rowMidY - 6);
      ctx.globalAlpha = 1;

      // Short phrase
      ctx.font = 'italic 400 26px Georgia,serif';
      ctx.fillStyle = arch.text; ctx.globalAlpha = 0.52;
      // Truncate if too wide
      var phrase = ing.desc;
      while (ctx.measureText(phrase).width > textW && phrase.length > 10) {
        phrase = phrase.slice(0, -4) + '…';
      }
      ctx.fillText(phrase, textX, rowMidY + 36);
      ctx.globalAlpha = 1;
    });

    fmsDrawFooter(ctx, arch, S, PAD);
    if (callback) callback();
  });
}

// ============================================================
// SECTION 7E — CAROUSEL DOWNLOAD (all 3 cards)
// ============================================================

function fmsDownloadCarousel() {
  var k = fmsGetKey() || 'result';
  var label = k.toLowerCase();

  var c1 = document.createElement('canvas');
  var c2 = document.createElement('canvas');
  var c3 = document.createElement('canvas');

  var btn = document.getElementById('fms-btn-instagram');
  if (btn) { btn.textContent = 'Saving 1/3…'; btn.disabled = true; }

  fmsDrawCard(c1, function() {
    fmsDownloadCard(c1, 'findmysmell-' + label + '-1-identity.png');
    if (btn) btn.textContent = 'Saving 2/3…';
    setTimeout(function() {
      fmsDrawCard2(c2, function() {
        fmsDownloadCard(c2, 'findmysmell-' + label + '-2-scent.png');
        if (btn) btn.textContent = 'Saving 3/3…';
        setTimeout(function() {
          fmsDrawCard3(c3, function() {
            fmsDownloadCard(c3, 'findmysmell-' + label + '-3-ingredients.png');
            if (btn) { btn.textContent = '📷 Save'; btn.disabled = false; }
          });
        }, 500);
      });
    }, 500);
  });
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
