// ============================================================
// SECTION 1 — ARCHETYPES DATA + PAGE BUILDER
// ============================================================

(function() {

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
      name: 'Concrete', house: 'Comme des Garçons',
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
      {
        name: 'Juniper',
        desc: 'The countryside air outside at 6am when nobody else is there.',
        detail: 'Piney, dry, slightly resinous with a bitterness underneath. Closer to the smell of a forest at altitude than a Christmas tree. There\'s something medicinal about it without being antiseptic. People smell juniper in "Light Blue" by D&G, in "Gypsy Water" by Byredo or in "Guilty" by Gucci.\nIn perfumery juniper is used to add sharpness and open-air clarity to a fragrance. Its molecules evaporate quickly, making it a top note — something that registers immediately and then recedes. It\'s the ingredient that makes a fragrance feel like cold air on a ski resort. Often paired with cedar, pepper, vetiver or aquatics.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885115/juniper_piiquy.jpg'
      },
      {
        name: 'Black Pepper',
        desc: 'Hot like a bathtub, short-lasting like a tropical rain.',
        detail: 'Dry, hot, and slightly woody that feels like a spice in food, awakening and sharp. There\'s a brightness to it that citrus doesn\'t have, and a dryness that keeps it from ever feeling too soft.\nIn perfumery it\'s used as an opener — the first thing you smell before a fragrance settles. This is because its aromatic molecules are small and light, which means they evaporate fast and hit your nose immediately, then make way for what comes next. It pushes other ingredients forward rather than blending into them. Often paired with leather, rose, cedar, or vetiver.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885163/black_pepper_duelif.png'
      },
      {
        name: 'Cardamom',
        desc: 'Spiced but precise. Not warm like cinnamon, more like a very good espresso.',
        detail: 'Green, slightly sweet, and sharply aromatic. It sits between spice and freshness in a way nothing else does — it has heat without heaviness. You know it from food, from coffee, from the inside of a Middle Eastern grocery store. On skin it behaves very differently. People find this note in "Le Male" by Jean Paul Gaultier.\nIn perfumery cardamom is used to add sharpness without aggression. Its molecules evaporate at medium speed, after the first impression but before the base settles. It gives a fragrance precision. Often paired with leather, ginger, woods, or citrus.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885181/hf_20260428_134942_a25afcf7-fbd8-4089-94f2-9c1302266430_ncmbhn.png'
      },
      {
        name: 'Birch',
        desc: 'The smell of cold air just before a storm arrives.',
        detail: 'Woody, slightly smoky and sweet, with a dry almost mineral edge. Not a tree smell, but more like the atmosphere around the tree. Clean in a way that feels exposed rather than polished. One of the most famous fragrances that people report birch in is "Ombre Nomade" by Louis Vuitton.\nIn perfumery birch is used to add a cold, structural quality that most ingredients can\'t achieve. It\'s often processed into birch tar (a darker, smokier version), which appears in high-end skincare and leather-adjacent fragrances. Its molecules are medium-weight, sitting in the heart and base of a fragrance. Often paired with cedar, raspberry, pepper, or leather.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885146/hf_20260428_134820_0b287d99-4482-4ad5-b5ca-fa10db72af93_zillk4.png'
      },
      {
        name: 'Cedar',
        desc: 'A freshly sharpened pencil. Clean and slightly dry.',
        detail: 'Dry, warm, and faintly dusty — the smell of pale wood rather than dark. Not resinous or heavy. Clean in the way that raw materials are clean before anything is done to them. Used by brands to give autumn atmosphere.\nIn perfumery cedar is one of the most widely used root notes, that means it\'s one of the last things you smell as a fragrance dries down on skin. Its molecules are heavy and slow to evaporate, which is why it lingers. It gives structure to fragrances that might otherwise feel too soft or too fleeting. Has many pairings on the market. The backbone of most masculine fragrance structures.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885200/hf_20260428_134734_dec13d8e-7f23-4471-9120-820ceb4926b0_xnruu5.png'
      }
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
    main: {
      name: 'Dirty Hinoki', house: 'Heretic Parfum',
      desc: 'Not for everyone. For the ones who know what wabi-sabi means without googling it.',
      img: 'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69e88e6c2d41e3859e44d7c7_hinoki-dirty.png',
      link: 'https://hereticparfum.com/products/dirty-hinoki?variant=39270055346240'
    },
    alts: [
      { name: 'Tokyo', house: 'Gallivant', desc: 'Every note in its place. Nothing added. Nothing missing.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd2c2e7afa045bcf95a91_31.png', link: 'https://50-ml.fr/gallivant-tokyo-eau-de-parfum' },
      { name: 'Shiso', house: 'Roger & Gallet', desc: 'Clean like rain on stone. Quiet like a choice already made.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd2604905ef7597e42770_28.png', link: 'https://fr.roger-gallet.com/p/RG1013011WW/rg1013011ww-shiso-eau-parfumee-bienfaisante-heritage-100-ml' },
      { name: 'New Zealand', house: 'Demeter', desc: 'Far enough from everything to finally hear yourself.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd20ab5bab41035b380b7_27.png', link: 'https://demeterfragrance.com/products/new-zealand-cologne-spray' }
    ],
    ingredients: [
      {
        name: 'Green Tea',
        desc: 'The smell of water just before it boils. Green, slightly bitter.',
        detail: 'It is not sweet. There\'s a slight bitterness underneath the green that keeps it from ever feeling soft or floral. It smells like focusing on something. A lot of brands use different types of teas from wulong to jasmine.\nIn perfumery green tea is used to add a clean, slightly cool quality that sits between fresh and herbal. Its molecules evaporate at medium speed, placing it in the heart of a fragrance — present but not loud. It\'s one of the few ingredients that smells exactly like what it is, which is rarer than it sounds. Has very different pairings depending on a perfume brief from citrusy to fruity.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885226/gree-tea_w4toim.jpg'
      },
      {
        name: 'Hinoki',
        desc: 'Warm water on cold hands.',
        detail: 'Woody, slightly citrusy, and clean in a way that feels ancient rather than clinical. Hinoki is Japanese cypress — the wood used in traditional bathhouses and temples. You may not have smelled it labeled as hinoki, but if you\'ve ever been in a high-end spa and noticed the wood smelling like something more than just wood, that was probably it.\nIn perfumery hinoki is used to add a warm, clean woodiness that doesn\'t feel heavy. Its molecules sit in the base and heart of a fragrance, evaporating slowly and leaving a quiet, mineral warmth on skin. Often paired with green tea, iris, or bergamot.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885236/Hinoki_kwtliy.jpg'
      },
      {
        name: 'Iris',
        desc: 'The beginning of something great.',
        detail: 'Powdery, slightly earthy, with a cool almost metallic edge underneath. Not a flower smell exactly, but more of a root, which is where the scent actually comes from. One of the most famous fragrances with this ingredient is Dior Homme.\nIn perfumery iris is one of the most expensive ingredients to produce. The root takes three years to mature before it can be processed. This is why it appears mostly in higher-end fragrances. Its molecules are heavy and slow, making it a base note that lingers on skin long after everything else has gone. It adds a cool, powdery depth that grounds a fragrance without warming it. Often paired with woods, tonka bean, musk, or other flowers.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885261/iris_zuvmbv.jpg'
      },
      {
        name: 'Elderflower',
        desc: 'A feeling of a good evening ahead.',
        detail: 'Delicate, slightly watery, with a soft green quality underneath the flower. Not sweet like rose or loud like jasmine, but more like the smell of something blooming in a wild garden. You know it from tonic water, from Japanese-style drinks, from high-end cocktails. It\'s the ingredient that makes a fragrance feel effortless.\nIn perfumery elderflower is used to add a light, airy floral quality without the heaviness that most flowers bring. Its molecules evaporate quickly, placing it in the top and heart of a fragrance: present at first, then gradually making way for what\'s underneath. It softens without sweetening. Often paired with fruits, lavender, or clean musks.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885270/hf_20260428_134353_f762a115-cdd0-4303-b66c-0079aef4b627_v56tww.png'
      },
      {
        name: 'Rice',
        desc: 'The smell of something simple done perfectly.',
        detail: 'Soft, powdery, and faintly sweet without being sugary. The smell of rice cooking is one of the most universally recognisable in the world. On skin it becomes something quieter and closer, almost like clean fabric. It is mostly used by modern brands including Kilian, Maison Margiela, d.grayi, Diptyque and others.\nIn perfumery rice is used to add a soft, powdery warmth that sits very close to the skin. This makes it one of the few ingredients that creates intimacy rather than presence. Often extracted as rice bran or rice milk in formulations. Paired with musk, iris, or light woods. It makes fragrances feel minimal but present.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885277/hf_20260428_140116_d0ea1402-bbc7-478b-929c-a066835069d8_gd3pzg.png'
      }
    ]
  },
  HUG: {
    you: 'You are',
    identity: "someone's favourite person.",
    descriptor: 'The reason people stay longer than they planned.',
    desc: [
      "You have heard more confessions than a priest and you were just trying to eat your lunch.",
      "People find you and stay. Not because you're entertaining — because you make them feel like they're not too much. You listen in a way that most people don't.",
      "You remember the small things. The name of someone's dog. The thing they mentioned once six months ago. You bring it up and they look at you like you performed a magic trick, but it wasn't a trick, you just actually listened.",
      "You're warm without performing warmth. Calm without pretending. You make people feel like things are going to be okay. Most people spend their whole lives trying to make others feel that way. You do it without trying. Without noticing. Probably while also making tea.",
      "People don't remember what you said. They remember how they felt after.",
      "Your scent stays close, as warmth of the skin."
    ],
    main: {
      name: 'Eau Duelle', house: 'Diptyque',
      desc: 'It smells like being welcomed.',
      img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbc44fb8f35b9c43790fd0_hug-eau.png',
      link: 'https://www.diptyqueparis.com/fr_fr/p/eau-de-toilette-eau-duelle-100ml.html'
    },
    alts: [
      { name: 'You', house: 'Glossier', desc: 'Smells like someone who remembered how you take your coffee.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbcee14281bf63f688fe03_17.png', link: 'https://www.glossier.com/fr-fr/products/glossier-you-doux' },
      { name: 'Baby Powder', house: 'Demeter', desc: 'Unfamiliar at first. Then suddenly the only thing that feels right.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbcf8906d7f036ca2c3e1c_16.png', link: 'https://demeterfragrance.com/products/baby-powder-cologne-spray' },
      { name: 'By the Fireplace', house: 'Maison Margiela', desc: 'Nowhere to be. No one to perform for. Just this.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbcfb56f2a237bf857889b_18.png', link: 'https://www.my-origines.com/fr/by-the-fireplace-59L14132.html' }
    ],
    ingredients: [
      {
        name: 'Benzoin',
        desc: 'The smell of warmth without being sweet. A slight reminder of vanilla',
        detail: 'Warm, slightly vanilla-like, with a soothing balsamic edge. It comes from the sap of a tree found in Southeast Asia, not something you\'d encounter in a kitchen, but recognisable the moment you smell it. It\'s the ingredient behind that warm, skin-like quality in certain candles and incense. Tom Ford, Matiere Premiere, Celine and others use it in their creations.\nIn perfumery benzoin is used as a fixative — its molecules are heavy and slow to evaporate, which means it extends the life of everything around it. It anchors a fragrance to skin and keeps it there. Often paired with iris, carrot, white flowers, or patchouli.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885417/benzoin_dijcu9.jpg'
      },
      {
        name: 'Tonka Bean',
        desc: "Skin that's been in the sun and enjoyed it.",
        detail: 'Sweet, slightly powdery, with a faint almond edge underneath. Not sugary, but more like the warmth of something that\'s been sitting in the sun all afternoon. You might know it from certain pipe tobaccos or artisan chocolates. On skin it becomes even warmer, almost indistinguishable from your own smell.\nIn perfumery tonka bean is used to add a soft, warm sweetness that doesn\'t announce itself. Its molecules are heavy and slow, placing it firmly in the base of a fragrance — the part that stays closest to skin the longest (more than a few hours). It blends seamlessly with almost everything. Depending on the perfume brief often paired with vetiver, acid fruit, vanilla or cedar.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885364/hf_20260428_140101_28111ef5-544f-458d-856b-7a5b238273fb_oooaya.png'
      },
      {
        name: 'Beeswax',
        desc: 'A candle that just went out. Warm and sweet like honey.',
        detail: 'Honeyed, slightly powdery, with a warm waxy quality that feels like your own personal garden. Not the smell of honey exactly, more like the wax itself, which is quieter and less sweet. You know it from candles or from a lip balm.\nIn perfumery beeswax is used to add a soft, intimate warmth that stays very close to skin. Its molecules are heavy and evaporate slowly, making it a base note that lingers quietly long after the rest of the fragrance has moved on. It rounds sharp edges and softens everything around it. Often paired with lavender, ginger and musks.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885380/hf_20260428_133547_88206f10-7510-47af-bccc-e2b0789a30ce_h02bmw.png'
      },
      {
        name: 'Myrrh',
        desc: 'Something ancient that still feels modern.',
        detail: 'Warm, slightly bitter, with a spicy depth underneath. Not a smell most people can name immediately, but one they recognise the moment they encounter it: from incense, from high-end skincare, from churches or temples or somewhere that held something ceremonial. It\'s older than most smells you know. Used by many brands from Dries Van Notten to Jo Malone.\nIn perfumery myrrh is used to add a deep, warm quality that grounds everything above it. Its molecules are among the heaviest in perfumery, making it a true base note: slow to appear, slow to leave. Often paired with benzoin, honey, or florals.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885410/hf_20260428_133745_7ca73248-3b95-44df-94d4-95b230a54217_gslxyb.png'
      },
      {
        name: 'Cocoa',
        desc: 'Not chocolate. The raw powder. Warm, slightly bitter, deeply comforting.',
        detail: 'Nutty, dusty, and faintly bitter, closer to unsweetened baking cocoa than anything you\'d eat. There\'s a warmth to it that doesn\'t come from sweetness but from something deeper and more mineral. You know it from bakeries, from the inside of a tin of good hot chocolate, from the smell of someone\'s kitchen on a cold afternoon.\nIn perfumery cocoa is used to add a warm, slightly gourmand depth. Its molecules sit in the heart and base of a fragrance, evaporating slowly and blending easily with resins, musks, and warm woods. It\'s the ingredient that makes a fragrance feel like a hot comfort drink. Often paired with citrus, sandalwood, or vanilla.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885403/hf_20260428_141332_1965b4a9-86e6-4d46-9f6b-f96d6dcb17d9_jxmaot.png'
      }
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
      "You have a complicated relationship with small talk, open offices, and anything described as \u201cnetworking.\u201d",
      "You are tougher than you look and softer than you let on. Both are true. Neither is the whole story.",
      "Your scent is earth, cold air, smoke, and something blooming through bark."
    ],
    main: {
      name: 'Coven', house: 'Andrea Maack',
      desc: 'Smells like being outside long enough to forget time. Wet earth. Roots. Cold air on skin.',
      img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbc4c4c9baefd1bb0ebf81_offgrid-coven.png',
      link: 'https://www.niche-beauty.com/fr-fr/produits/andrea-maack-coven/844-023'
    },
    alts: [
      { name: 'Baikal Leather Intense', house: 'Nicolaï', desc: 'Cold enough to feel alive. Remote enough to feel free.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbcd7227b99461cba4c136_11.png', link: 'https://nicolaiparis.com/en/products/baikal-leather-intense-1' },
      { name: 'From the Garden', house: 'Maison Margiela', desc: 'Dirt under the nails. Sun on the neck. Nowhere else to be.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbcd4772c26d08b99d8316_10.png', link: 'https://www.my-origines.com/fr/from-the-garden-59L23139.html' },
      { name: 'Sandflowers', house: 'Montale', desc: 'Wind, salt, nothing on the calendar. Finally.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbce1eb318deb4d73590e9_8.png', link: 'https://montaleparfums.com/en/marine/70-376-sandflowers-argent.html' }
    ],
    ingredients: [
      {
        name: 'Black Walnut',
        desc: 'Dark, slightly bitter, and completely unique.',
        detail: 'Rich, earthy, and faintly sharp with a raw, slightly tannic edge that sets it apart from regular walnut. Not a food smell, more like the woody shell. You might find it in artisan food shops, specialty skincare, or certain niche perfumes and candles.\nIn perfumery black walnut is used to add a dark, grounding earthiness that sits in the base of a fragrance. Its molecules are heavy and slow to evaporate, giving it staying power on skin. It adds a raw, slightly bitter depth that keeps fragrances from feeling polished or refined. Often paired with vetiver, smoke, or dark woods. Or as a gourmand twist with chocolate, vanilla or alcohol.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885496/hf_20260428_133100_047c96e8-8c61-45c4-a73c-65eb468d5730_bm12s4.png'
      },
      {
        name: 'Sage',
        desc: 'Dry, slightly peppery like the meditation itself.',
        detail: 'There\'s a smokiness underneath it that makes it feel wilder than most herbs. You know it from cooking, from smudge sticks, from certain skincare products. On skin it becomes drier and more mineral than you expect.\nIn perfumery sage is used to add a sharp, herbal clarity that feels outdoor and unpolished. Its molecules evaporate at medium speed, placing it in the heart of a fragrance. It\'s one of the few herbal ingredients that doesn\'t soften in a fragrance, it stays dry and slightly icy throughout. Often paired with citrus, herbals, earth notes, or smoke. Used by brands like YSL, Valentino, Dossier.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885503/sage_hame6q.jpg'
      },
      {
        name: 'Opoponax',
        desc: 'A fire that went out an hour ago but the wood is still warm.',
        detail: 'Sweet, warm spicy, and faintly smoky — myrrh is its close relative. It comes from a plant resin found in East Africa and the Middle East. You might know it from incense or from certain natural perfumes. It smells like something that was burning a long time ago and left its warmth in the walls. One of the most famous fragrances with this ingredient added is "Shalimar" by Guerlain.\nIn perfumery opoponax is used as a base note and fixative. Its heavy molecules evaporate slowly and extend everything around them. It adds a warm, smoky sweetness that doesn\'t feel gourmand. Often paired with woods.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885531/Opoponax1_qnzzdh.png'
      },
      {
        name: 'Pine',
        desc: 'Forest. Cold air. Hike.',
        detail: 'Sharp, resinous, and clean, but colder and more icy than the pine of Christmas candles. The real smell of pine is harder than most people expect. You know it from forests or from mountain air. Used by brands like Filippo Sorcinelli, Serge Lutens, Comme des Garçons, famous "Gypsy Water" by Byredo.\nIn perfumery pine is used to add a cold, outdoor sharpness that most ingredients can\'t achieve. Its molecules are light and volatile, making it a top note — the first thing you encounter before a fragrance settles into its deeper layers. It gives fragrances a sense of open space and altitude. Often paired with sage, vetiver, or smoke.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885536/hf_20260428_132627_ea358af3-7764-49ee-b5e3-4015e19ad4fe_cl3jch.png'
      },
      {
        name: 'Vetiver',
        desc: 'Roots pulled from dark earth. Something honest about it.',
        detail: 'It comes from the roots of a grass native to India, and the smell is unmistakably subterranean. You might know it from certain colognes or natural skincare. It smells like the earth itself rather than anything that grows from it. It makes fragrances feel like they were found rather than made. Large amount of perfume brands (from Chanel to Frederic Malle) have used it to create scents.\nIn perfumery vetiver is one of the most important base notes in existence. Its molecules are extremely heavy and slow to evaporate, which means it stays on skin for hours after everything else has gone. It grounds fragrances that might otherwise float away, and adds a raw, smoky depth that synthetic ingredients rarely replicate convincingly.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885580/hf_20260428_140455_e4acec14-5d2c-4118-a1a6-c4e5dda006a0_eowwiz.png'
      }
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
    main: {
      name: 'Gris Clair', house: 'Serge Lutens',
      desc: "Smells like a thought you've been having for years and finally stopped fighting.",
      img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbc609137dcd257a6dd5ae_outoftime-gris.png',
      link: 'https://sergelutens.fr/products/gris-clair-eau-de-parfum-spray'
    },
    alts: [
      { name: 'Aromatics Elixir', house: 'Clinique', desc: 'From an era when excess was a philosophy. You understand why.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd0a99c6d03bf461752c9_23.png', link: 'https://www.clinique.fr/product/aromatics-elixir-eau-de-parfum-spray?size=45_ml' },
      { name: 'Encre Noire', house: 'Lalique', desc: 'Dark, deliberate, and completely unbothered by your reaction to it.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd0609c6d03bf461738ee_22.png', link: 'https://www.notino.fr/lalique/encre-noire-for-men-eau-de-toilette-pour-homme/p-62724/' },
      { name: 'Grey Flannel', house: 'Geoffrey Beene', desc: 'Smells like staying in when everyone else went out. And being right about it.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd01c7659885dec161fb2_21.png', link: 'https://www.my-origines.com/fr/grey-flannel-09118624.html' }
    ],
    ingredients: [
      {
        name: 'Violet',
        desc: 'Dusty, powdery and soft like a touch.',
        detail: 'Chalky, slightly sweet, with a cool green edge underneath the flower. Not a loud floral scent. There\'s something faintly nostalgic about it without being sentimental. You might know it from certain old-fashioned sweets or from vintage lipstick.\nIn perfumery violet is used to add a soft, powdery depth that sits between floral and earthy. Its molecules evaporate at medium speed, placing it in the heart of a fragrance which is present for few hours. It\'s one of the few florals that introverts rather than projects, which is why it appears so often in fragrances built around restraint and "quiet luxury". Often paired with tobacco, flowers, fruits and used by brands like Byredo or Guerlain.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885635/violet1_tirxvl.png'
      },
      {
        name: 'Incense',
        desc: 'Smoke from something ceremonial.',
        detail: 'Dry, smoky, and slightly sweet with a warm resinous quality underneath. The smell most people know from churches, temples, or yoga studios. It\'s the smoke rather than the resin itself that particular quality of something burning slowly and deliberately. On skin it becomes quieter and more personal than you expect.\nIn perfumery incense is used to add a smoky, meditative depth that very few other ingredients can replicate. It\'s used by modern brands from Etat Libre d\'Orange to Comme des Garçons. Its molecules are heavy and slow, so it lingers longer on skin. It makes everything around it feel more deliberate, like the fragrance has a reason for existing. Often paired with musks, vanilla and woods.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885644/hf_20260428_132415_f8646aa3-8b2f-4452-986a-0c9744ed4252_jjekcd.png'
      },
      {
        name: 'Orris Root',
        desc: 'Powdery and vintage. Like the gala dinner in a fancy place.',
        detail: 'Powdery, and faintly earthy, it comes from the dried root of the iris plant, which takes three years to mature and another three to process. The smell is vintage in a way that\'s hard to explain. It makes fragrances feel like they carry a history. You might encounter it in high-end skincare or niche perfumery like Celine, Maison Crivelli or Nishane.\nIn perfumery orris is one of the most expensive and labor-intensive ingredients in existence. Its heavy molecules sit deep in the base of a fragrance, evaporating slowly and leaving a trace on skin for hours. It adds a quiet, almost melancholic depth that synthetic ingredients rarely replicate. Often paired with vanilla, violet, incense, or leather.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885651/hf_20260428_132444_7a44eefa-413e-4ff4-9a35-9b1c13d09f1d_fu1eem.png'
      },
      {
        name: 'Wet Stone',
        desc: 'Mineral and cold but somehow calming.',
        detail: 'Clean and slightly metallic: the smell of a stone lifted from a riverbed or a rock surface after rain. Not earthy like soil. More mineral, more precise. It\'s one of those smells that\'s immediately calming in a way you can\'t quite explain. Entirely real and entirely discoverable. Try and find any stone near water and you already know this smell. Used by niche brands.\nIn perfumery wet stone is used to add a fresh cool quality that very few natural ingredients can achieve. It\'s often replicated through a combination of aquatic and mineral molecules that evaporate quickly, placing it at the top of a fragrance. It\'s the first things you smell with your nose before everything else arrives. It makes fragrances feel like cold air on skin. Often paired with mint, incense or dark resins.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885655/wet-stone1_dz7ohe.png'
      },
      {
        name: 'Black Currant',
        desc: 'Dark, slightly dangerous, and nothing like the juice.',
        detail: 'The raw bud smells nothing like the fruit. It\'s darker, sharper, with an almost smoky edge that surprises most people the first time they encounter it, although it\'s not for everyone. It\'s strange in the best possible way. Found in certain niche fragrances and artisan candles, occasionally in high-end skincare. Worth seeking out specifically because it doesn\'t smell like you expect. People hear it in many brands from Dries Van Notten and Floraiku to Valentino and Creed.\nIn perfumery blackcurrant bud is used to add a dark, slightly raw edge that cuts through sweetness and adds complexity. Its molecules evaporate at medium speed, sitting in the heart of a fragrance, so it lasts a few hours. It\'s the ingredient that makes people stop and ask what they\'re smelling. Often paired with flowers, dark woods and sometimes citrus.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885658/hf_20260428_131925_dd783dbb-36c7-474e-9a4a-3328f6d7df2a_rymcb7.png'
      }
    ]
  },
  SUMMER: {
    you: 'You are',
    identity: 'pathologically chill.',
    descriptor: 'Every good holiday has one of you.',
    desc: [
      "You've planned a trip for a group of people who couldn't agree on anything and somehow made everyone happy.",
      "You move easily between plans and people. You keep things light without losing the thread. You are not naive about how things work — you're optimistic, which is different.",
      "You bring the energy up without turning the volume up. You make complicated situations feel simpler just by being in them.",
      "You don't need drama to feel alive. You have momentum, which lasts longer and causes fewer problems. People feel better after spending time with you and can't always say why.",
      "Your scent is a warm stone on the beach, warm air, and the feeling that today is going to work out."
    ],
    main: {
      name: 'Solo Vulcan', house: 'Loewe',
      desc: "Smells like momentum. The kind that doesn't need a plan.",
      img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbc743841913865b2a9338_summer-solo.png',
      link: 'https://www.perfumesloewe.com/int/en_FR/men/loewe-solo/loewe-solo-vulcan-edp-100ml-LW80620.html'
    },
    alts: [
      { name: 'Avgoustos', house: 'Parfums de Marly', desc: 'Heat, salt, time slowing down on purpose.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd48441e84e3b0ceb7289_34.png', link: 'https://www.korres.fr/products/eau-de-toilette-avgoustos' },
      { name: 'Bois de Yuzu', house: 'Karl Lagerfeld', desc: 'The night is young and so is the conversation.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd43a7659885dec179a63_33.png', link: 'https://www.notino.fr/karl-lagerfeld/bois-de-yuzu-eau-de-toilette-pour-homme/p-15791163/' },
      { name: 'Un Jardin sur le Nil', house: 'Hermès', desc: 'Moves like you do. Light, unhurried, and somehow everywhere at once.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd4b7d360f752977ab6c9_35.png', link: 'https://www.hermes.com/fr/fr/product/un-jardin-sur-le-nil-eau-de-toilette-V26993/' }
    ],
    ingredients: [
      {
        name: 'Tiare',
        desc: 'A white flower in warm wind. Slightly sweet and fresh.',
        detail: 'Creamy, soft, and faintly exotic. Tiare is the flower used in monoi oil, which you might know from suncare products or hair oils with a Polynesian origin. It\'s a white flower that blooms in heat, and it smells exactly like that - summery, cozy and slightly sweet. It can quickly go from niche to mass market depending on supporting ingredients. Our must-try is "Heliodose" by Marlou.\nIn perfumery tiare is used to add a warm, tropical floral quality that doesn\'t feel heavy or overdone. Its molecules evaporate at medium speed, placing it in the heart of a fragrance where it adds a soft, sunny depth. It\'s one of the few florals that feels genuinely warm and not powdery. Often paired with coconut, citrus, other white flowers, or light musks.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885741/tiare1_xmotv4.png'
      },
      {
        name: 'Sea Salt',
        desc: 'Your skin an hour after swimming. Mineral and light.',
        detail: 'Clean, slightly bitter, and unmistakably coastal: the smell of skin that\'s been in the ocean and dried in the sun. You know it from the beach, from certain skincare products, from the air in a coastal town first thing in the morning. It makes fragrances feel like being somewhere rather than wearing something.\nIn perfumery sea salt is used to add a clean, sparkly feeling that is open and uncontained. Its molecules are light and volatile, making it a top note: the first impression of a fragrance before you smell other ingredients. It gives fragrances a sense of space and air that very few other ingredients can achieve. Often paired with milky, woody or flowery notes.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885744/sea-salt1_iwtvlx.png'
      },
      {
        name: 'Carrot Seed',
        desc: 'Warm, dry, and nothing like the vegetable.',
        detail: 'Earthy, slightly spicy, with a dry woody edge underneath. Carrot seed is extracted from the seeds of the wild carrot plant and smells nothing like the food. It\'s warmer and more complex than that. You might find it in natural skincare and aromatherapy oils — it\'s been used in both for centuries: warm without being heavy and spicy without being sharp. Carrot seed is used by LV, Tom Ford, Amouage, Prada, Kilian, Byredo, Nishane and many others.\nIn perfumery carrot seed is used to add a warm, slightly spicy depth that sits in the heart and base of a fragrance. It\'s the ingredient that makes summer feel like more than just a light day, it adds the warmth of a stone that\'s been in the sun all afternoon. Often paired with citrus, seeds, florals, or green notes.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885747/hf_20260428_131402_8546c5c2-655b-471f-b044-c0f7e4fdaa74_drbx9q.png'
      },
      {
        name: 'Grass',
        desc: 'The smell of summer.',
        detail: 'Slightly sweet, and immediately recognisable: freshly cut grass is one of the most universally known smells in the world. There\'s a freshness caused by the plant releasing compounds the moment it\'s cut. You\'ve smelled it your entire life. On skin it becomes cleaner and more abstract: less lawn, more open air. Hermes uses it for it\'s fresh scents.\nIn perfumery grass is used to add a fresh, green brightness that feels immediately like outdoors. Its molecules are light and volatile, making it a top note that evaporates quickly and doesn\'t stay on skin for very long. Often paired with light florals, citrus, fruity notes.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885751/hf_20260428_131409_f4c0d2a1-c968-49cc-900d-7fee2c9566c9_csz0mi.png'
      },
      {
        name: 'Cucumber',
        desc: 'Cool, watery, slightly green. The smell of something refreshing.',
        detail: 'Clean, faintly sweet, and almost transparent, like a sip of sparkling water on a hot day. The smell of cucumber is one of the most immediately refreshing things you can encounter. There\'s a watery quality to it that feels refreshing and cooling. You know it from skincare, from spa water, or even from slicing a cucumber on a hot afternoon. On skin it becomes even more subtle and barely present.\nIn perfumery cucumber is used to add a cool, watery freshness that sits very close to skin. Its molecules are light and evaporate quickly, making it a top note that stays not very long on the skin and creates an immediate impression of just getting out of shower before giving way to warmer ingredients. It\'s the ingredient that makes a fragrance feel like relief. Often paired with sea salt, grass, or light aquatics. Never sweet enough to be gourmand.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885753/hf_20260428_131017_162611d5-70ae-4e8e-b89f-dcfda00ddbc7_kt2ucz.png'
      }
    ]
  },
  THERAPIST: {
    you: 'You are',
    identity: 'dangerously empathetic.',
    descriptor: 'You already know. You always do.',
    desc: [
      "You know things about people that they haven't told you yet. Not because you pry — because you pay attention in a way most people don't.",
      "You are warm, but precise. You know when someone needs to hear the hard thing and you know how to say it.",
      "You have standards for everything — your space, your time, the conversations you're willing to have. Not because you're difficult. Because you know what works and you've stopped apologising for it.",
      "People feel seen around you, which means they sometimes avoid you when they're not ready to be seen. You understand. You wait.",
      "You're not for everyone. You've made your peace with that. Actually, you prefer it.",
      "Your scent is warm, deep, and already decided. Something that doesn't need to explain itself."
    ],
    main: {
      name: 'Black Tea', house: 'Jil Sander',
      desc: "Smells like the conversation you didn't want to end.",
      img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbc802f2d99f701a1415fd_therapist-blacktea.png',
      link: 'https://www.jilsander.com/fr-fr/jil-sander-black-tea-100-ml/J65YX0006JFR001998.html'
    },
    alts: [
      { name: 'Geranio Imperiale', house: 'Culti Milano', desc: 'Sharp enough to notice everything. Composed enough not to mention most of it.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd3d5e80c9c7c162eedbe_44.png', link: 'https://www.notino.fr/culti/geranio-imperiale-aquae-di-profumo-eau-de-toilette-mixte/' },
      { name: '1472 La Divina Commedia', house: 'Histoires de Parfums', desc: "Knows exactly where it ends. That's what makes it safe to be around.", img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd3679c6d03bf4618308b_41.png', link: 'https://www.notino.fr/histoires-de-parfums/1472-eau-de-parfum-mixte/p-16349773/' },
      { name: '702', house: 'Bon Parfumeur', desc: "Smells like someone who already thought of everything so you don't have to.", img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd3a1d34b8acd99b18bb2_42.png', link: 'https://www.bonparfumeur.com/fr/products/702-incense-lavender-and-cashmere-wood' }
    ],
    ingredients: [
      {
        name: 'Oud',
        desc: 'A very enveloping smell. Dense and sticky.',
        detail: 'Dark, woody, and deeply complex with a raw edge that makes it unlike anything else. It comes from the resin that forms inside agarwood trees when they become infected, which is why it\'s one of the rarest and most expensive ingredients in perfumery. The smell is ancient, layered, and slightly medicinal, not immediately comfortable, but impossible to forget once you\'ve encountered it. You can find it in Middle Eastern perfume shops or high-end fragrance counters where it\'s taken seriously.\nIn perfumery oud is used as a base note of extraordinary longevity. Its molecules are among the heaviest in existence, evaporating extremely slowly and staying on skin for hours and sometimes days. It transforms everything around it, pulling lighter ingredients into its orbit and making fragrances feel like they have a history. Often paired with sandalwood, rose, or dark resins.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885775/oud1_bi4wwt.png'
      },
      {
        name: 'Sandalwood',
        desc: 'Warm wood in late afternoon light. Creamy and liquid.',
        detail: 'Soft, creamy, and faintly sweet with a warm, milky quality that feels closer to skin than to forest. Real sandalwood, from Mysore in India or the Timor islands, is one of the smoothest smells in existence. You might know it from incense, from certain soaps, from high-end skincare. It has a quietness and familiarity that makes everything around it feel calmer.\nIn perfumery sandalwood is one of the most important base notes ever used. Its molecules are heavy and evaporate slowly, creating a warm, creamy foundation that blends seamlessly with almost any other ingredient. It doesn\'t compete with other ingredients, it supports. Often used to smooth the edges of darker ingredients like oud or patchouli, making fragrances feel warmer and more approachable without losing their depth.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885845/sandalwood_szlhj7.png'
      },
      {
        name: 'Patchouli',
        desc: 'The smell of roots - not dirt, but depth.',
        detail: 'Earthy, dark, and slightly sweet with a rich, almost fermented quality underneath. Not the heavy, overwhelming version most people associate with the 1970s. In small, precise amounts it adds a dark, grounding earthiness that makes everything around it feel more substantial. You might know it from certain high-end candles or niche fragrances where it\'s handled carefully.\nIn perfumery patchouli is used as a base note (one of the last scents you\'ll hear). Its heavy molecules evaporate slowly and extend the life of everything above them. It adds depth and giving power to fragrances that might otherwise feel too light or too fleeting. Often paired with sandalwood, oud, or dark resins. The ingredient that lets the perfume stay on your skin longer.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885848/patchouli1_mz9hrh.png'
      },
      {
        name: 'Black Tea',
        desc: "A cup that's been steeping just long enough. Warm, slightly bitter, attentive.",
        detail: 'Dry, slightly wine-like, and faintly smoky with a warm, almost leathery quality underneath. Not the sweet version from a bottle in the supermarket, but the real thing, kind of like a Turkish tea. On skin it becomes warmer and more complex, closer to the smell of fire than the tea drink.\nIn perfumery black tea is used to add a warm, slightly bitter sophistication that sits in the heart of a fragrance. Its molecules evaporate at medium speed, staying present through the middle of a fragrance\'s life on skin: after the first impression, so you won\'t be able to smell it right away. It adds a dry, attentive quality that keeps fragrances from feeling too soft or too sweet. Often paired with sandalwood, oud, or light musks.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885852/hf_20260428_130858_f0573332-8837-41bd-b9d6-b45adb7c73f3_mohca3.png'
      },
      {
        name: 'Beetroot',
        desc: 'Dark, slightly sweet, and completely unexpected on skin.',
        detail: 'Earthy, faintly sweet, with a deep mineral quality underneath that\'s unlike anything else. Raw beetroot smells nothing like cooked beetroot. It\'s darker and more complex, closer to damp earth and iron than anything edible. Most people have never thought of it as a perfume ingredient, which is exactly why it works here. Find it at any market, slice one open and smell it before it\'s cooked. That\'s the smell. Brands using it are Comme des Garçons, Diptyque, Boy Smells, Jo Malone and others.\nIn perfumery beetroot is used as an unexpected dark note that adds an earthy, slightly sweet complexity to the base of a fragrance. Its molecules are heavy and slow, evaporating gradually and leaving a mineral warmth on skin. Often paired with dark woods, resins, or tea notes.',
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885864/hf_20260428_130445_076b2947-292d-4493-9637-1eeb7a7199a5_nkqpoi.png'
      }
    ]
  }
};

// ============================================================
// SECTION 1A — INGREDIENT MODAL
// ============================================================

function injectModalStyles() {
  if (document.getElementById('fms-modal-styles')) return;
  const style = document.createElement('style');
  style.id = 'fms-modal-styles';
  style.textContent = [
    '#fms-modal-overlay {',
    '  display: none;',
    '  position: fixed;',
    '  inset: 0;',
    '  z-index: 9999;',
    '  background: rgba(0,0,0,0.72);',
    '  align-items: center;',
    '  justify-content: center;',
    '  padding: 20px;',
    '  box-sizing: border-box;',
    '}',
    '#fms-modal-overlay.fms-modal-open {',
    '  display: flex;',
    '}',
    '#fms-modal-box {',
    '  background: #1a1a1a;',
    '  border: 1px solid rgba(255,255,255,0.08);',
    '  max-width: 520px;',
    '  width: 100%;',
    '  max-height: 88vh;',
    '  overflow-y: auto;',
    '  border-radius: 4px;',
    '  position: relative;',
    '  padding: 0;',
    '}',
    '#fms-modal-close {',
    '  position: absolute;',
    '  top: 16px;',
    '  right: 16px;',
    '  background: none;',
    '  border: none;',
    '  color: rgba(255,255,255,0.5);',
    '  font-size: 20px;',
    '  line-height: 1;',
    '  cursor: pointer;',
    '  padding: 4px 8px;',
    '  z-index: 2;',
    '  transition: color 0.2s;',
    '}',
    '#fms-modal-close:hover { color: #fff; }',
    '#fms-modal-img {',
    '  width: 100%;',
    '  height: 240px;',
    '  object-fit: cover;',
    '  display: block;',
    '  border-radius: 4px 4px 0 0;',
    '}',
    '#fms-modal-body {',
    '  padding: 28px 28px 32px;',
    '}',
    '#fms-modal-name {',
    '  font-size: 22px;',
    '  font-weight: 600;',
    '  color: #fff;',
    '  letter-spacing: 0.02em;',
    '  margin: 0 0 8px;',
    '}',
    '#fms-modal-phrase {',
    '  font-size: 13px;',
    '  color: rgba(255,255,255,0.45);',
    '  font-style: italic;',
    '  margin: 0 0 20px;',
    '  line-height: 1.5;',
    '}',
    '#fms-modal-detail {',
    '  font-size: 14px;',
    '  color: rgba(255,255,255,0.72);',
    '  line-height: 1.75;',
    '  white-space: pre-line;',
    '  margin: 0;',
    '}',
    '.fms-z2-title {',
    '  font-size: clamp(22px, 3.5vw, 44px);',
    '  font-weight: 700;',
    '  letter-spacing: 0.04em;',
    '  text-transform: uppercase;',
    '  line-height: 1;',
    '  margin: 0 0 16px;',
    '  color: #8B3A22;',
    '}',
    '.fms-z1-rule {',
    '  border: none;',
    '  border-top: 1px solid #1a1a1a;',
    '  opacity: 0.15;',
    '  margin: 0 0 32px;',
    '}',
    '.fms-ingredient-item {',
    '  display: flex;',
    '  flex-direction: column;',
    '  align-items: center;',
    '}',
    '.fms-ingredient-body {',
    '  display: flex;',
    '  flex-direction: column;',
    '  flex: 1;',
    '  width: 100%;',
    '}',
    '.fms-ingredient-desc {',
    '  flex: 1;',
    '}',
    '.fms-z5-cards {',
    '  display: flex;',
    '  gap: 16px;',
    '  margin-bottom: 20px;',
    '}',
    '.fms-z5-card-wrap {',
    '  flex: 1;',
    '  display: flex;',
    '  flex-direction: column;',
    '  gap: 8px;',
    '}',
    '.fms-z5-card-canvas {',
    '  width: 100%;',
    '  aspect-ratio: 1;',
    '  display: block;',
    '  border-radius: 2px;',
    '  background: rgba(0,0,0,0.06);',
    '}',
    '.fms-z5-card-label {',
    '  font-size: 10px;',
    '  letter-spacing: 0.1em;',
    '  text-transform: uppercase;',
    '  opacity: 0.4;',
    '  text-align: center;',
    '}',
    '@media (max-width: 600px) {',
    '  .fms-z5-cards { flex-direction: column; }',
    '}',
    '.fms-z5-email {',
    '  margin-top: 40px;',
    '  padding: 32px;',
    '  background: #1a1a1a;',
    '  border-radius: 4px;',
    '}',
    '.fms-z5-email-title {',
    '  font-size: 18px;',
    '  font-weight: 700;',
    '  color: #fff;',
    '  letter-spacing: 0.03em;',
    '  text-transform: uppercase;',
    '  margin-bottom: 6px;',
    '}',
    '.fms-z5-email-sub {',
    '  font-size: 13px;',
    '  color: rgba(255,255,255,0.45);',
    '  margin-bottom: 20px;',
    '  font-style: italic;',
    '}',
    '.fms-z5-email-row {',
    '  display: flex;',
    '  gap: 12px;',
    '  margin-bottom: 16px;',
    '}',
    '.fms-z5-email-input {',
    '  flex: 1;',
    '  padding: 14px 18px;',
    '  font-size: 16px;',
    '  border: 1px solid rgba(255,255,255,0.15);',
    '  border-radius: 3px;',
    '  background: rgba(255,255,255,0.07);',
    '  color: #fff;',
    '  outline: none;',
    '  font-family: inherit;',
    '  transition: border-color 0.2s;',
    '}',
    '.fms-z5-email-input::placeholder { color: rgba(255,255,255,0.3); }',
    '.fms-z5-email-input:focus { border-color: rgba(255,255,255,0.4); }',
    '.fms-z5-email-send {',
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
    '.fms-z5-email-send:hover { opacity: 0.85; }',
    '.fms-z5-email-send:disabled { opacity: 0.4; cursor: default; }',
    '.fms-z5-email-consent {',
    '  display: flex;',
    '  align-items: flex-start;',
    '  gap: 10px;',
    '  margin-bottom: 14px;',
    '}',
    '.fms-z5-email-consent input[type=checkbox] {',
    '  margin-top: 3px;',
    '  width: 16px;',
    '  height: 16px;',
    '  flex-shrink: 0;',
    '  cursor: pointer;',
    '  accent-color: #fff;',
    '}',
    '.fms-z5-email-consent-label {',
    '  font-size: 12px;',
    '  color: rgba(255,255,255,0.4);',
    '  line-height: 1.5;',
    '}',
    '.fms-z5-email-consent-label a { color: rgba(255,255,255,0.55); }',
    '.fms-z5-email-msg {',
    '  font-size: 13px;',
    '  color: rgba(255,255,255,0.6);',
    '  margin-top: 8px;',
    '  min-height: 20px;',
    '}',
    '.fms-z5-email-msg.success { color: #7ec87e; }',
    '.fms-z5-email-msg.error { color: #e07070; }',
    '@media (max-width: 500px) {',
    '  .fms-z5-email-row { flex-direction: column; }',
    '  .fms-z5-email { padding: 24px 20px; }',
    '}',
    '.fms-ingredient-readmore {',
    '  display: inline-block;',
    '  margin-top: auto;',
    '  padding-top: 12px;',
    '  font-size: 11px;',
    '  letter-spacing: 0.08em;',
    '  text-transform: uppercase;',
    '  color: #1a1a1a;',
    '  background: none;',
    '  border: none;',
    '  border-bottom: 1px solid #1a1a1a;',
    '  padding-bottom: 1px;',
    '  cursor: pointer;',
    '  transition: opacity 0.2s;',
    '  align-self: center;',
    '}',
    '.fms-ingredient-readmore:hover {',
    '  opacity: 0.5;',
    '}'
  ].join('\n');
  document.head.appendChild(style);
}

function buildModal() {
  if (document.getElementById('fms-modal-overlay')) return;
  injectModalStyles();
  const overlay = document.createElement('div');
  overlay.id = 'fms-modal-overlay';
  overlay.innerHTML = '<div id="fms-modal-box">' +
    '<button id="fms-modal-close" aria-label="Close">\u2715</button>' +
    '<img id="fms-modal-img" src="" alt="">' +
    '<div id="fms-modal-body">' +
    '<div id="fms-modal-name"></div>' +
    '<div id="fms-modal-phrase"></div>' +
    '<div id="fms-modal-detail"></div>' +
    '</div></div>';
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) closeModal();
  });
  overlay.querySelector('#fms-modal-close').addEventListener('click', closeModal);
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
  });
}

