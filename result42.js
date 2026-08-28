// ============================================================
// SECTION 0 â€” S/R/P MATCHING ENGINE (unchanged)
// ============================================================

function getUserSRP() {
  var answers = {};
  try {
    var raw = sessionStorage.getItem('quiz_answers') || localStorage.getItem('quiz_answers') || '{}';
    answers = JSON.parse(raw);
  } catch (e) { return null; }

  var sweetCode = null, rawCode = null, projCode = null, skinCode = null;
  var vals = Object.values(answers);
  for (var i = 0; i < vals.length; i++) {
    var code = vals[i];
    if (code.indexOf('Q_SWEET__') === 0) sweetCode = code;
    if (code.indexOf('Q_WILD__') === 0) rawCode = code;
    if (code.indexOf('Q_RADIUS__') === 0) projCode = code;
    if (code.indexOf('Q_SKIN_BEHAVIOR__') === 0) skinCode = code;
  }

  var sweetMap = { 'Q_SWEET__NO_SWEET': 0, 'Q_SWEET__LITTLE_SW': 1, 'Q_SWEET__MODER_SW': 2, 'Q_SWEET__ENJOY_SW': 3 };
  var rawMap = { 'Q_WILD__NO_WILD': 0, 'Q_WILD__LITTLE_WILD': 1, 'Q_WILD__SOME_WILD': 2, 'Q_WILD__LOVE_WILD': 3 };
  var projMap = { 'Q_RADIUS__CLOSE': 0, 'Q_RADIUS__SOFT': 1, 'Q_RADIUS__NOTICEABLE': 2, 'Q_RADIUS__BOLD': 3 };

  var s = sweetMap[sweetCode];
  var r = rawMap[rawCode];
  var p = projMap[projCode];

  if (s === undefined || r === undefined || p === undefined) return null;

  if (skinCode === 'Q_SKIN_BEHAVIOR__SWEETER') {
    s = Math.max(0, s - 1);
  } else if (skinCode === 'Q_SKIN_BEHAVIOR__SHARPER') {
    s = Math.min(3, s + 1);
  }

  return { sweet: s, raw: r, proj: p };
}

// ============================================================
// SECTION 1 â€” ARCHETYPES DATA + PAGE BUILDER
// ============================================================

