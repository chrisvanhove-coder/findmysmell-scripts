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
      { name: 'Escentric 05', house: 'Escentric Molecules', desc: 'Fresh and focused like your new business venture.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69e0bc2082301bdff10b4568_2.png', link: 'https://www.escentric.com/en-eu/products/escentric-05-refill-30ml?pr_prod_strat=e5_desc&pr_rec_id=20a11bb7d&pr_rec_pid=4675141795942&pr_ref_pid=4675110207590&pr_seq=uniform' },
      { name: 'Musky Oakmoss', house: 'Dossier', desc: 'Not there yet, but knows exactly what they want and is going for it.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69e0bc2b6da9778283cf250b_4.png', link: 'https://dossier.eu/fr/products/musky-oakmoss' }
    ],
    ingredients: [
      { name: 'Aldehyde', desc: 'The smell of a clean surface that nobody has touched yet.', img: 'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69de33b34f4f9a327016d289_aldehyde.jpeg' },
      { name: 'Juniper', desc: 'Sharp like the air outside at 6am when nobody else is there.', img: 'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69de320fc6242aa9a1eb750c_juniper.jpeg' },
      { name: 'Iso E Super', desc: 'The feeling of walking into a room.', img: 'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69de342398c3244b661b2606_iso-e-super.jpeg' }
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
      name: 'Miyako', house: 'Auphorie',
      desc: 'Not for everyone. For the ones who know what wabi-sabi means without googling it.',
      img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbc6888a1e98af586092c8_japan-miyako.png',
      link: 'https://auphorie.com/products/miyako'
    },
  alts: [
      { name: 'Tokyo', house: 'Gallivant', desc: 'Every note in its place. Nothing added. Nothing missing.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd2c2e7afa045bcf95a91_31.png', link: 'https://50-ml.fr/gallivant-tokyo-eau-de-parfum' },
      { name: 'Shiso', house: 'Roger & Gallet', desc: 'Clean like rain on stone. Quiet like a choice already made.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd2604905ef7597e42770_28.png', link: 'https://fr.roger-gallet.com/p/RG1013011WW/rg1013011ww-shiso-eau-parfumee-bienfaisante-heritage-100-ml' },
      { name: 'New Zealand', house: 'Demeter', desc: 'Far enough from everything to finally hear yourself.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd20ab5bab41035b380b7_27.png', link: 'https://demeterfragrance.com/products/new-zealand-cologne-spray' }
    ],
    ingredients: [
      { name: 'Green Tea', desc: 'The smell of water just before it boils. Green, slightly bitter.', img: 'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69de30219927953e40ece6ff_gree-tea.jpeg' },
      { name: 'Iris', desc: 'The inside of a wooden drawer that hasn\'t been opened in years. Cool and powdery.', img: 'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69de30211a2e37e72b2a1c6c_iris.jpeg' },
      { name: 'Hinoki', desc: 'A Japanese bathhouse at 7am when you\'re the only one there. Warm water on cold hands.', img: 'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69de30214f6f62df9c4cce03_Hinoki.jpeg' }
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
      { name: 'Benzoin', desc: 'The smell of warmth without being sweet.', img: 'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69de3186c6242aa9a1eb533d_benzoin.jpeg' },
      { name: 'Skin Musk', desc: 'Your smell, just amplified.', img: 'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69de313aefb983187ecd3120_soft-musk.jpeg' },
      { name: 'Cashmere Wood', desc: 'A worn sweater that holds the shape of someone you love.', img: 'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69de305963d87bf5fe0537b5_cashmere-wood.jpeg' }
    ]
  },
  OFFGRID: {
    you: 'You are',
    identity: 'secretly planning to disappear.',
    descriptor: 'Nature is your reset button.',
    desc: [
      "You don't need comfort. You need space. Sometimes you think: \u201cI wish I lived in the middle of nowhere.\u201d And you mean it.",
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
      { name: 'Sage', desc: 'Medicinal, dry, slightly smoke-edged.', img: 'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69de2d022b8e43123f635fc3_sage.jpeg' },
      { name: 'Opoponax', desc: 'A fire that went out an hour ago but the wood is still warm.', img: 'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69de2dbeee7a80e36ed2aed3_opoponax.jpeg' },
      { name: 'Geosmin', desc: 'The exact moment rain hits dry earth.', img: 'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69de2e8c809fe66148c05bf7_geosmin.jpeg' }
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
      "You're not depressed. You're atmospheric. There's a difference and your close friends know exactly what it means.",
      "You don't follow trends. You follow moods. People call you mysterious mostly because you don't explain yourself, and you find that explanation unnecessary.",
      "People find you interesting in a way they can't explain. That's because you're not trying to be interesting. You're just somewhere else.",
      "Your scent is mineral, dark and hidden. Smoke, shadow and something you can't quite name."
    ],
    main: {
      name: 'Gris Clair', house: 'Serge Lutens',
      desc: 'Smells like a thought you\'ve been having for years and finally stopped fighting.',
 img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbc609137dcd257a6dd5ae_outoftime-gris.png',
      link: 'https://sergelutens.fr/products/gris-clair-eau-de-parfum-spray'
    },
    alts: [
      { name: 'Aromatics Elixir', house: 'Clinique', desc: 'From an era when excess was a philosophy. You understand why.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd0a99c6d03bf461752c9_23.png', link: 'https://www.clinique.fr/product/aromatics-elixir-eau-de-parfum-spray?size=45_ml' },
      { name: 'Encre Noire', house: 'Lalique', desc: 'Dark, deliberate, and completely unbothered by your reaction to it.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd0609c6d03bf461738ee_22.png', link: 'https://www.notino.fr/lalique/encre-noire-for-men-eau-de-toilette-pour-homme/p-62724/' },
      { name: 'Grey Flannel', house: 'Geoffrey Beene', desc: 'Smells like staying in when everyone else went out. And being right about it.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd01c7659885dec161fb2_21.png', link: 'https://www.my-origines.com/fr/grey-flannel-09118624.html' }
    ],
    ingredients: [
      { name: 'Cashmeran', desc: 'The feeling of fog on your face before you can see through it.', img: 'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69de2fb2724c92896b765a3a_cashmeran.jpeg' },
      { name: 'Violet', desc: 'Dusty like an unopened window and soft like a touch.', img: 'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69de2f8aa2412e633f61fc8f_violet.jpeg' },
      { name: 'Wet Stone', desc: 'Mineral and cold and somehow a relief. The smell of a city exhaling.', img: 'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69de2f8aff12149b1af521c0_wet-stone.jpeg' }
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
      desc: 'Smells like momentum. The kind that doesn\'t need a plan.',
      img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbc743841913865b2a9338_summer-solo.png',
      link: 'https://www.perfumesloewe.com/int/en_FR/men/loewe-solo/loewe-solo-vulcan-edp-100ml-LW80620.html'
    },
    alts: [
      { name: 'Avgoustos', house: 'Parfums de Marly', desc: 'Heat, salt, time slowing down on purpose.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd48441e84e3b0ceb7289_34.png', link: 'https://www.korres.fr/products/eau-de-toilette-avgoustos' },
      { name: 'Bois de Yuzu', house: 'Karl Lagerfeld', desc: 'The night is young and so is the conversation.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd43a7659885dec179a63_33.png', link: 'https://www.notino.fr/karl-lagerfeld/bois-de-yuzu-eau-de-toilette-pour-homme/p-15791163/' },
      { name: 'Un Jardin sur le Nil', house: 'Hermès', desc: 'Moves like you do. Light, unhurried, and somehow everywhere at once.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd4b7d360f752977ab6c9_35.png', link: 'https://www.hermes.com/fr/fr/product/un-jardin-sur-le-nil-eau-de-toilette-V26993/' }
    ],
    ingredients: [
      { name: 'Tiare', desc: 'A white flower in warm wind. Slightly sweet and fresh.', img: 'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69de2c69a711f8da204008c8_tiare.jpeg' },
      { name: 'Sea Salt', desc: 'Your skin an hour after swimming. Mineral and light.', img: 'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69de2c9b515cb793b2629535_sea-salt.jpeg' },
      { name: 'Coconut Water', desc: 'Like a cold drink on a warm afternoon.', img: 'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69de2c85fff1694683295523_coconut-water.jpeg' }
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
      desc: 'Smells like the conversation you didn\'t want to end.',
      img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbc802f2d99f701a1415fd_therapist-blacktea.png',
      link: 'https://www.jilsander.com/fr-fr/jil-sander-black-tea-100-ml/J65YX0006JFR001998.html'
    },
    alts: [
      { name: 'Geranio Imperiale', house: 'Culti Milano', desc: 'Sharp enough to notice everything. Composed enough not to mention most of it.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd3d5e80c9c7c162eedbe_44.png', link: 'https://www.notino.fr/culti/geranio-imperiale-aquae-di-profumo-eau-de-toilette-mixte/' },
      { name: '1472 La Divina Commedia', house: 'Histoires de Parfums', desc: 'Knows exactly where it ends. That\'s what makes it safe to be around.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd3679c6d03bf4618308b_41.png', link: 'https://www.notino.fr/histoires-de-parfums/1472-eau-de-parfum-mixte/p-16349773/' },
      { name: '702', house: 'Bon Parfumeur', desc: 'Smells like someone who already thought of everything so you don\'t have to.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd3a1d34b8acd99b18bb2_42.png', link: 'https://www.bonparfumeur.com/fr/products/702-incense-lavender-and-cashmere-wood' }
    ],
    ingredients: [
      { name: 'Oud', desc: 'A very old library smell. Dense and resinous.', img: 'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69de2b6e8dd04e0a79035d92_oud.jpeg' },
      { name: 'Sandalwood', desc: 'Warm wood in late afternoon light. Creamy and slow.', img: 'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69de2b3d731c509f07ccca94_sandalwood.png' },
      { name: 'Patchouli', desc: 'The smell of roots — not dirt, but depth.', img: 'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69de2b58bff662bd0d35da38_patchouli.jpeg' }
    ]
  }
};