function openModal(ingredient) {
  const overlay = document.getElementById('fms-modal-overlay');
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
  const overlay = document.getElementById('fms-modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('fms-modal-open');
  document.body.style.overflow = '';
}

// ============================================================
// SECTION 1B — PAGE BUILDER
// ============================================================

function buildBlock(key, arch) {
  const block = document.querySelector('[data-result="' + key + '"]');
  if (!block) return;
  [...block.children].forEach(c => c.style.display = 'none');



  // ZONE 2 — Description + Ingredients
  const z2 = document.createElement('div');
  z2.className = 'fms-zone fms-z2';

  let ingredientsHTML = '';
  if (arch.ingredients) {
    const itemsHTML = arch.ingredients.map(function(ing, idx) {
      return '<div class="fms-ingredient-item">' +
        '<img class="fms-ingredient-img" src="' + ing.img + '" alt="' + ing.name + '">' +
        '<div class="fms-ingredient-body">' +
        '<div class="fms-ingredient-name">' + ing.name + '</div>' +
        '<div class="fms-ingredient-desc">' + ing.desc + '</div>' +
        '<button class="fms-ingredient-readmore" data-archetype="' + key + '" data-index="' + idx + '">Read more</button>' +
        '</div></div>';
    }).join('');
    ingredientsHTML = '<div class="fms-ingredients">' +
      '<span class="fms-ingredients-label">ingredients worth discovering</span>' +
      '<div class="fms-ingredients-list">' + itemsHTML + '</div>' +
      '</div>';
  }

  z2.innerHTML = '<div class="fms-z2-title">YOUR SCENT PERSONALITY</div>' +
    '<hr class="fms-z1-rule">' +
    '<div class="fms-z2-text">' +
    arch.desc.map(function(p) { return '<p>' + p + '</p>'; }).join('') +
    '</div>' +
    ingredientsHTML +
    '<div class="fms-z3-label">your scent</div>';
  block.appendChild(z2);

  // ZONE 3 — Main perfume
  const z3 = document.createElement('div');
  z3.className = 'fms-zone fms-z3';
  z3.innerHTML = '<img class="fms-z3-bottle" src="' + arch.main.img + '" alt="' + arch.main.name + '" crossorigin="anonymous">' +
    '<div class="fms-z3-name">' + arch.main.name + '</div>' +
    '<div class="fms-z3-house">' + arch.main.house + '</div>' +
    '<div class="fms-z3-desc">' + arch.main.desc + '</div>' +
    '<a class="fms-z3-cta" href="' + arch.main.link + '" target="_blank" rel="noopener">discover \u2192</a>';
  block.appendChild(z3);

  // ZONE 4 — Alternatives
  const z4 = document.createElement('div');
  z4.className = 'fms-zone fms-z4';
  const altsHTML = arch.alts.map(function(a) {
    return '<div class="fms-z4-item">' +
      '<img class="fms-z4-img" src="' + a.img + '" alt="' + a.name + '" crossorigin="anonymous">' +
      '<div class="fms-z4-info">' +
      '<div class="fms-z4-name">' + a.name + '</div>' +
      '<div class="fms-z4-house">' + a.house + '</div>' +
      '<div class="fms-z4-tagline">' + a.desc + '</div>' +
      '</div>' +
      '<a class="fms-z4-discover" href="' + a.link + '" target="_blank" rel="noopener">discover \u2192</a>' +
      '</div>';
  }).join('');
  z4.innerHTML = '<span class="fms-z4-label">also consider</span>' +
    '<span class="fms-z4-sublabel">same energy, under 100\u20ac</span>' +
    '<div class="fms-z4-list">' + altsHTML + '</div>';
  block.appendChild(z4);

  // ZONE 5 — Share
  const z5 = document.createElement('div');
  z5.className = 'fms-zone fms-z5';
  z5.innerHTML = '<span class="fms-z5-label">share your result</span>' +
    '<div class="fms-z5-cards">' +
    '<div class="fms-z5-card-wrap">' +
    '<canvas class="fms-z5-card-canvas" id="fms-c1-' + key + '" width="1200" height="1200"></canvas>' +
    '<div class="fms-z5-card-label">01 — Identity</div>' +
    '<button class="fms-z5-btn" id="fms-b1-' + key + '">\uD83D\uDCF7 Save</button>' +
    '</div>' +
    '<div class="fms-z5-card-wrap">' +
    '<canvas class="fms-z5-card-canvas" id="fms-c2-' + key + '" width="1200" height="1200"></canvas>' +
    '<div class="fms-z5-card-label">02 — Your scent</div>' +
    '<button class="fms-z5-btn" id="fms-b2-' + key + '">\uD83D\uDCF7 Save</button>' +
    '</div>' +
    '<div class="fms-z5-card-wrap">' +
    '<canvas class="fms-z5-card-canvas" id="fms-c3-' + key + '" width="1200" height="1200"></canvas>' +
    '<div class="fms-z5-card-label">03 — Ingredients</div>' +
    '<button class="fms-z5-btn" id="fms-b3-' + key + '">\uD83D\uDCF7 Save</button>' +
    '</div>' +
    '</div>' +
    '<div class="fms-z5-email" id="fms-email-' + key + '">' +
    '<div class="fms-z5-email-title">Get your full result by email</div>' +
    '<div class="fms-z5-email-sub">Your archetype, all 5 ingredients explained, and your scent recommendations — in your inbox.</div>' +
    '<div class="fms-z5-email-row">' +
    '<input class="fms-z5-email-input" id="fms-ei-' + key + '" type="email" placeholder="your@email.com">' +
    '<button class="fms-z5-email-send" id="fms-es-' + key + '">Send my result</button>' +
    '</div>' +
    '<div class="fms-z5-email-consent">' +
    '<input type="checkbox" id="fms-ec-' + key + '">' +
    '<label class="fms-z5-email-consent-label" for="fms-ec-' + key + '">I agree to receive my quiz result by email. One email only, no marketing. <a href="/privacy-policy" target="_blank">Privacy policy</a>.</label>' +
    '</div>' +
    '<div class="fms-z5-email-msg" id="fms-em-' + key + '"></div>' +
    '</div>';
  block.appendChild(z5);

  var c1 = z5.querySelector('#fms-c1-' + key);
  var c2 = z5.querySelector('#fms-c2-' + key);
  var c3 = z5.querySelector('#fms-c3-' + key);
  var b1 = z5.querySelector('#fms-b1-' + key);
  var b2 = z5.querySelector('#fms-b2-' + key);
  var b3 = z5.querySelector('#fms-b3-' + key);

  if (typeof fmsInitCarousel === 'function') {
    fmsInitCarousel(c1, c2, c3, b1, b2, b3);
  }

  // Email wiring
  var emailInput   = z5.querySelector('#fms-ei-' + key);
  var emailSend    = z5.querySelector('#fms-es-' + key);
  var emailConsent = z5.querySelector('#fms-ec-' + key);
  var emailMsg     = z5.querySelector('#fms-em-' + key);
  var APPS_URL     = 'https://script.google.com/macros/s/AKfycbzX_iZnTevFLG5GgComLwfFJoC4Dp_HaPRcmcmAVszBR_wWrpmlGSlbpYcdNo-6L-NK/exec';

  emailSend.addEventListener('click', function() {
    var email = emailInput.value.trim();
    if (!email || !email.includes('@')) {
      emailMsg.textContent = 'Please enter a valid email address.';
      emailMsg.className = 'fms-z5-email-msg error';
      return;
    }
    if (!emailConsent.checked) {
      emailMsg.textContent = 'Please check the consent box to continue.';
      emailMsg.className = 'fms-z5-email-msg error';
      return;
    }
    emailSend.disabled = true;
    emailSend.textContent = 'Sending…';
    emailMsg.textContent = '';
    emailMsg.className = 'fms-z5-email-msg';

    var winner = (sessionStorage.getItem('quiz_result') || localStorage.getItem('quiz_result') || '').toUpperCase();
    var scores = {};
    try { scores = JSON.parse(localStorage.getItem('quiz_scores') || '{}'); } catch(e2) {}

    fetch(APPS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'payload=' + encodeURIComponent(JSON.stringify({ email: email, winner: winner, scores: scores, page_url: window.location.href }))
    })
    .then(function(r) { return r.text(); })
    .then(function(t) {
      if (t === 'ok' || t.indexOf('ok') > -1) {
        emailMsg.textContent = 'Done! Check your inbox in a few minutes.';
        emailMsg.className = 'fms-z5-email-msg success';
        emailSend.textContent = 'Sent ✓';
      } else {
        throw new Error(t);
      }
    })
    .catch(function() {
      emailMsg.textContent = 'Something went wrong. Please try again.';
      emailMsg.className = 'fms-z5-email-msg error';
      emailSend.disabled = false;
      emailSend.textContent = 'Send my result';
    });
  });


}