(function() {

// â”€â”€ Mood images per archetype â”€â”€
var MOOD_IMAGES = {
  CEO: [
    'https://res.cloudinary.com/dcefrxxav/image/upload/v1787663848/ceo-1_n9ef5x.png',
    'https://res.cloudinary.com/dcefrxxav/image/upload/v1787663849/ceo-2_rdanc7.png',
    'https://res.cloudinary.com/dcefrxxav/image/upload/v1787663850/ceo-3_gscmk9.png'
  ],
  JAPAN: [
    'https://res.cloudinary.com/dcefrxxav/image/upload/v1787663911/japan-1_xzhzbu.png',
    'https://res.cloudinary.com/dcefrxxav/image/upload/v1787663914/japan-2_qiwdqu.png',
    'https://res.cloudinary.com/dcefrxxav/image/upload/v1787663918/japan-3_bmlhwe.png'
  ],
  HUG: [
    'https://res.cloudinary.com/dcefrxxav/image/upload/v1787663881/hug-1_hqooop.png',
    'https://res.cloudinary.com/dcefrxxav/image/upload/v1787663885/hug-2_qhur0i.png',
    'https://res.cloudinary.com/dcefrxxav/image/upload/v1787663888/hug-3_xu8mju.png'
  ],
  OFFGRID: [
    'https://res.cloudinary.com/dcefrxxav/image/upload/v1787663864/offgrid-1_z72a4e.png',
    'https://res.cloudinary.com/dcefrxxav/image/upload/v1787663867/offgrid-2_q7l7ht.png',
    'https://res.cloudinary.com/dcefrxxav/image/upload/v1787663869/offgrid-3_xn84rr.png'
  ],
  OUTOFTIME: [
    'https://res.cloudinary.com/dcefrxxav/image/upload/v1787663923/outoftime-1_k2ur5t.png',
    'https://res.cloudinary.com/dcefrxxav/image/upload/v1787663927/outoftime-2_buswpu.png',
    'https://res.cloudinary.com/dcefrxxav/image/upload/v1787663931/outoftime-3_ifhdwb.png'
  ],
  SUMMER: [
    'https://res.cloudinary.com/dcefrxxav/image/upload/v1787663940/summer-1_uwnuqw.png',
    'https://res.cloudinary.com/dcefrxxav/image/upload/v1787663944/summer-2_jzueb2.png',
    'https://res.cloudinary.com/dcefrxxav/image/upload/v1787663948/summer-3_isri5j.png'
  ],
  THERAPIST: [
    'https://res.cloudinary.com/dcefrxxav/image/upload/v1787663899/therapist-1_nqw30l.png',
    'https://res.cloudinary.com/dcefrxxav/image/upload/v1787663903/therapist-2_uhjuhf.png',
    'https://res.cloudinary.com/dcefrxxav/image/upload/v1787663906/therapist-3_jxcrfw.png'
  ]
};

// â”€â”€ Vinyl label colors per archetype â”€â”€
var VINYL_COLORS = {
  CEO: '#a43f35',
  JAPAN: '#607f90',
  HUG: '#7e3d30',
  OFFGRID: '#3c5d45',
  OUTOFTIME: '#604c65',
  SUMMER: '#c8a04a',
  THERAPIST: '#074d82'
};

// â”€â”€ S/R/P to percentage for scale bars â”€â”€
function srpToPercent(value) {
  // 0=0%, 1=33%, 2=66%, 3=100%
  if (isNaN(value)) return 50;
  return Math.round((value / 3) * 100);
}

// â”€â”€ Scale bar HTML builder â”€â”€
function buildScales(sweet, raw, proj) {
  var scales = [
    { left: 'Fresh', right: 'Sweet', value: srpToPercent(sweet) },
    { left: 'Gentle', right: 'Wild', value: srpToPercent(raw) },
    { left: 'Skin only', right: 'Fills the room', value: srpToPercent(proj) }
  ];
  return '<div class="fms-scales">' + scales.map(function(s) {
    return '<div class="fms-scale-row">' +
      '<span class="fms-scale-label">' + s.left + '</span>' +
      '<div class="fms-scale-track"><div class="fms-scale-dot" style="left:' + s.value + '%"></div></div>' +
      '<span class="fms-scale-label right">' + s.right + '</span>' +
      '</div>';
  }).join('') + '</div>';
}

const ARCHETYPES = {
  CEO: {
    you: 'You are',
    identity: 'politely unreachable.',
    descriptor: 'The one who left the party without saying goodbye.',
    desc: [
      "You have a Notion template for your personality. Your calendar is not a calendar. It's an argument you're winning against time.",
      "You've left at least three group chats this year - not out of drama, just efficiency. Your idea of relaxing is solving something. You're not a control freak. You just notice when things could be running better, which is always, which is the problem.",
      "You give feedback disguised as questions. You've described a vacation as \u201ca good opportunity to reset.\u201d You don't multitask. You single-task at a speed that looks like multitasking. You're not cold. You're just already three decisions ahead and slightly bored of where everyone else is.",
      "Your scent is the same: clean, sharp, no small talk. That's what a decision smells like."
    ],
    main: {
      name: 'Concrete', house: 'Comme des Gar\u00e7ons',
      desc: 'The decision itself. Sharp, confident, walks with high chin.',
      img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1776354725/1_mpedvv.png',
      link: 'https://noseparis.com/en/concrete'
    },
    alts: [
      { name: 'Legend', house: 'Montblanc', desc: "Doesn't surprise you. Doesn't need to. Shows up, delivers, leaves.", img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69e0bbc57bc50bbad5b648f1_Find%20My%20Smell.png', link: 'https://www.montblanc-bordeaux.fr/products/legend-eau-de-toilette-100-ml' },
      { name: 'Escentric 05', house: 'Escentric Molecules', desc: 'Fresh and focused like your new business venture.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69e0bc2082301bdff10b4568_2.png', link: 'https://www.escentric.com/en-eu/products/escentric-05-refill-30ml' },
      { name: 'Musky Oakmoss', house: 'Dossier', desc: 'Not there yet, but knows exactly what they want and is going for it.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69e0bc2b6da9778283cf250b_4.png', link: 'https://dossier.eu/fr/products/musky-oakmoss' }
    ],
    ingredients: [
      { name: 'Juniper', desc: 'The countryside air outside at 6am when nobody else is there.', detail: 'Piney, dry, slightly resinous with a bitterness underneath. Closer to the smell of a forest at altitude than a Christmas tree. There\'s something medicinal about it without being antiseptic. People smell juniper in "Light Blue" by D&G, in "Gypsy Water" by Byredo or in "Guilty" by Gucci.\nIn perfumery juniper is used to add sharpness and open-air clarity to a fragrance. Its molecules evaporate quickly, making it a top note \u2014 something that registers immediately and then recedes. It\'s the ingredient that makes a fragrance feel like cold air on a ski resort. Often paired with cedar, pepper, vetiver or aquatics.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885115/juniper_piiquy.jpg' },
      { name: 'Black Pepper', desc: 'Hot like a bathtub, short-lasting like a tropical rain.', detail: 'Dry, hot, and slightly woody that feels like a spice in food, awakening and sharp. There\'s a brightness to it that citrus doesn\'t have, and a dryness that keeps it from ever feeling too soft.\nIn perfumery it\'s used as an opener \u2014 the first thing you smell before a fragrance settles. Often paired with leather, rose, cedar, or vetiver.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885163/black_pepper_duelif.png' },
      { name: 'Cardamom', desc: 'Spiced but precise. Not warm like cinnamon, more like a very good espresso.', detail: 'Green, slightly sweet, and sharply aromatic. It sits between spice and freshness in a way nothing else does.\nIn perfumery cardamom is used to add sharpness without aggression. Often paired with leather, ginger, woods, or citrus.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885181/hf_20260428_134942_a25afcf7-fbd8-4089-94f2-9c1302266430_ncmbhn.png' },
      { name: 'Birch', desc: 'The smell of cold air just before a storm arrives.', detail: 'Woody, slightly smoky and sweet, with a dry almost mineral edge.\nIn perfumery birch is used to add a cold, structural quality. Often paired with cedar, raspberry, pepper, or leather.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885146/hf_20260428_134820_0b287d99-4482-4ad5-b5ca-fa10db72af93_zillk4.png' },
      { name: 'Cedar', desc: 'A freshly sharpened pencil. Clean and slightly dry.', detail: 'Dry, warm, and faintly dusty. In perfumery cedar is one of the most widely used root notes. The backbone of most masculine fragrance structures.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885200/hf_20260428_134734_dec13d8e-7f23-4471-9120-820ceb4926b0_xnruu5.png' }
    ]
  },
  JAPAN: {
    you: 'You are',
    identity: 'Insistently Calm',
    descriptor: 'You don\u2019t need to explain yourself.',
    desc: [
      "You've learned that most urgency is invented and most noise is optional.",
      "You have removed things from your life without announcing it, explaining it, or needing anyone to understand it.",
      "You don't need to be the most interesting person in the room. You're content being the one who noticed what was actually happening in it. People describe you as calming without knowing why. It's because you're not performing anything. The silence doesn't make you uncomfortable.",
      "Your scent is the same: clean, minimal, and says nothing unnecessary."
    ],
    main: { name: 'Dirty Hinoki', house: 'Heretic Parfum', desc: 'Not for everyone. For the ones who know what wabi-sabi means without googling it.', img: 'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69e88e6c2d41e3859e44d7c7_hinoki-dirty.png', link: 'https://hereticparfum.com/products/dirty-hinoki?variant=39270055346240' },
    alts: [
      { name: 'Tokyo', house: 'Gallivant', desc: 'Every note in its place. Nothing added. Nothing missing.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd2c2e7afa045bcf95a91_31.png', link: 'https://50-ml.fr/gallivant-tokyo-eau-de-parfum' },
      { name: 'Shiso', house: 'Roger & Gallet', desc: 'Clean like rain on stone. Quiet like a choice already made.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd2604905ef7597e42770_28.png', link: 'https://fr.roger-gallet.com/p/RG1013011WW/rg1013011ww-shiso-eau-parfumee-bienfaisante-heritage-100-ml' },
      { name: 'New Zealand', house: 'Demeter', desc: 'Far enough from everything to finally hear yourself.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd20ab5bab41035b380b7_27.png', link: 'https://demeterfragrance.com/products/new-zealand-cologne-spray' }
    ],
    ingredients: [
      { name: 'Green Tea', desc: 'The smell of water just before it boils. Green, slightly bitter.', detail: 'It is not sweet. In perfumery green tea adds a clean, slightly cool quality. Present but not loud.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885226/gree-tea_w4toim.jpg' },
      { name: 'Hinoki', desc: 'Warm water on cold hands.', detail: 'Woody, slightly citrusy, and clean in a way that feels ancient. In perfumery it adds a warm, clean woodiness.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885236/Hinoki_kwtliy.jpg' },
      { name: 'Iris', desc: 'The beginning of something great.', detail: 'Powdery, slightly earthy, with a cool almost metallic edge. One of the most expensive ingredients to produce.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885261/iris_zuvmbv.jpg' },
      { name: 'Elderflower', desc: 'A feeling of a good evening ahead.', detail: 'Delicate, slightly watery. The ingredient that makes a fragrance feel effortless.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885270/hf_20260428_134353_f762a115-cdd0-4303-b66c-0079aef4b627_v56tww.png' },
      { name: 'Rice', desc: 'The smell of something simple done perfectly.', detail: 'Soft, powdery, and faintly sweet. In perfumery rice creates intimacy rather than presence.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885277/hf_20260428_140116_d0ea1402-bbc7-478b-929c-a066835069d8_gd3pzg.png' }
    ]
  },
  HUG: {
    you: 'You are',
    identity: "someone's favourite person.",
    descriptor: 'The reason people stay longer than they planned.',
    desc: [
      "You have heard more confessions than a priest and you were just trying to eat your lunch.",
      "People find you and stay. Not because you're entertaining \u2014 because you make them feel like they're not too much. You listen in a way that most people don't.",
      "You remember the small things. The name of someone's dog. The thing they mentioned once six months ago. You bring it up and they look at you like you performed a magic trick, but it wasn't a trick, you just actually listened.",
      "You're warm without performing warmth. Calm without pretending. You make people feel like things are going to be okay. Most people spend their whole lives trying to make others feel that way. You do it without trying. Without noticing. Probably while also making tea.",
      "People don't remember what you said. They remember how they felt after.",
      "Your scent stays close, as warmth of the skin."
    ],
    main: { name: 'Eau Duelle', house: 'Diptyque', desc: 'It smells like being welcomed.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbc44fb8f35b9c43790fd0_hug-eau.png', link: 'https://www.diptyqueparis.com/fr_fr/p/eau-de-toilette-eau-duelle-100ml.html' },
    alts: [
      { name: 'You', house: 'Glossier', desc: 'Smells like someone who remembered how you take your coffee.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbcee14281bf63f688fe03_17.png', link: 'https://www.glossier.com/fr-fr/products/glossier-you-doux' },
      { name: 'Baby Powder', house: 'Demeter', desc: 'Unfamiliar at first. Then suddenly the only thing that feels right.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbcf8906d7f036ca2c3e1c_16.png', link: 'https://demeterfragrance.com/products/baby-powder-cologne-spray' },
      { name: 'By the Fireplace', house: 'Maison Margiela', desc: 'Nowhere to be. No one to perform for. Just this.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbcfb56f2a237bf857889b_18.png', link: 'https://www.my-origines.com/fr/by-the-fireplace-59L14132.html' }
    ],
    ingredients: [
      { name: 'Benzoin', desc: 'The smell of warmth without being sweet. A slight reminder of vanilla.', detail: 'Warm, slightly vanilla-like, with a soothing balsamic edge. In perfumery benzoin is used as a fixative.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885417/benzoin_dijcu9.jpg' },
      { name: 'Tonka Bean', desc: "Skin that's been in the sun and enjoyed it.", detail: 'Sweet, slightly powdery, with a faint almond edge. In perfumery tonka bean adds a soft, warm sweetness.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885364/hf_20260428_140101_28111ef5-544f-458d-856b-7a5b238273fb_oooaya.png' },
      { name: 'Beeswax', desc: 'A candle that just went out. Warm and sweet like honey.', detail: 'Honeyed, slightly powdery. In perfumery beeswax adds a soft, intimate warmth that stays very close to skin.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885380/hf_20260428_133547_88206f10-7510-47af-bccc-e2b0789a30ce_h02bmw.png' },
      { name: 'Myrrh', desc: 'Something ancient that still feels modern.', detail: 'Warm, slightly bitter, with a spicy depth. A true base note: slow to appear, slow to leave.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885410/hf_20260428_133745_7ca73248-3b95-44df-94d4-95b230a54217_gslxyb.png' },
      { name: 'Cocoa', desc: 'Not chocolate. The raw powder. Warm, slightly bitter, deeply comforting.', detail: 'Nutty, dusty, and faintly bitter. The ingredient that makes a fragrance feel like a hot comfort drink.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885403/hf_20260428_141332_1965b4a9-86e6-4d46-9f6b-f96d6dcb17d9_jxmaot.png' }
    ]
  },
  OFFGRID: {
    you: 'You are',
    identity: 'secretly planning to disappear.',
    descriptor: 'Nature is your reset button.',
    desc: [
      "You need space. Sometimes you think: \u201cI wish I lived in the middle of nowhere.\u201d And you mean it.",
      "You feel better after two hours outside. A long walk with no destination. A place with no signal. A morning that starts before anyone else is awake and belongs completely to you.",
      "You're not antisocial. You just have a very honest relationship with what actually restores you. You're not running from anything. You're running toward the version of your life where less is more.",
      "You are tougher than you look and softer than you let on. Both are true. Neither is the whole story.",
      "Your scent is earth, cold air, smoke, and something blooming through bark."
    ],
    main: { name: 'Coven', house: 'Andrea Maack', desc: 'Smells like being outside long enough to forget time.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbc4c4c9baefd1bb0ebf81_offgrid-coven.png', link: 'https://www.niche-beauty.com/fr-fr/produits/andrea-maack-coven/844-023' },
    alts: [
      { name: 'Baikal Leather Intense', house: 'Nicola\u00ef', desc: 'Cold enough to feel alive. Remote enough to feel free.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbcd7227b99461cba4c136_11.png', link: 'https://nicolaiparis.com/en/products/baikal-leather-intense-1' },
      { name: 'From the Garden', house: 'Maison Margiela', desc: 'Dirt under the nails. Sun on the neck. Nowhere else to be.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbcd4772c26d08b99d8316_10.png', link: 'https://www.my-origines.com/fr/from-the-garden-59L23139.html' },
      { name: 'Sandflowers', house: 'Montale', desc: 'Wind, salt, nothing on the calendar. Finally.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbce1eb318deb4d73590e9_8.png', link: 'https://montaleparfums.com/en/marine/70-376-sandflowers-argent.html' }
    ],
    ingredients: [
      { name: 'Black Walnut', desc: 'Dark, slightly bitter, and completely unique.', detail: 'Rich, earthy. In perfumery black walnut adds a dark, grounding earthiness.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885496/hf_20260428_133100_047c96e8-8c61-45c4-a73c-65eb468d5730_bm12s4.png' },
      { name: 'Sage', desc: 'Dry, slightly peppery like the meditation itself.', detail: 'There\'s a smokiness that makes it wilder than most herbs. In perfumery sage adds sharp, herbal clarity.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885503/sage_hame6q.jpg' },
      { name: 'Opoponax', desc: 'A fire that went out an hour ago but the wood is still warm.', detail: 'Sweet, warm spicy, and faintly smoky. In perfumery opoponax is a base note and fixative.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885531/Opoponax1_qnzzdh.png' },
      { name: 'Pine', desc: 'Forest. Cold air. Hike.', detail: 'Sharp, resinous, and clean. Gives fragrances a sense of open space and altitude.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885536/hf_20260428_132627_ea358af3-7764-49ee-b5e3-4015e19ad4fe_cl3jch.png' },
      { name: 'Vetiver', desc: 'Roots pulled from dark earth. Something honest about it.', detail: 'Smells like the earth itself. One of the most important base notes in existence.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885580/hf_20260428_140455_e4acec14-5d2c-4118-a1a6-c4e5dda006a0_eowwiz.png' }
    ]
  },
  OUTOFTIME: {
    you: 'You are',
    identity: 'chronically elsewhere.',
    descriptor: 'Present in body. Somewhere completely different in your head.',
    desc: [
      "You have a favourite kind of fog.",
      "You romanticise rain. You've described your ideal Friday night as \u201chonestly, just staying in.\u201d",
      "You're not antisocial. You're selective. You're more comfortable in almost-dark than in bright.",
      "You're atmospheric. You don't follow trends. You follow moods.",
      "People call you mysterious mostly because you don't explain yourself, and you find that explanation unnecessary.",
      "People find you interesting in a way they can't explain. That's because you're not trying to be interesting. You're just somewhere else.",
      "Your scent is mineral, dark and hidden. Smoke, shadow and something you can't quite name."
    ],
    main: { name: 'Gris Clair', house: 'Serge Lutens', desc: "Smells like a thought you've been having for years.", img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbc609137dcd257a6dd5ae_outoftime-gris.png', link: 'https://sergelutens.fr/products/gris-clair-eau-de-parfum-spray' },
    alts: [
      { name: 'Aromatics Elixir', house: 'Clinique', desc: 'From an era when excess was a philosophy.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd0a99c6d03bf461752c9_23.png', link: 'https://www.clinique.fr/product/aromatics-elixir-eau-de-parfum-spray?size=45_ml' },
      { name: 'Encre Noire', house: 'Lalique', desc: 'Dark, deliberate, and completely unbothered.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd0609c6d03bf461738ee_22.png', link: 'https://www.notino.fr/lalique/encre-noire-for-men-eau-de-toilette-pour-homme/p-62724/' },
      { name: 'Grey Flannel', house: 'Geoffrey Beene', desc: 'Smells like staying in when everyone else went out.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd01c7659885dec161fb2_21.png', link: 'https://www.my-origines.com/fr/grey-flannel-09118624.html' }
    ],
    ingredients: [
      { name: 'Violet', desc: 'Dusty, powdery and soft like a touch.', detail: 'Chalky, slightly sweet. One of the few florals that introverts rather than projects.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885635/violet1_tirxvl.png' },
      { name: 'Incense', desc: 'Smoke from something ceremonial.', detail: 'Dry, smoky, slightly sweet. Adds a meditative depth that few ingredients can replicate.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885644/hf_20260428_132415_f8646aa3-8b2f-4452-986a-0c9744ed4252_jjekcd.png' },
      { name: 'Orris Root', desc: 'Powdery and vintage. Like the gala dinner in a fancy place.', detail: 'One of the most expensive and labor-intensive ingredients in existence.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885651/hf_20260428_132444_7a44eefa-413e-4ff4-9a35-9b1c13d09f1d_fu1eem.png' },
      { name: 'Wet Stone', desc: 'Mineral and cold but somehow calming.', detail: 'Clean and slightly metallic. Adds a fresh cool quality that few natural ingredients can achieve.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885655/wet-stone1_dz7ohe.png' },
      { name: 'Black Currant', desc: 'Dark, slightly dangerous, and nothing like the juice.', detail: 'The raw bud smells nothing like the fruit. Adds a dark, slightly raw edge.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885658/hf_20260428_131925_dd783dbb-36c7-474e-9a4a-3328f6d7df2a_rymcb7.png' }
    ]
  },
  SUMMER: {
    you: 'You are',
    identity: 'pathologically chill.',
    descriptor: 'Every good holiday has one of you.',
    desc: [
      "You've planned a trip for a group of people who couldn't agree on anything and somehow made everyone happy.",
      "You move easily between plans and people. You keep things light without losing the thread. You are not naive about how things work \u2014 you're optimistic, which is different.",
      "You bring the energy up without turning the volume up. You make complicated situations feel simpler just by being in them.",
      "You don't need drama to feel alive. You have momentum, which lasts longer and causes fewer problems. People feel better after spending time with you and can't always say why.",
      "Your scent is a warm stone on the beach, warm air, and the feeling that today is going to work out."
    ],
    main: { name: 'Solo Vulcan', house: 'Loewe', desc: "Smells like momentum. The kind that doesn't need a plan.", img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbc743841913865b2a9338_summer-solo.png', link: 'https://www.perfumesloewe.com/int/en_FR/men/loewe-solo/loewe-solo-vulcan-edp-100ml-LW80620.html' },
    alts: [
      { name: 'Avgoustos', house: 'Parfums de Marly', desc: 'Heat, salt, time slowing down on purpose.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd48441e84e3b0ceb7289_34.png', link: 'https://www.korres.fr/products/eau-de-toilette-avgoustos' },
      { name: 'Bois de Yuzu', house: 'Karl Lagerfeld', desc: 'The night is young and so is the conversation.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd43a7659885dec179a63_33.png', link: 'https://www.notino.fr/karl-lagerfeld/bois-de-yuzu-eau-de-toilette-pour-homme/p-15791163/' },
      { name: 'Un Jardin sur le Nil', house: 'Herm\u00e8s', desc: 'Moves like you do. Light, unhurried, and somehow everywhere at once.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd4b7d360f752977ab6c9_35.png', link: 'https://www.hermes.com/fr/fr/product/un-jardin-sur-le-nil-eau-de-toilette-V26993/' }
    ],
    ingredients: [
      { name: 'Tiare', desc: 'A white flower in warm wind. Slightly sweet and fresh.', detail: 'Creamy, soft. One of the few florals that feels genuinely warm.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885741/tiare1_xmotv4.png' },
      { name: 'Sea Salt', desc: 'Your skin an hour after swimming. Mineral and light.', detail: 'Clean, slightly bitter. Adds a clean, sparkly feeling that is open and uncontained.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885744/sea-salt1_iwtvlx.png' },
      { name: 'Carrot Seed', desc: 'Warm, dry, and nothing like the vegetable.', detail: 'Earthy, slightly spicy. Adds the warmth of a stone in the sun all afternoon.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885747/hf_20260428_131402_8546c5c2-655b-471f-b044-c0f7e4fdaa74_drbx9q.png' },
      { name: 'Grass', desc: 'The smell of summer.', detail: 'Slightly sweet and immediately recognisable. On skin it becomes less lawn, more open air.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885751/hf_20260428_131409_f4c0d2a1-c968-49cc-900d-7fee2c9566c9_csz0mi.png' },
      { name: 'Cucumber', desc: 'Cool, watery, slightly green. The smell of something refreshing.', detail: 'Clean, faintly sweet. The ingredient that makes a fragrance feel like relief.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885753/hf_20260428_131017_162611d5-70ae-4e8e-b89f-dcfda00ddbc7_kt2ucz.png' }
    ]
  },
  THERAPIST: {
    you: 'You are',
    identity: 'dangerously empathetic.',
    descriptor: 'You already know. You always do.',
    desc: [
      "You know things about people that they haven't told you yet. Not because you pry \u2014 because you pay attention in a way most people don't.",
      "You are warm, but precise. You know when someone needs to hear the hard thing and you know how to say it.",
      "You have standards for everything \u2014 your space, your time, the conversations you're willing to have. Not because you're difficult. Because you know what works and you've stopped apologising for it.",
      "People feel seen around you, which means they sometimes avoid you when they're not ready to be seen. You understand. You wait.",
      "You're not for everyone. You've made your peace with that. Actually, you prefer it.",
      "Your scent is warm, deep, and already decided. Something that doesn't need to explain itself."
    ],
    main: { name: 'Black Tea', house: 'Jil Sander', desc: "Smells like the conversation you didn't want to end.", img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbc802f2d99f701a1415fd_therapist-blacktea.png', link: 'https://www.jilsander.com/fr-fr/jil-sander-black-tea-100-ml/J65YX0006JFR001998.html' },
    alts: [
      { name: 'Geranio Imperiale', house: 'Culti Milano', desc: 'Sharp enough to notice everything. Composed enough not to mention most of it.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd3d5e80c9c7c162eedbe_44.png', link: 'https://www.notino.fr/culti/geranio-imperiale-aquae-di-profumo-eau-de-toilette-mixte/' },
      { name: '1472 La Divina Commedia', house: 'Histoires de Parfums', desc: "Knows exactly where it ends. That's what makes it safe.", img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd3679c6d03bf4618308b_41.png', link: 'https://www.notino.fr/histoires-de-parfums/1472-eau-de-parfum-mixte/p-16349773/' },
      { name: '702', house: 'Bon Parfumeur', desc: "Smells like someone who already thought of everything.", img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd3a1d34b8acd99b18bb2_42.png', link: 'https://www.bonparfumeur.com/fr/products/702-incense-lavender-and-cashmere-wood' }
    ],
    ingredients: [
      { name: 'Oud', desc: 'A very enveloping smell. Dense and sticky.', detail: 'Dark, woody, deeply complex. The smell is ancient, layered, impossible to forget.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885775/oud1_bi4wwt.png' },
      { name: 'Sandalwood', desc: 'Warm wood in late afternoon light. Creamy and liquid.', detail: 'Soft, creamy, faintly sweet. In perfumery sandalwood supports, it doesn\'t compete.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885845/sandalwood_szlhj7.png' },
      { name: 'Patchouli', desc: 'The smell of roots - not dirt, but depth.', detail: 'Earthy, dark, slightly sweet. Not the heavy 1970s version. Adds grounding earthiness.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885848/patchouli1_mz9hrh.png' },
      { name: 'Black Tea', desc: "A cup that's been steeping just long enough. Warm, slightly bitter, attentive.", detail: 'Dry, slightly wine-like, faintly smoky. Adds warm, slightly bitter sophistication.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885852/hf_20260428_130858_f0573332-8837-41bd-b9d6-b45adb7c73f3_mohca3.png' },
      { name: 'Beetroot', desc: 'Dark, slightly sweet, and completely unexpected on skin.', detail: 'Earthy, faintly sweet. Closer to damp earth and iron than anything edible.', img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885864/hf_20260428_130445_076b2947-292d-4493-9637-1eeb7a7199a5_nkqpoi.png' }
    ]
  }
};

var FMS_ARCH_COLORS = {
  CEO:       { zoneBg: 'transparent', titleColor: '#a43f35', textColor: '#2a2a2a', ruleColor: '#2a2a2a' },
  JAPAN:     { zoneBg: 'transparent', titleColor: '#5f7d8e', textColor: '#2a2a2a', ruleColor: '#2a2a2a' },
  HUG:       { zoneBg: '#b8a66a',     titleColor: '#7e3d30', textColor: '#1a1a1a', ruleColor: '#7e3d30' },
  OFFGRID:   { zoneBg: '#3c5d45',     titleColor: '#ffffff', textColor: '#e8f0e0', ruleColor: 'rgba(255,255,255,0.3)' },
  OUTOFTIME: { zoneBg: '#303437',     titleColor: '#604c65', textColor: '#ffffff', ruleColor: 'rgba(255,255,255,0.3)' },
  SUMMER:    { zoneBg: 'transparent', titleColor: '#a43f35', textColor: '#2a2a2a', ruleColor: '#2a2a2a' },
  THERAPIST: { zoneBg: '#074d82',     titleColor: '#ffffff', textColor: '#ffffff', ruleColor: 'rgba(255,255,255,0.3)' }
};

// ============================================================
// SECTION 1A â€” INGREDIENT MODAL (unchanged)
// ============================================================

function injectModalStyles() {
  if (document.getElementById('fms-modal-styles')) return;
  var style = document.createElement('style');
  style.id = 'fms-modal-styles';
  style.textContent = '#fms-modal-overlay{display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.72);align-items:center;justify-content:center;padding:20px;box-sizing:border-box;}#fms-modal-overlay.fms-modal-open{display:flex;}#fms-modal-box{background:rgba(0,0,0,0.45);border:1px solid rgba(255,255,255,0.08);max-width:520px;width:100%;max-height:88vh;overflow-y:auto;border-radius:4px;position:relative;padding:0;}#fms-modal-close{position:absolute;top:16px;right:16px;background:none;border:none;color:rgba(255,255,255,0.5);font-size:20px;line-height:1;cursor:pointer;padding:4px 8px;z-index:2;transition:color 0.2s;}#fms-modal-close:hover{color:#fff;}#fms-modal-img{width:100%;height:240px;object-fit:cover;display:block;border-radius:4px 4px 0 0;}#fms-modal-body{padding:28px 28px 32px;}#fms-modal-name{font-size:22px;font-weight:600;color:#fff;letter-spacing:0.02em;margin:0 0 8px;}#fms-modal-phrase{font-size:13px;color:rgba(255,255,255,0.45);font-style:italic;margin:0 0 20px;line-height:1.5;}#fms-modal-detail{font-size:14px;color:rgba(255,255,255,0.72);line-height:1.75;white-space:pre-line;margin:0;}';
  document.head.appendChild(style);
}

function buildModal() {
  if (document.getElementById('fms-modal-overlay')) return;
  injectModalStyles();
  var overlay = document.createElement('div');
  overlay.id = 'fms-modal-overlay';
  overlay.innerHTML = '<div id="fms-modal-box"><button id="fms-modal-close" aria-label="Close">\u2715</button><img id="fms-modal-img" src="" alt=""><div id="fms-modal-body"><div id="fms-modal-name"></div><div id="fms-modal-phrase"></div><div id="fms-modal-detail"></div></div></div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) closeModal(); });
  overlay.querySelector('#fms-modal-close').addEventListener('click', closeModal);
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeModal(); });
}

function openModal(ingredient) {
  var overlay = document.getElementById('fms-modal-overlay');
  if (!overlay) return;
  overlay.querySelector('#fms-modal-img').src = ingredient.img;
  overlay.querySelector('#fms-modal-img').alt = ingredient.name;
  overlay.querySelector('#fms-modal-name').textContent = ingredient.name;
  overlay.querySelector('#fms-modal-phrase').textContent = ingredient.desc;
  overlay.querySelector('#fms-modal-detail').textContent = ingredient.detail;
  overlay.classList.add('fms-modal-open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  var overlay = document.getElementById('fms-modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('fms-modal-open');
  document.body.style.overflow = '';
}

// ============================================================
// SECTION 1B â€” PAGE BUILDER (REBUILT for new layout)
// ============================================================

function buildBlock(key, arch) {
  var block = document.querySelector('[data-result="' + key + '"]');
  if (!block) return;
  [...block.children].forEach(function(c) { c.style.display = 'none'; });

  var ac = FMS_ARCH_COLORS[key] || { zoneBg: 'transparent', titleColor: '#8B3A22', textColor: '#2a2a2a', ruleColor: '#2a2a2a' };
  var moodImgs = MOOD_IMAGES[key] || [];
  var vinylColor = VINYL_COLORS[key] || '#7e3d30';

  // â”€â”€ Split desc: first paragraph = pull quote, rest = body rows, last = closer â”€â”€
  var descArr = arch.desc.slice();
  var pullQuote = descArr.shift();
  var closerText = descArr.pop();
  var bodyParagraphs = descArr;

  // â•â•â• ZONE 2 â€” PERSONALITY (Option A) â•â•â•
  var z2 = document.createElement('div');
  z2.className = 'fms-zone fms-z2';

  // Header
  var z2Header = '<div class="fms-z2-header">' +
    '<span class="fms-z2-eyebrow">yOur ScenT pErsoNality</span>' +
    '<hr class="fms-z2-rule">' +
    '</div>';

  // Pull quote + vinyl
  var vinylId = 'vinyl-' + key;
  var z2Pull = '<div class="fms-z2-pull">' +
    '<div class="fms-z2-pull-text" style="color:' + ac.titleColor + ';">' + pullQuote + '</div>' +
    '<div class="vinyl-wrap" data-vinyl="' + key + '">' +
    '<div class="vinyl-record vinyl-spin paused" data-vinyl-record="' + key + '">' +
    '<div class="vinyl-label" style="background:' + vinylColor + ';"></div>' +
    '<div class="vinyl-hole"></div>' +
    '</div>' +
    '<div class="vinyl-arm-wrap"><div class="vinyl-arm-pivot" style="background:' + vinylColor + '55;"></div>' +
    '<div class="vinyl-arm" data-vinyl-arm="' + key + '" style="background:linear-gradient(180deg,' + vinylColor + '99 0%,' + vinylColor + '44 100%);"></div></div>' +
    '<div class="vinyl-status" data-vinyl-status="' + key + '">tap to play</div>' +
    '</div></div>';

  // Body rows alternating with mood images
  var z2Rows = '';
  for (var i = 0; i < bodyParagraphs.length; i++) {
    var isReverse = (i % 2 === 1);
    var imgSrc = moodImgs[i] || '';
    var imgHTML = imgSrc ? '<img class="fms-z2-row-img" src="' + imgSrc + '" alt="">' : '';
    z2Rows += '<div class="fms-z2-row' + (isReverse ? ' reverse' : '') + '">' +
      '<div class="fms-z2-row-text">' + bodyParagraphs[i] + '</div>' +
      imgHTML +
      '</div>';
  }

  // Closer
  var z2Closer = '<div class="fms-z2-closer"><div class="fms-z2-closer-text">' + closerText + '</div></div>';

  // Ingredients
  var ingredientsHTML = '';
  if (arch.ingredients) {
    var itemsHTML = arch.ingredients.map(function(ing, idx) {
      return '<div class="fms-ingredient-item">' +
        '<img class="fms-ingredient-img" src="' + ing.img + '" alt="' + ing.name + '">' +
        '<div class="fms-ingredient-body">' +
        '<div class="fms-ingredient-name">' + ing.name + '</div>' +
        '<div class="fms-ingredient-desc">' + ing.desc + '</div>' +
        '<button class="fms-ingredient-readmore" data-archetype="' + key + '" data-index="' + idx + '">Read more</button>' +
        '</div></div>';
    }).join('');
    ingredientsHTML = '<div class="fms-ingredients">' +
      '<span class="fms-ingredients-label">Ingredients worth discovering</span>' +
      '<p class="fms-ingredients-intro">These are the building blocks of your scent profile. Next time you\'re in a perfume shop, ask to smell them \u2014 you\'ll start recognising what you\'re drawn to.</p>' +
      '<div class="fms-ingredients-list">' + itemsHTML + '</div>' +
      '</div>';
  }

  z2.innerHTML = z2Header + z2Pull + z2Rows + z2Closer + ingredientsHTML + '<div class="fms-z3-label">your scent</div>';
  block.appendChild(z2);

  // â•â•â• ZONE 3 â€” MAIN MATCH â•â•â•
  var z3 = document.createElement('div');
  z3.className = 'fms-zone fms-z3';

  var mainSweet = !isNaN(arch.main.sweet) ? arch.main.sweet : 1;
  var mainRaw = !isNaN(arch.main.raw) ? arch.main.raw : 0;
  var mainProj = !isNaN(arch.main.proj) ? arch.main.proj : 1;

  z3.innerHTML = '<img class="fms-z3-bottle" src="' + arch.main.img + '" alt="' + arch.main.name + '" crossorigin="anonymous">' +
    '<div class="fms-z3-name">' + arch.main.name + '</div>' +
    '<div class="fms-z3-house">' + arch.main.house + '</div>' +
    '<p class="fms-z3-experience">' + (arch.main.desc || '') + '</p>' +
    '<div class="fms-z3-scales">' + buildScales(mainSweet, mainRaw, mainProj) + '</div>' +
    '<a class="fms-z3-cta" href="' + arch.main.link + '" target="_blank" rel="noopener">discover \u2192</a>';
  block.appendChild(z3);

  // â•â•â• ZONE 4 â€” ALTERNATIVES GRID â•â•â•
  var z4 = document.createElement('div');
  z4.className = 'fms-zone fms-z4';

  var altsHTML = arch.alts.map(function(a) {
    var aSweet = !isNaN(a.sweet) ? a.sweet : 1;
    var aRaw = !isNaN(a.raw) ? a.raw : 0;
    var aProj = !isNaN(a.proj) ? a.proj : 1;
    return '<div class="fms-z4-card">' +
      '<div class="fms-z4-img-wrap"><img src="' + a.img + '" alt="' + a.name + '" crossorigin="anonymous"></div>' +
      '<div class="fms-z4-shadow"></div>' +
      '<div class="fms-z4-card-name">' + a.name + '</div>' +
      '<div class="fms-z4-card-brand">' + a.house + '</div>' +
      '<p class="fms-z4-card-experience">' + (a.desc || '') + '</p>' +
      '<div class="fms-z4-card-scales">' + buildScales(aSweet, aRaw, aProj) + '</div>' +
      '<a class="fms-z4-card-cta" href="' + a.link + '" target="_blank" rel="noopener">discover \u2192</a>' +
      '</div>';
  }).join('');

  z4.innerHTML = '<div class="fms-z4-header">' +
    '<span class="fms-z4-label">Also consider</span>' +
    '<span class="fms-z4-sublabel">Same energy, different character</span>' +
    '</div>' +
    '<div class="fms-z4-grid">' + altsHTML + '</div>';
  block.appendChild(z4);

  // â•â•â• ZONE 5 â€” EMAIL â•â•â•
  var z5 = document.createElement('div');
  z5.className = 'fms-zone fms-z5';
  z5.innerHTML = '<div class="fms-z5-email" id="fms-email-' + key + '">' +
    '<div class="fms-z5-email-title">Want to keep this?</div>' +
    '<div class="fms-z5-email-sub">Your full archetype. The ingredients that chose you. One email, nothing else.</div>' +
    '<div class="fms-z5-email-row"><input class="fms-z5-email-input" id="fms-ei-' + key + '" type="email" placeholder="your@email.com"><button class="fms-z5-email-send" id="fms-es-' + key + '">Send my result</button></div>' +
    '<div class="fms-z5-email-consent"><input type="checkbox" id="fms-ec-' + key + '"><label class="fms-z5-email-consent-label" for="fms-ec-' + key + '">I agree to receive my quiz result by email. One email only, no marketing. <a href="/privacy-policy" target="_blank">Privacy policy</a>.</label></div>' +
    '<div class="fms-z5-email-msg" id="fms-em-' + key + '"></div></div>';
  block.appendChild(z5);

  // Email wiring
  var emailInput   = z5.querySelector('#fms-ei-' + key);
  var emailSend    = z5.querySelector('#fms-es-' + key);
  var emailConsent = z5.querySelector('#fms-ec-' + key);
  var emailMsg     = z5.querySelector('#fms-em-' + key);
  var APPS_URL     = 'https://script.google.com/macros/s/AKfycbxLaOnGVCv3P8ge0cKaP59ZdYUcgySLo7CUUhef4eltooQqg59W35MPzZ6CVtsnifA/exec';

  emailSend.addEventListener('click', function() {
    var email = emailInput.value.trim();
    if (!email || !email.includes('@')) { emailMsg.textContent = 'Please enter a valid email address.'; emailMsg.className = 'fms-z5-email-msg error'; return; }
    if (!emailConsent.checked) { emailMsg.textContent = 'Please check the consent box to continue.'; emailMsg.className = 'fms-z5-email-msg error'; return; }
    emailSend.disabled = true;
    emailSend.textContent = 'Sending\u2026';
    emailMsg.textContent = '';
    emailMsg.className = 'fms-z5-email-msg';
    var winner = (sessionStorage.getItem('quiz_result') || localStorage.getItem('quiz_result') || '').toUpperCase();
    var scores = {};
    try { scores = JSON.parse(localStorage.getItem('quiz_scores') || '{}'); } catch(e2) {}
    var answers = sessionStorage.getItem('quiz_answers') || localStorage.getItem('quiz_answers') || '';
    var open_answer = sessionStorage.getItem('quiz_open') || localStorage.getItem('quiz_open') || '';
    var consent_aggregate = localStorage.getItem('consent_aggregate') === 'true';
    var consent_email = emailConsent.checked;
    var matchedArch = window.FMS_FULL_ARCH && winner ? window.FMS_FULL_ARCH[winner] : null;
    var matched_main = null;
    var matched_alts = null;
    if (matchedArch && matchedArch.main) {
      matched_main = { name: matchedArch.main.name, house: matchedArch.main.house, desc: matchedArch.main.desc, link: matchedArch.main.link };
      if (matchedArch.alts && matchedArch.alts.length) {
        matched_alts = matchedArch.alts.map(function(a) { return { name: a.name, house: a.house, desc: a.desc, link: a.link }; });
      }
    }
    fetch(APPS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'payload=' + encodeURIComponent(JSON.stringify({
        email: email, winner: winner, scores: scores, answers: answers, open_answer: open_answer,
        page_url: window.location.href, consent_aggregate: consent_aggregate, consent_email: consent_email,
        matched_main: matched_main, matched_alts: matched_alts
      }))
    })
    .then(function(r) { return r.text(); })
    .then(function(t) {
      if (t && t.indexOf('error') === -1) { emailMsg.textContent = 'Done! Check your inbox in a few minutes.'; emailMsg.className = 'fms-z5-email-msg success'; emailSend.textContent = 'Sent \u2713'; }
      else { throw new Error(t); }
    })
    .catch(function(err) {
      emailMsg.textContent = 'Something went wrong. Please try again.';
      emailMsg.className = 'fms-z5-email-msg error';
      emailSend.disabled = false;
      emailSend.textContent = 'Send my result';
    });
  });
}

// ============================================================
// SECTION 1C â€” CMS OVERRIDE with S/R/P MATCHING (unchanged)
// ============================================================

function loadCMSPerfumes() {
  var items = document.querySelectorAll('[data-perfume="item"]');
  if (!items.length) return;

  var userPrefs = getUserSRP();
  console.log('\u2705 User S/R/P prefs:', userPrefs);

  var perfumes = [];
  items.forEach(function(item) {
    var nameEl = item.querySelector('[data-name]');
    var brandEl = item.querySelector('[data-brand]');
    var archetypeEl = item.querySelector('[data-archetype]');
    var linkEl = item.querySelector('[data-link]');
    var imgEl = item.querySelector('[data-img]');
    var descEl = item.querySelector('[data-desc]');
    var mainEl = item.querySelector('[data-main]');
    var sweetEl = item.querySelector('[data-sweet]');
    var rawEl = item.querySelector('[data-raw]');
    var projEl = item.querySelector('[data-proj]');
    if (!nameEl || !archetypeEl) return;

    var sweetVal = sweetEl ? parseInt(sweetEl.textContent.trim(), 10) : NaN;
    var rawVal = rawEl ? parseInt(rawEl.textContent.trim(), 10) : NaN;
    var projVal = projEl ? parseInt(projEl.textContent.trim(), 10) : NaN;

    perfumes.push({
      name: nameEl.textContent.trim(),
      brand: brandEl ? brandEl.textContent.trim() : '',
      archetype: archetypeEl.textContent.trim().toUpperCase(),
      isMain: !!(mainEl && mainEl.textContent.trim().toLowerCase() === 'true'),
      link: linkEl ? linkEl.textContent.trim() : '',
      img: imgEl ? imgEl.src : '',
      desc: descEl ? descEl.textContent.trim() : '',
      sweet: sweetVal,
      raw: rawVal,
      proj: projVal
    });
  });

  if (!perfumes.length) return;

  var byArchetype = {};
  perfumes.forEach(function(p) {
    if (!byArchetype[p.archetype]) byArchetype[p.archetype] = [];
    byArchetype[p.archetype].push(p);
  });

  Object.keys(byArchetype).forEach(function(key) {
    if (!ARCHETYPES[key]) return;
    var bottles = byArchetype[key];

    var srpBottles = bottles.filter(function(b) {
      return !isNaN(b.sweet) && !isNaN(b.raw) && !isNaN(b.proj);
    });

    if (srpBottles.length > 0 && userPrefs) {
      srpBottles.forEach(function(b) {
        b.distance = Math.abs(b.sweet - userPrefs.sweet)
                   + Math.abs(b.raw - userPrefs.raw)
                   + Math.abs(b.proj - userPrefs.proj);
      });
      srpBottles.sort(function(a, b) { return a.distance - b.distance; });

      console.log('\u2705 ' + key + ' matched:', srpBottles.map(function(b) {
        return b.name + ' (d=' + b.distance + ')';
      }).join(', '));

      var best = srpBottles[0];
      ARCHETYPES[key].main = {
        name: best.name,
        house: best.brand,
        link: best.link,
        img: best.img,
        desc: best.desc || ARCHETYPES[key].main.desc,
        sweet: best.sweet,
        raw: best.raw,
        proj: best.proj
      };

      ARCHETYPES[key].alts = srpBottles.slice(1, 4).map(function(b) {
        return {
          name: b.name,
          house: b.brand,
          link: b.link,
          img: b.img,
          desc: b.desc,
          sweet: b.sweet,
          raw: b.raw,
          proj: b.proj
        };
      });

    } else {
      var mainBottle = bottles.find(function(b) { return b.isMain; });
      var altBottles = bottles.filter(function(b) { return !b.isMain; });

      if (mainBottle) {
        ARCHETYPES[key].main.name = mainBottle.name;
        ARCHETYPES[key].main.house = mainBottle.brand;
        ARCHETYPES[key].main.link = mainBottle.link;
        ARCHETYPES[key].main.img = mainBottle.img;
        if (mainBottle.desc) ARCHETYPES[key].main.desc = mainBottle.desc;
        ARCHETYPES[key].main.sweet = mainBottle.sweet;
        ARCHETYPES[key].main.raw = mainBottle.raw;
        ARCHETYPES[key].main.proj = mainBottle.proj;
      }
      if (altBottles.length) {
        ARCHETYPES[key].alts = altBottles.map(function(a) {
          return { name: a.name, house: a.brand, link: a.link, img: a.img, desc: a.desc, sweet: a.sweet, raw: a.raw, proj: a.proj };
        });
      }
    }
  });
}

// ============================================================
// SECTION 1D â€” VINYL PLAYER INIT
// ============================================================

function initVinylPlayers() {
  var wraps = document.querySelectorAll('[data-vinyl]');
  wraps.forEach(function(wrap) {
    var key = wrap.getAttribute('data-vinyl');
    var record = wrap.querySelector('[data-vinyl-record="' + key + '"]');
    var arm = wrap.querySelector('[data-vinyl-arm="' + key + '"]');
    var status = wrap.querySelector('[data-vinyl-status="' + key + '"]');
    var isPlaying = false;
    var audio = null;

    wrap.addEventListener('click', function() {
      if (!audio) {
        audio = new Audio();
        // Audio src will be set per archetype when tracks are ready
        audio.loop = true;
        audio.volume = 0.4;
      }
      if (isPlaying) {
        isPlaying = false;
        record.classList.add('paused');
        arm.classList.remove('playing');
        status.textContent = 'tap to play';
        if (audio.src) audio.pause();
      } else {
        isPlaying = true;
        record.classList.remove('paused');
        arm.classList.add('playing');
        status.textContent = 'playing';
        if (audio.src) audio.play().catch(function() {});
      }
    });
  });
}

// ============================================================
// SECTION 1E â€” INIT
// ============================================================

function init() {
  buildModal();
  loadCMSPerfumes();
  Object.entries(ARCHETYPES).forEach(function(entry) {
    buildBlock(entry[0], entry[1]);
  });

  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.fms-ingredient-readmore');
    if (!btn) return;
    var archetypeKey = btn.getAttribute('data-archetype');
    var idx = parseInt(btn.getAttribute('data-index'), 10);
    var ingredient = ARCHETYPES[archetypeKey] && ARCHETYPES[archetypeKey].ingredients[idx];
    if (ingredient) openModal(ingredient);
  });

  initVinylPlayers();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 1000); });
} else {
  setTimeout(init, 1000);
}

window.FMS_FULL_ARCH = ARCHETYPES;

})();