// ============================================================
// SECTION 1B — PAGE BUILDER
// ============================================================

function buildBlock(key, arch) {
  const block = document.querySelector('[data-result="' + key + '"]');
  if (!block) return;
  [...block.children].forEach(c => c.style.display = 'none');

  const z1 = document.createElement('div');
  z1.className = 'fms-zone fms-z1';
  z1.innerHTML = `
    <span class="fms-z1-eyebrow">your scent archetype</span>
    <div class="fms-z1-bottle-wrap">
      <img class="fms-z1-bottle" src="${arch.main.img}" alt="${arch.main.name}" crossorigin="anonymous">
    </div>
    <div class="fms-z1-text">
      <span class="fms-z1-you">${arch.you}</span>
      <span class="fms-z1-identity">${arch.identity}</span>
      <span class="fms-z1-descriptor">${arch.descriptor}</span>
    </div>
  `;
  block.appendChild(z1);

  // ZONE 2 — Description + Ingredients
  const z2 = document.createElement('div');
  z2.className = 'fms-zone fms-z2';
  z2.innerHTML = `
    <span class="fms-z2-eyebrow">who you are</span>
    <div class="fms-z2-text">
      ${arch.desc.map(p => `<p>${p}</p>`).join('')}
    </div>
    ${arch.ingredients ? `
    <div class="fms-ingredients">
      <span class="fms-ingredients-label">ingredients worth discovering</span>
      <div class="fms-ingredients-list">
        ${arch.ingredients.map(i => `
          <div class="fms-ingredient-item">
            <img class="fms-ingredient-img" src="${i.img}" alt="${i.name}">
            <div class="fms-ingredient-body">
              <div class="fms-ingredient-name">${i.name}</div>
              <div class="fms-ingredient-desc">${i.desc}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>` : ''}
    <div class="fms-z3-label">your scent</div>
  `;
  block.appendChild(z2);

  // ZONE 3 — Main perfume
  const z3 = document.createElement('div');
  z3.className = 'fms-zone fms-z3';
  z3.innerHTML = `
    <img class="fms-z3-bottle" src="${arch.main.img}" alt="${arch.main.name}" crossorigin="anonymous">
    <div class="fms-z3-name">${arch.main.name}</div>
    <div class="fms-z3-house">${arch.main.house}</div>
    <div class="fms-z3-desc">${arch.main.desc}</div>
    <a class="fms-z3-cta" href="${arch.main.link}" target="_blank" rel="noopener">discover →</a>
  `;
  block.appendChild(z3);

  // ZONE 4 — Alternatives
  const z4 = document.createElement('div');
  z4.className = 'fms-zone fms-z4';
  z4.innerHTML = `
    <span class="fms-z4-label">also consider</span>
    <span class="fms-z4-sublabel">same energy, under 100€</span>
    <div class="fms-z4-list">
      ${arch.alts.map(a => `
        <div class="fms-z4-item">
          <img class="fms-z4-img" src="${a.img}" alt="${a.name}" crossorigin="anonymous">
          <div class="fms-z4-info">
            <div class="fms-z4-name">${a.name}</div>
            <div class="fms-z4-house">${a.house}</div>
            <div class="fms-z4-tagline">${a.desc}</div>
          </div>
          <a class="fms-z4-discover" href="${a.link}" target="_blank" rel="noopener">discover →</a>
        </div>
      `).join('')}
    </div>
  `;
  block.appendChild(z4);


  // ZONE 5 — Share
  const z5 = document.createElement('div');
  z5.className = 'fms-zone fms-z5';
  z5.innerHTML = `
    <span class="fms-z5-label">share your result</span>
    <div class="fms-z5-preview" id="fms-card-preview-${key}">
      <canvas class="fms-z5-canvas" id="fms-card-canvas" width="1200" height="1200"></canvas>
    </div>
    <div class="fms-z5-btns">
      <button class="fms-z5-btn" id="fms-btn-instagram">📷 Save</button>
      <button class="fms-z5-btn" id="fms-btn-whatsapp">💬 WhatsApp</button>
      <button class="fms-z5-btn" id="fms-btn-telegram">✈ Telegram</button>
      <button class="fms-z5-btn" id="fms-btn-copy">⧉ Copy link</button>
    </div>
  `;
  block.appendChild(z5);

const SITE_URL = 'https://www.findmysmell.com';
  const shareText = arch.you + ' ' + arch.identity + '\n' + arch.descriptor + '\n\nDiscover your scent archetype → ' + SITE_URL;
  const canvas = z5.querySelector('#fms-card-canvas');

  z5.querySelector('#fms-btn-instagram').addEventListener('click', () => {
    if (typeof fmsDrawCard === 'function') fmsDrawCard(canvas, () => fmsDownloadCard(canvas));
  });
  z5.querySelector('#fms-btn-whatsapp').addEventListener('click', () => {
    window.open('https://wa.me/?text=' + encodeURIComponent(shareText), '_blank');
  });
  z5.querySelector('#fms-btn-telegram').addEventListener('click', () => {
    window.open('https://t.me/share/url?url=' + encodeURIComponent(SITE_URL) + '&text=' + encodeURIComponent(shareText), '_blank');
  });
  z5.querySelector('#fms-btn-copy').addEventListener('click', () => {
    navigator.clipboard && navigator.clipboard.writeText(SITE_URL);
    const btn = z5.querySelector('#fms-btn-copy');
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy link', 2000);
  });

  if (typeof fmsDrawCard === 'function') setTimeout(() => fmsDrawCard(canvas), 800);
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
        return {
          name: a.name,
          house: a.brand,
          link: a.link,
          img: a.img,
          desc: a.desc
        };
      });
    }
  });
}

// ============================================================
// SECTION 1D — INIT
// ============================================================

function init() {
  loadCMSPerfumes();
  Object.entries(ARCHETYPES).forEach(([key, arch]) => buildBlock(key, arch));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(init, 1000));
} else {
  setTimeout(init, 1000);
}

})();