// ============================================================
// SECTION 1C — CMS OVERRIDE (reads from Webflow Collection List)
// ============================================================

function loadCMSPerfumes() {
  const items = document.querySelectorAll('[data-perfume="item"]');
  if (!items.length) return;

  const perfumes = [];
  items.forEach(function(item) {
    const nameEl = item.querySelector('[data-name]');
    const brandEl = item.querySelector('[data-brand]');
    const archetypeEl = item.querySelector('[data-archetype]');
    const linkEl = item.querySelector('[data-link]');
    const imgEl = item.querySelector('[data-img]');
    const descEl = item.querySelector('[data-desc]');
    if (!nameEl || !archetypeEl) return;
    const perfumeData = {
      name: nameEl.textContent.trim(),
      brand: brandEl ? brandEl.textContent.trim() : '',
      archetype: archetypeEl.textContent.trim().toUpperCase(),
      isMain: !!item.querySelector('[data-main]'),
      link: linkEl ? linkEl.textContent.trim() : '',
      img: imgEl ? imgEl.src : '',
      desc: descEl ? descEl.textContent.trim() : ''
    };
    perfumes.push(perfumeData);
  });

  if (!perfumes.length) return;

  const byArchetype = {};
  perfumes.forEach(function(p) {
    if (!byArchetype[p.archetype]) byArchetype[p.archetype] = { main: null, alts: [] };
    if (p.isMain) byArchetype[p.archetype].main = p;
    else byArchetype[p.archetype].alts.push(p);
  });

  Object.keys(byArchetype).forEach(function(key) {
    if (!ARCHETYPES[key]) return;
    const data = byArchetype[key];
    if (data.main) {
      ARCHETYPES[key].main.name = data.main.name;
      ARCHETYPES[key].main.house = data.main.brand;
      ARCHETYPES[key].main.link = data.main.link;
      ARCHETYPES[key].main.img = data.main.img;
      if (data.main.desc) ARCHETYPES[key].main.desc = data.main.desc;
    }
    if (data.alts.length) {
      ARCHETYPES[key].alts = data.alts.map(function(a) {
        return { name: a.name, house: a.brand, link: a.link, img: a.img, desc: a.desc };
      });
    }
  });
}

// ============================================================
// SECTION 1D — INIT
// ============================================================

function init() {
  buildModal();
  loadCMSPerfumes();
  Object.entries(ARCHETYPES).forEach(function(entry) {
    buildBlock(entry[0], entry[1]);
  });

  // Delegate all Read more clicks from document
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('.fms-ingredient-readmore');
    if (!btn) return;
    const archetypeKey = btn.getAttribute('data-archetype');
    const idx = parseInt(btn.getAttribute('data-index'), 10);
    const ingredient = ARCHETYPES[archetypeKey] && ARCHETYPES[archetypeKey].ingredients[idx];
    if (ingredient) openModal(ingredient);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 1000); });
} else {
  setTimeout(init, 1000);
}

  window.FMS_FULL_ARCH = ARCHETYPES;

})();
