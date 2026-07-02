// ============================================================
// SECTION 1 — ARCHETYPES DATA + PAGE BUILDER
// ============================================================

(function() {
 
const ARCHETYPES = {
  CEO: {
    you: 'Vous êtes',
    identity: 'poliment injoignable.',
    descriptor: 'Celui ou celle qui est parti sans dire au revoir.',
    desc: [
      "Vous avez un modèle Notion pour votre personnalité. Votre agenda n'est pas un agenda. C'est un argument que vous gagnez contre le temps.",
      "Vous avez quitté au moins trois groupes de discussion cette année — pas par drame, juste par efficacité. Votre idée de vous détendre, c'est résoudre quelque chose. Vous n'êtes pas un(e) maniaque du contrôle. Vous remarquez simplement quand les choses pourraient mieux fonctionner, ce qui est toujours le cas, ce qui est le problème.",
      "Vous donnez des retours déguisés en questions. Vous avez décrit des vacances comme « une bonne opportunité de vous ressourcer. » Vous ne faites pas de multitâche. Vous faites une seule chose à la vitesse qui ressemble à du multitâche. Vous n'êtes pas froid(e). Vous êtes juste déjà trois décisions en avance et légèrement ennuyé(e) de là où tout le monde en est.",
      "Votre parfum est identique : propre, précis, sans bavardages. C'est ce à quoi ressemble une décision."
    ],
    main: {
      name: 'Concrete', house: 'Comme des Garçons',
      desc: 'La décision elle-même. Précise, confiante, marche la tête haute.',
      img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1776354725/1_mpedvv.png',
      link: 'https://noseparis.com/en/concrete'
    },
    alts: [
      { name: 'Legend', house: 'Montblanc', desc: "Ne vous surprend pas. N'en a pas besoin. Se présente, livre, repart.", img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69e0bbc57bc50bbad5b648f1_Find%20My%20Smell.png', link: 'https://www.montblanc-bordeaux.fr/products/legend-eau-de-toilette-100-ml' },
      { name: 'Escentric 05', house: 'Escentric Molecules', desc: 'Frais et concentré comme votre nouvelle aventure professionnelle.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69e0bc2082301bdff10b4568_2.png', link: 'https://www.escentric.com/en-eu/products/escentric-05-refill-30ml' },
      { name: 'Musky Oakmoss', house: 'Dossier', desc: "Pas encore là, mais sait exactement ce qu'il veut et y va.", img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69e0bc2b6da9778283cf250b_4.png', link: 'https://dossier.eu/fr/products/musky-oakmoss' }
    ],
    ingredients: [
      {
        name: 'Genévrier',
        desc: "L'air de la campagne à 6h du matin quand personne d'autre n'est là.",
        detail: "Résineux, sec, légèrement amer. Plus proche de l'odeur d'une forêt en altitude que d'un sapin de Noël. Il y a quelque chose de médicinal sans être antiseptique. On retrouve le genévrier dans « Light Blue » de D&G, « Gypsy Water » de Byredo ou « Guilty » de Gucci.\nEn parfumerie, le genévrier est utilisé pour apporter une netteté et une clarté en plein air. Ses molécules s'évaporent rapidement, en font une note de tête — quelque chose qui s'enregistre immédiatement puis s'efface. C'est l'ingrédient qui donne à un parfum la sensation d'air froid sur une station de ski. Souvent associé au cèdre, au poivre, au vétiver ou aux notes aquatiques.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885115/juniper_piiquy.jpg'
      },
      {
        name: 'Poivre Noir',
        desc: 'Chaud comme un bain, éphémère comme une pluie tropicale.',
        detail: "Sec, chaud et légèrement boisé. Il y a une luminosité que les agrumes n'ont pas, et une sécheresse qui l'empêche de jamais sembler trop doux.\nEn parfumerie, il est utilisé comme ouverture — la première chose que vous sentez avant que le parfum ne se fixe. Ses molécules aromatiques sont petites et légères, elles s'évaporent vite et frappent immédiatement votre nez, puis laissent place à ce qui suit. Il pousse les autres ingrédients en avant plutôt que de se fondre en eux. Souvent associé au cuir, à la rose, au cèdre ou au vétiver.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885163/black_pepper_duelif.png'
      },
      {
        name: 'Cardamome',
        desc: 'Épicé mais précis. Pas chaud comme la cannelle, plutôt comme un très bon espresso.',
        detail: "Vert, légèrement sucré et aromatique. Il se situe entre l'épice et la fraîcheur d'une façon unique — il a de la chaleur sans lourdeur. On le connaît de la cuisine, du café, de l'intérieur d'une épicerie du Moyen-Orient. Sur la peau il se comporte très différemment. On retrouve cette note dans « Le Mâle » de Jean Paul Gaultier.\nEn parfumerie, la cardamome est utilisée pour apporter de la précision sans agressivité. Ses molécules s'évaporent à vitesse moyenne, après la première impression mais avant que la base ne se fixe. Souvent associée au cuir, au gingembre, aux bois ou aux agrumes.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885181/hf_20260428_134942_a25afcf7-fbd8-4089-94f2-9c1302266430_ncmbhn.png'
      },
      {
        name: 'Bouleau',
        desc: "L'odeur de l'air froid juste avant l'arrivée d'une tempête.",
        detail: "Boisé, légèrement fumé et doux, avec un bord sec presque minéral. Pas une odeur d'arbre, plutôt l'atmosphère autour de l'arbre. Propre d'une façon qui semble exposée plutôt que polie. L'un des parfums les plus célèbres où l'on retrouve le bouleau est « Ombré Nomade » de Louis Vuitton.\nEn parfumerie, le bouleau est utilisé pour apporter une qualité froide et structurelle que la plupart des ingrédients ne peuvent pas atteindre. Ses molécules sont de poids moyen, situées dans le cœur et la base d'un parfum. Souvent associé au cèdre, à la framboise, au poivre ou au cuir.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885146/hf_20260428_134820_0b287d99-4482-4ad5-b5ca-fa10db72af93_zillk4.png'
      },
      {
        name: 'Cèdre',
        desc: 'Un crayon fraîchement taillé. Propre et légèrement sec.',
        detail: "Sec, chaud et légèrement poussiéreux — l'odeur du bois clair plutôt que sombre. Pas résineux ou lourd. Propre de la façon dont les matières premières le sont avant qu'on leur fasse quoi que ce soit.\nEn parfumerie, le cèdre est l'une des notes de fond les plus utilisées, c'est-à-dire l'une des dernières choses que vous sentez lorsqu'un parfum sèche sur la peau. Ses molécules sont lourdes et s'évaporent lentement. Il donne de la structure aux parfums qui pourraient sinon sembler trop doux. La colonne vertébrale de la plupart des structures de parfums masculins.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885200/hf_20260428_134734_dec13d8e-7f23-4471-9120-820ceb4926b0_xnruu5.png'
      }
    ]
  },
  JAPAN: {
    you: 'Vous êtes',
    identity: 'Insistamment calme.',
    descriptor: "Vous n'avez pas besoin de vous justifier.",
    desc: [
      "Vous avez appris que la plupart des urgences sont inventées et que la plupart du bruit est facultatif.",
      "Vous avez retiré des choses de votre vie sans l'annoncer, l'expliquer, ni avoir besoin que qui que ce soit le comprenne.",
      "Vous n'avez pas besoin d'être la personne la plus intéressante dans la pièce. Vous vous contentez d'être celle qui a remarqué ce qui s'y passait vraiment. Les gens vous décrivent comme apaisant(e) sans savoir pourquoi. C'est parce que vous ne jouez aucun rôle. Le silence ne vous met pas mal à l'aise.",
      "Votre parfum est identique : propre, minimal, et ne dit rien d'inutile."
    ],
    main: {
      name: 'Dirty Hinoki', house: 'Heretic Parfum',
      desc: 'Pas pour tout le monde. Pour ceux qui savent ce que wabi-sabi signifie sans le chercher sur Google.',
      img: 'https://cdn.prod.website-files.com/69773aa3fded0e0107b28cbd/69e88e6c2d41e3859e44d7c7_hinoki-dirty.png',
      link: 'https://hereticparfum.com/products/dirty-hinoki?variant=39270055346240'
    },
    alts: [
      { name: 'Tokyo', house: 'Gallivant', desc: "Chaque note à sa place. Rien d'ajouté. Rien de manquant.", img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd2c2e7afa045bcf95a91_31.png', link: 'https://50-ml.fr/gallivant-tokyo-eau-de-parfum' },
      { name: 'Shiso', house: 'Roger & Gallet', desc: 'Propre comme la pluie sur la pierre. Silencieux comme un choix déjà fait.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd2604905ef7597e42770_28.png', link: 'https://fr.roger-gallet.com/p/RG1013011WW/rg1013011ww-shiso-eau-parfumee-bienfaisante-heritage-100-ml' },
      { name: 'New Zealand', house: 'Demeter', desc: "Assez loin de tout pour enfin s'entendre.", img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd20ab5bab41035b380b7_27.png', link: 'https://demeterfragrance.com/products/new-zealand-cologne-spray' }
    ],
    ingredients: [
      {
        name: 'Thé Vert',
        desc: "L'odeur de l'eau juste avant qu'elle bouille. Verte, légèrement amère.",
        detail: "Ce n'est pas sucré. Il y a une légère amertume sous le vert qui l'empêche de jamais sembler doux ou floral. Ça sent la concentration sur quelque chose. Beaucoup de marques utilisent différents types de thés, du wulong au jasmin.\nEn parfumerie, le thé vert est utilisé pour apporter une qualité propre et légèrement fraîche entre le frais et l'herbal. Ses molécules s'évaporent à vitesse moyenne, le plaçant au cœur du parfum — présent mais pas fort. C'est l'un des rares ingrédients qui sent exactement ce qu'il est.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885226/gree-tea_w4toim.jpg'
      },
      {
        name: 'Hinoki',
        desc: 'Eau chaude sur des mains froides.',
        detail: "Boisé, légèrement citronné et propre d'une façon qui semble ancienne plutôt que clinique. Le hinoki est le cyprès japonais — le bois utilisé dans les bains traditionnels et les temples. Vous ne l'avez peut-être pas senti étiqueté comme hinoki, mais si vous avez déjà été dans un spa haut de gamme et remarqué que le bois sentait quelque chose de plus que du bois, c'était probablement ça.\nEn parfumerie, le hinoki est utilisé pour apporter une chaleur boisée propre qui ne semble pas lourde. Ses molécules se situent dans la base et le cœur, s'évaporant lentement et laissant une chaleur minérale tranquille sur la peau. Souvent associé au thé vert, à l'iris ou à la bergamote.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885236/Hinoki_kwtliy.jpg'
      },
      {
        name: 'Iris',
        desc: 'Le début de quelque chose de grand.',
        detail: "Poudré, légèrement terreux, avec un bord frais presque métallique en dessous. Pas vraiment une odeur de fleur, plutôt une odeur de racine, d'où vient réellement le parfum. L'un des parfums les plus célèbres avec cet ingrédient est Dior Homme.\nEn parfumerie, l'iris est l'un des ingrédients les plus chers à produire. La racine prend trois ans à mûrir avant de pouvoir être traitée. C'est pourquoi il apparaît principalement dans les parfums haut de gamme. Ses molécules sont lourdes et lentes, en font une note de fond qui persiste longtemps après que tout le reste soit parti. Souvent associé aux bois, à la fève tonka, au musc ou à d'autres fleurs.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885261/iris_zuvmbv.jpg'
      },
      {
        name: 'Fleur de Sureau',
        desc: 'La sensation d\'une bonne soirée qui s\'annonce.',
        detail: "Délicate, légèrement aqueuse, avec une douce qualité verte sous la fleur. Pas sucrée comme la rose ou forte comme le jasmin, mais plutôt l'odeur de quelque chose qui fleurit dans un jardin sauvage. Vous la connaissez de l'eau tonique, des boissons japonaises, des cocktails haut de gamme.\nEn parfumerie, la fleur de sureau est utilisée pour apporter une légèreté florale aérienne sans la lourdeur que la plupart des fleurs apportent. Ses molécules s'évaporent rapidement, la plaçant en tête et au cœur du parfum. Elle adoucit sans sucrer. Souvent associée aux fruits, à la lavande ou aux muscs propres.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885270/hf_20260428_134353_f762a115-cdd0-4303-b66c-0079aef4b627_v56tww.png'
      },
      {
        name: 'Riz',
        desc: 'L\'odeur de quelque chose de simple fait parfaitement.',
        detail: "Doux, poudré et légèrement sucré sans être sirupeux. L'odeur du riz qui cuit est l'une des plus universellement reconnaissables au monde. Sur la peau, il devient quelque chose de plus tranquille et de plus proche, presque comme du tissu propre. Utilisé principalement par des marques modernes dont Kilian, Maison Margiela, d.grayi, Diptyque et d'autres.\nEn parfumerie, le riz est utilisé pour apporter une chaleur douce et poudrée très proche de la peau. Cela en fait l'un des rares ingrédients qui crée de l'intimité plutôt que de la présence. Souvent associé au musc, à l'iris ou aux bois légers.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885277/hf_20260428_140116_d0ea1402-bbc7-478b-929c-a066835069d8_gd3pzg.png'
      }
    ]
  },
  HUG: {
    you: 'Vous êtes',
    identity: "la personne préférée de quelqu'un.",
    descriptor: 'La raison pour laquelle les gens restent plus longtemps que prévu.',
    desc: [
      "Vous avez entendu plus de confessions qu'un prêtre et vous essayiez juste de déjeuner.",
      "Les gens vous trouvent et restent. Pas parce que vous êtes divertissant(e) — parce que vous leur donnez l'impression de ne pas être trop encombrants. Vous écoutez d'une façon que la plupart des gens ne font pas.",
      "Vous vous souvenez des petites choses. Le nom du chien de quelqu'un. Ce qu'il a mentionné une fois il y a six mois. Vous le ramenez et il vous regarde comme si vous aviez fait un tour de magie, mais ce n'était pas un tour, vous avez juste vraiment écouté.",
      "Vous êtes chaleureux/chaleureuse sans performer la chaleur. Calme sans prétendre. Vous donnez aux gens l'impression que tout va bien se passer. La plupart des gens passent leur vie entière à essayer de donner cette impression aux autres. Vous le faites sans essayer. Sans le remarquer. Probablement en préparant du thé.",
      "Les gens ne se souviennent pas de ce que vous avez dit. Ils se souviennent de comment ils se sont sentis après.",
      "Votre parfum reste proche, comme la chaleur de la peau."
    ],
    main: {
      name: 'Eau Duelle', house: 'Diptyque',
      desc: "Ça sent l'accueil.",
      img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbc44fb8f35b9c43790fd0_hug-eau.png',
      link: 'https://www.diptyqueparis.com/fr_fr/p/eau-de-toilette-eau-duelle-100ml.html'
    },
    alts: [
      { name: 'You', house: 'Glossier', desc: "Sent comme quelqu'un qui se souvient comment vous prenez votre café.", img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbcee14281bf63f688fe03_17.png', link: 'https://www.glossier.com/fr-fr/products/glossier-you-doux' },
      { name: 'Baby Powder', house: 'Demeter', desc: 'Inconnu au début. Puis soudainement la seule chose qui semble juste.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbcf8906d7f036ca2c3e1c_16.png', link: 'https://demeterfragrance.com/products/baby-powder-cologne-spray' },
      { name: 'By the Fireplace', house: 'Maison Margiela', desc: 'Nulle part où être. Personne pour qui jouer un rôle. Juste ça.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbcfb56f2a237bf857889b_18.png', link: 'https://www.my-origines.com/fr/by-the-fireplace-59L14132.html' }
    ],
    ingredients: [
      {
        name: 'Benjoin',
        desc: "L'odeur de la chaleur sans être sucrée. Un léger rappel de vanille.",
        detail: "Chaud, légèrement vanillé, avec un bord balsamique apaisant. Il vient de la sève d'un arbre d'Asie du Sud-Est, pas quelque chose qu'on rencontrerait dans une cuisine, mais reconnaissable au moment où on le sent. C'est l'ingrédient derrière cette qualité chaude et proche de la peau dans certaines bougies et encens. Tom Ford, Matiere Premiere, Céline et d'autres l'utilisent.\nEn parfumerie, le benjoin est utilisé comme fixatif — ses molécules sont lourdes et lentes à s'évaporer, ce qui signifie qu'il prolonge la vie de tout ce qui l'entoure. Il ancre un parfum à la peau et le maintient en place. Souvent associé à l'iris, à la carotte, aux fleurs blanches ou au patchouli.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885417/benzoin_dijcu9.jpg'
      },
      {
        name: 'Fève Tonka',
        desc: "Une peau qui a été au soleil et en a profité.",
        detail: "Sucré, légèrement poudré, avec un bord d'amande subtil en dessous. Pas sirupeux, mais plutôt la chaleur de quelque chose qui a été assis au soleil tout l'après-midi. Vous le connaissez peut-être de certains tabacs à pipe ou chocolats artisanaux. Sur la peau il devient encore plus chaud, presque impossible à distinguer de votre propre odeur.\nEn parfumerie, la fève tonka est utilisée pour apporter une douceur chaude et douce qui ne s'annonce pas. Ses molécules sont lourdes et lentes, la plaçant fermement dans la base d'un parfum. Elle se mélange harmonieusement avec presque tout. Souvent associée au vétiver, aux fruits acides, à la vanille ou au cèdre.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885364/hf_20260428_140101_28111ef5-544f-458d-856b-7a5b238273fb_oooaya.png'
      },
      {
        name: 'Cire d\'Abeille',
        desc: 'Une bougie qui vient de s\'éteindre. Chaude et douce comme le miel.',
        detail: "Miellée, légèrement poudrée, avec une qualité cireuse chaude qui ressemble à votre propre jardin personnel. Pas vraiment l'odeur du miel, plutôt la cire elle-même, qui est plus tranquille et moins sucrée. Vous la connaissez des bougies ou d'un baume à lèvres.\nEn parfumerie, la cire d'abeille est utilisée pour apporter une chaleur douce et intime qui reste très proche de la peau. Ses molécules sont lourdes et s'évaporent lentement, en font une note de fond qui persiste tranquillement longtemps après que le reste du parfum soit parti. Elle arrondit les bords tranchants et adoucit tout ce qui l'entoure. Souvent associée à la lavande, au gingembre et aux muscs.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885380/hf_20260428_133547_88206f10-7510-47af-bccc-e2b0789a30ce_h02bmw.png'
      },
      {
        name: 'Myrrhe',
        desc: 'Quelque chose d\'ancien qui semble encore moderne.',
        detail: "Chaude, légèrement amère, avec une profondeur épicée en dessous. Pas une odeur que la plupart des gens peuvent nommer immédiatement, mais qu'ils reconnaissent au moment où ils la rencontrent : de l'encens, des soins haut de gamme, des églises ou des temples. C'est plus ancien que la plupart des odeurs que vous connaissez. Utilisé par de nombreuses marques de Dries Van Noten à Jo Malone.\nEn parfumerie, la myrrhe est utilisée pour apporter une profondeur chaude qui ancre tout ce qui est au-dessus. Ses molécules sont parmi les plus lourdes de la parfumerie. Souvent associée au benjoin, au miel ou aux floraux.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885410/hf_20260428_133745_7ca73248-3b95-44df-94d4-95b230a54217_gslxyb.png'
      },
      {
        name: 'Cacao',
        desc: 'Pas du chocolat. La poudre brute. Chaude, légèrement amère, profondément réconfortante.',
        detail: "Noisy, poussiéreux et légèrement amer, plus proche du cacao non sucré pour la pâtisserie que de quoi que ce soit qu'on mangerait. Il y a une chaleur qui ne vient pas de la douceur mais de quelque chose de plus profond et de plus minéral. Vous le connaissez des boulangeries, de l'intérieur d'une boîte de bon chocolat chaud.\nEn parfumerie, le cacao est utilisé pour apporter une profondeur chaude et légèrement gourmande. Ses molécules se situent dans le cœur et la base, s'évaporant lentement et se mélangeant facilement avec les résines, les muscs et les bois chauds. Souvent associé aux agrumes, au bois de santal ou à la vanille.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885403/hf_20260428_141332_1965b4a9-86e6-4d46-9f6b-f96d6dcb17d9_jxmaot.png'
      }
    ]
  },
  OFFGRID: {
    you: 'Vous êtes',
    identity: 'secrètement en train de planifier de disparaître.',
    descriptor: 'La nature est votre bouton de réinitialisation.',
    desc: [
      "Vous avez besoin d'espace. Parfois vous pensez : « J'aimerais vivre au milieu de nulle part. » Et vous le pensez vraiment.",
      "Vous vous sentez mieux après deux heures dehors. Une longue marche sans destination. Un endroit sans réseau. Un matin qui commence avant que quiconque soit réveillé et qui vous appartient complètement.",
      "Vous n'êtes pas antisocial(e). Vous avez juste une relation très honnête avec ce qui vous ressource vraiment. Vous ne fuyez rien. Vous courez vers la version de votre vie où moins c'est plus.",
      "Vous avez une relation compliquée avec les bavardages, les open spaces, et tout ce qui est décrit comme « networking. »",
      "Vous êtes plus solide que vous en avez l'air et plus doux/douce que vous ne le laissez paraître. Les deux sont vrais. Aucun n'est toute l'histoire.",
      "Votre parfum est terre, air froid, fumée, et quelque chose qui fleurit à travers l'écorce."
    ],
    main: {
      name: 'Coven', house: 'Andrea Maack',
      desc: 'Sent comme être dehors assez longtemps pour oublier le temps. Terre humide. Racines. Air froid sur la peau.',
      img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbc4c4c9baefd1bb0ebf81_offgrid-coven.png',
      link: 'https://www.niche-beauty.com/fr-fr/produits/andrea-maack-coven/844-023'
    },
    alts: [
      { name: 'Baikal Leather Intense', house: 'Nicolaï', desc: 'Assez froid pour se sentir vivant(e). Assez éloigné pour se sentir libre.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbcd7227b99461cba4c136_11.png', link: 'https://nicolaiparis.com/en/products/baikal-leather-intense-1' },
      { name: 'From the Garden', house: 'Maison Margiela', desc: 'De la terre sous les ongles. Le soleil dans le cou. Nulle part ailleurs à être.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbcd4772c26d08b99d8316_10.png', link: 'https://www.my-origines.com/fr/from-the-garden-59L23139.html' },
      { name: 'Sandflowers', house: 'Montale', desc: 'Vent, sel, rien au calendrier. Enfin.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbce1eb318deb4d73590e9_8.png', link: 'https://montaleparfums.com/en/marine/70-376-sandflowers-argent.html' }
    ],
    ingredients: [
      {
        name: 'Noix Noire',
        desc: 'Sombre, légèrement amère, et complètement unique.',
        detail: "Riche, terreuse et légèrement piquante avec un bord brut et légèrement tannique. Pas une odeur de nourriture, plutôt la coque boisée. Vous pourriez la trouver dans des épiceries artisanales, des soins de spécialité ou certains parfums de niche.\nEn parfumerie, la noix noire est utilisée pour apporter une terrosité sombre et ancrante qui se situe dans la base d'un parfum. Ses molécules sont lourdes et lentes à s'évaporer. Elle ajoute une profondeur brute et légèrement amère qui empêche les parfums de sembler polis. Souvent associée au vétiver, à la fumée ou aux bois sombres.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885496/hf_20260428_133100_047c96e8-8c61-45c4-a73c-65eb468d5730_bm12s4.png'
      },
      {
        name: 'Sauge',
        desc: 'Sèche, légèrement poivrée comme la méditation elle-même.',
        detail: "Il y a une fumée en dessous qui la rend plus sauvage que la plupart des herbes. Vous la connaissez de la cuisine, des bâtons de smudge, de certains produits de soins. Sur la peau, elle devient plus sèche et plus minérale que vous ne vous y attendez.\nEn parfumerie, la sauge est utilisée pour apporter une clarté herbale tranchante qui semble en plein air et non polie. Ses molécules s'évaporent à vitesse moyenne, la plaçant au cœur du parfum. C'est l'un des rares ingrédients herbaux qui ne s'adoucit pas dans un parfum — il reste sec et légèrement glacé. Utilisé par des marques comme YSL, Valentino, Dossier.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885503/sage_hame6q.jpg'
      },
      {
        name: 'Opoponax',
        desc: 'Un feu éteint il y a une heure mais le bois est encore chaud.',
        detail: "Sucré, chaud épicé et légèrement fumé — la myrrhe est son proche parent. Il vient d'une résine végétale trouvée en Afrique de l'Est et au Moyen-Orient. Vous pourriez le connaître de l'encens ou de certains parfums naturels. Ça sent quelque chose qui brûlait il y a longtemps et a laissé sa chaleur dans les murs. L'un des parfums les plus célèbres avec cet ingrédient est « Shalimar » de Guerlain.\nEn parfumerie, l'opoponax est utilisé comme note de fond et fixatif. Ses molécules lourdes s'évaporent lentement et prolongent tout ce qui les entoure. Il ajoute une douceur chaude et fumée. Souvent associé aux bois.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885531/Opoponax1_qnzzdh.png'
      },
      {
        name: 'Pin',
        desc: 'Forêt. Air froid. Randonnée.',
        detail: "Piquant, résineux et propre, mais plus froid et plus glacé que le pin des bougies de Noël. La vraie odeur du pin est plus dure que la plupart des gens ne s'y attendent. Vous la connaissez des forêts ou de l'air de montagne. Utilisé par des marques comme Filippo Sorcinelli, Serge Lutens, Comme des Garçons, le célèbre « Gypsy Water » de Byredo.\nEn parfumerie, le pin est utilisé pour apporter une netteté froide et en plein air que la plupart des ingrédients ne peuvent pas atteindre. Ses molécules sont légères et volatiles, en font une note de tête. Il donne aux parfums un sentiment d'espace ouvert et d'altitude. Souvent associé à la sauge, au vétiver ou à la fumée.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885536/hf_20260428_132627_ea358af3-7764-49ee-b5e3-4015e19ad4fe_cl3jch.png'
      },
      {
        name: 'Vétiver',
        desc: 'Des racines arrachées de la terre sombre. Quelque chose d\'honnête en lui.',
        detail: "Il vient des racines d'une herbe originaire d'Inde, et l'odeur est indubitablement souterraine. Vous pourriez le connaître de certaines eaux de cologne ou de soins naturels. Ça sent la terre elle-même plutôt que ce qui y pousse. De nombreuses marques de parfums (de Chanel à Frédéric Malle) l'ont utilisé.\nEn parfumerie, le vétiver est l'une des notes de fond les plus importantes qui soit. Ses molécules sont extrêmement lourdes et lentes à s'évaporer, ce qui signifie qu'il reste sur la peau des heures après que tout le reste soit parti. Il ancre les parfums et ajoute une profondeur brute et fumée.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885580/hf_20260428_140455_e4acec14-5d2c-4118-a1a6-c4e5dda006a0_eowwiz.png'
      }
    ]
  },
  OUTOFTIME: {
    you: 'Vous êtes',
    identity: 'chroniquement ailleurs.',
    descriptor: "Présent(e) en corps. Quelque part d'entièrement différent dans votre tête.",
    desc: [
      "Vous avez un type de brouillard préféré.",
      "Vous romantisez la pluie. Vous avez décrit votre vendredi soir idéal comme « honnêtement, rester à la maison. »",
      "Vous n'êtes pas antisocial(e). Vous êtes sélectif/sélective. Vous êtes plus à l'aise dans la semi-obscurité qu'en pleine lumière.",
      "Vous êtes atmosphérique. Vous ne suivez pas les tendances. Vous suivez les humeurs.",
      "Les gens vous appellent mystérieux/mystérieuse surtout parce que vous ne vous expliquez pas, et vous trouvez cette explication inutile.",
      "Les gens vous trouvent intéressant(e) d'une façon qu'ils ne peuvent pas expliquer. C'est parce que vous n'essayez pas d'être intéressant(e). Vous êtes juste ailleurs.",
      "Votre parfum est minéral, sombre et caché. Fumée, ombre et quelque chose que vous ne pouvez pas tout à fait nommer."
    ],
    main: {
      name: 'Gris Clair', house: 'Serge Lutens',
      desc: 'Sent comme une pensée que vous avez depuis des années et que vous avez finalement arrêté de combattre.',
      img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbc609137dcd257a6dd5ae_outoftime-gris.png',
      link: 'https://sergelutens.fr/products/gris-clair-eau-de-parfum-spray'
    },
    alts: [
      { name: 'Aromatics Elixir', house: 'Clinique', desc: "D'une époque où l'excès était une philosophie. Vous comprenez pourquoi.", img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd0a99c6d03bf461752c9_23.png', link: 'https://www.clinique.fr/product/aromatics-elixir-eau-de-parfum-spray?size=45_ml' },
      { name: 'Encre Noire', house: 'Lalique', desc: 'Sombre, délibéré, et complètement indifférent à votre réaction.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd0609c6d03bf461738ee_22.png', link: 'https://www.notino.fr/lalique/encre-noire-for-men-eau-de-toilette-pour-homme/p-62724/' },
      { name: 'Grey Flannel', house: 'Geoffrey Beene', desc: 'Sent comme rester quand tout le monde est sorti. Et avoir eu raison.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd01c7659885dec161fb2_21.png', link: 'https://www.my-origines.com/fr/grey-flannel-09118624.html' }
    ],
    ingredients: [
      {
        name: 'Violette',
        desc: 'Poussiéreuse, poudrée et douce comme un effleurement.',
        detail: "Crayeuse, légèrement sucrée, avec un bord vert frais sous la fleur. Pas un parfum floral fort. Il y a quelque chose de légèrement nostalgique sans être sentimental. Vous pourriez la connaître de certains bonbons d'autrefois ou d'un rouge à lèvres vintage.\nEn parfumerie, la violette est utilisée pour apporter une profondeur douce et poudrée entre le floral et le terreux. Ses molécules s'évaporent à vitesse moyenne, la plaçant au cœur du parfum. C'est l'un des rares floraux qui se replie plutôt que de se projeter, c'est pourquoi il apparaît si souvent dans les parfums construits autour de la retenue. Souvent associé au tabac, aux fleurs, aux fruits et utilisé par des marques comme Byredo ou Guerlain.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885635/violet1_tirxvl.png'
      },
      {
        name: 'Encens',
        desc: 'Fumée de quelque chose de cérémoniel.',
        detail: "Sec, fumé et légèrement sucré avec une qualité résineuse chaude en dessous. L'odeur que la plupart des gens connaissent des églises, des temples ou des studios de yoga. C'est la fumée plutôt que la résine elle-même — cette qualité particulière de quelque chose qui brûle lentement et délibérément. Sur la peau, il devient plus tranquille et plus personnel que vous ne vous y attendez.\nEn parfumerie, l'encens est utilisé pour apporter une profondeur fumée et méditative que très peu d'autres ingrédients peuvent reproduire. Utilisé par des marques modernes d'Etat Libre d'Orange à Comme des Garçons. Ses molécules sont lourdes et lentes. Souvent associé aux muscs, à la vanille et aux bois.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885644/hf_20260428_132415_f8646aa3-8b2f-4452-986a-0c9744ed4252_jjekcd.png'
      },
      {
        name: 'Racine d\'Orris',
        desc: 'Poudrée et vintage. Comme le dîner de gala dans un endroit chic.',
        detail: "Poudrée et légèrement terreuse, elle vient de la racine séchée de la plante iris, qui prend trois ans à mûrir et encore trois à traiter. L'odeur est vintage d'une façon difficile à expliquer. Elle donne aux parfums l'impression de porter une histoire. Vous pourriez la rencontrer dans des soins haut de gamme ou de la parfumerie de niche comme Céline, Maison Crivelli ou Nishane.\nEn parfumerie, l'orris est l'un des ingrédients les plus chers et laborieux qui soit. Ses molécules lourdes se situent profondément dans la base d'un parfum. Souvent associé à la vanille, à la violette, à l'encens ou au cuir.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885651/hf_20260428_132444_7a44eefa-413e-4ff4-9a35-9b1c13d09f1d_fu1eem.png'
      },
      {
        name: 'Pierre Mouillée',
        desc: 'Minérale et froide mais étrangement apaisante.',
        detail: "Propre et légèrement métallique : l'odeur d'une pierre soulevée d'un lit de rivière ou d'une surface rocheuse après la pluie. Pas terreuse comme la terre. Plus minérale, plus précise. C'est l'une de ces odeurs immédiatement apaisantes d'une façon qu'on ne peut pas tout à fait expliquer.\nEn parfumerie, la pierre mouillée est utilisée pour apporter une fraîcheur froide que très peu d'ingrédients naturels peuvent atteindre. Elle est souvent reproduite par une combinaison de molécules aquatiques et minérales qui s'évaporent rapidement. Souvent associée à la menthe, à l'encens ou aux résines sombres.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885655/wet-stone1_dz7ohe.png'
      },
      {
        name: 'Cassis',
        desc: 'Sombre, légèrement dangereux, et rien à voir avec le jus.',
        detail: "Le bourgeon brut ne sent absolument pas le fruit. C'est plus sombre, plus piquant, avec un bord presque fumé qui surprend la plupart des gens la première fois qu'ils le rencontrent. C'est étrange dans le meilleur sens possible. Trouvé dans certains parfums de niche et bougies artisanales. Vaut la peine d'être recherché spécifiquement parce qu'il ne sent pas ce que vous attendez. On l'entend dans de nombreuses marques de Dries Van Noten et Floraiku à Valentino et Creed.\nEn parfumerie, le bourgeon de cassis est utilisé pour ajouter un bord sombre et légèrement brut qui traverse la douceur et ajoute de la complexité. Souvent associé aux fleurs, aux bois sombres et parfois aux agrumes.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885658/hf_20260428_131925_dd783dbb-36c7-474e-9a4a-3328f6d7df2a_rymcb7.png'
      }
    ]
  },
  SUMMER: {
    you: 'Vous êtes',
    identity: 'pathologiquement détendu(e).',
    descriptor: "Toutes les bonnes vacances ont quelqu'un comme vous.",
    desc: [
      "Vous avez planifié un voyage pour un groupe de personnes qui ne pouvaient s'entendre sur rien et vous avez réussi à rendre tout le monde heureux.",
      "Vous passez facilement d'un projet à l'autre, d'une personne à l'autre. Vous gardez les choses légères sans perdre le fil. Vous n'êtes pas naïf/naïve sur le fonctionnement des choses — vous êtes optimiste, ce qui est différent.",
      "Vous remontez l'énergie sans monter le volume. Vous rendez les situations compliquées plus simples juste par votre présence.",
      "Vous n'avez pas besoin de drame pour vous sentir vivant(e). Vous avez de l'élan, ce qui dure plus longtemps et cause moins de problèmes. Les gens se sentent mieux après avoir passé du temps avec vous et ne savent pas toujours pourquoi.",
      "Votre parfum est une pierre chaude sur la plage, l'air chaud, et le sentiment que la journée va bien se passer."
    ],
    main: {
      name: 'Solo Vulcan', house: 'Loewe',
      desc: "Sent l'élan. Le genre qui n'a pas besoin de plan.",
      img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbc743841913865b2a9338_summer-solo.png',
      link: 'https://www.perfumesloewe.com/int/en_FR/men/loewe-solo/loewe-solo-vulcan-edp-100ml-LW80620.html'
    },
    alts: [
      { name: 'Avgoustos', house: 'Parfums de Marly', desc: 'Chaleur, sel, le temps qui ralentit exprès.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd48441e84e3b0ceb7289_34.png', link: 'https://www.korres.fr/products/eau-de-toilette-avgoustos' },
      { name: 'Bois de Yuzu', house: 'Karl Lagerfeld', desc: 'La nuit est jeune et la conversation aussi.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd43a7659885dec179a63_33.png', link: 'https://www.notino.fr/karl-lagerfeld/bois-de-yuzu-eau-de-toilette-pour-homme/p-15791163/' },
      { name: 'Un Jardin sur le Nil', house: 'Hermès', desc: 'Se déplace comme vous. Léger, sans hâte, et pourtant partout à la fois.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd4b7d360f752977ab6c9_35.png', link: 'https://www.hermes.com/fr/fr/product/un-jardin-sur-le-nil-eau-de-toilette-V26993/' }
    ],
    ingredients: [
      {
        name: 'Tiaré',
        desc: 'Une fleur blanche dans un vent chaud. Légèrement sucrée et fraîche.',
        detail: "Crémeux, doux et légèrement exotique. Le tiaré est la fleur utilisée dans l'huile de monoï, que vous connaissez peut-être des produits solaires ou des huiles capillaires d'origine polynésienne. C'est une fleur blanche qui s'épanouit dans la chaleur, et elle sent exactement ça — estival, cocooning et légèrement sucré. Notre incontournable est « Heliodose » de Marlou.\nEn parfumerie, le tiaré est utilisé pour apporter une qualité florale tropicale chaude qui ne semble pas lourde. Ses molécules s'évaporent à vitesse moyenne, le plaçant au cœur du parfum où il ajoute une profondeur douce et ensoleillée. Souvent associé à la noix de coco, aux agrumes, aux autres fleurs blanches ou aux muscs légers.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885741/tiare1_xmotv4.png'
      },
      {
        name: 'Sel Marin',
        desc: 'Votre peau une heure après la baignade. Minérale et légère.',
        detail: "Propre, légèrement amer et indubitablement côtier : l'odeur d'une peau qui a été dans l'océan et a séché au soleil. Vous le connaissez de la plage, de certains produits de soins, de l'air d'une ville côtière le matin. Il donne aux parfums la sensation d'être quelque part plutôt que de porter quelque chose.\nEn parfumerie, le sel marin est utilisé pour apporter une fraîcheur propre et pétillante qui est ouverte et sans contrainte. Ses molécules sont légères et volatiles, en font une note de tête. Il donne aux parfums un sens de l'espace et de l'air. Souvent associé aux notes laiteuses, boisées ou fleuries.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885744/sea-salt1_iwtvlx.png'
      },
      {
        name: 'Graine de Carotte',
        desc: 'Chaude, sèche, et rien à voir avec le légume.',
        detail: "Terreuse, légèrement épicée, avec un bord boisé sec en dessous. La graine de carotte est extraite des graines de la carotte sauvage et ne sent absolument pas la nourriture. C'est plus chaud et plus complexe que ça. Vous pourriez la trouver dans les soins naturels et les huiles d'aromathérapie. Utilisée par LV, Tom Ford, Amouage, Prada, Kilian, Byredo, Nishane et bien d'autres.\nEn parfumerie, la graine de carotte est utilisée pour apporter une profondeur chaude et légèrement épicée qui se situe dans le cœur et la base d'un parfum. Souvent associée aux agrumes, aux graines, aux floraux ou aux notes vertes.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885747/hf_20260428_131402_8546c5c2-655b-471f-b044-c0f7e4fdaa74_drbx9q.png'
      },
      {
        name: 'Herbe Fraîche',
        desc: "L'odeur de l'été.",
        detail: "Légèrement sucrée et immédiatement reconnaissable : l'herbe fraîchement coupée est l'une des odeurs les plus universellement connues au monde. Il y a une fraîcheur causée par la plante qui libère des composés au moment où elle est coupée. Vous l'avez sentie toute votre vie. Sur la peau, elle devient plus propre et plus abstraite : moins pelouse, plus air libre. Hermès l'utilise pour ses senteurs fraîches.\nEn parfumerie, l'herbe est utilisée pour apporter une luminosité verte et fraîche qui semble immédiatement extérieure. Ses molécules sont légères et volatiles. Souvent associée aux floraux légers, aux agrumes, aux notes fruitées.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885751/hf_20260428_131409_f4c0d2a1-c968-49cc-900d-7fee2c9566c9_csz0mi.png'
      },
      {
        name: 'Concombre',
        desc: 'Frais, aqueux, légèrement vert. L\'odeur de quelque chose de rafraîchissant.',
        detail: "Propre, légèrement sucré et presque transparent, comme une gorgée d'eau pétillante par une journée chaude. L'odeur du concombre est l'une des choses les plus immédiatement rafraîchissantes qu'on puisse rencontrer. Il y a une qualité aqueuse rafraîchissante et apaisante. Vous le connaissez des soins, de l'eau de spa, ou même de couper un concombre par une chaude après-midi.\nEn parfumerie, le concombre est utilisé pour apporter une fraîcheur froide et aqueuse très proche de la peau. Ses molécules sont légères et s'évaporent rapidement, en font une note de tête qui crée une impression immédiate de sortir de la douche avant de laisser place à des ingrédients plus chauds. Jamais assez sucré pour être gourmand.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885753/hf_20260428_131017_162611d5-70ae-4e8e-b89f-dcfda00ddbc7_kt2ucz.png'
      }
    ]
  },
  THERAPIST: {
    you: 'Vous êtes',
    identity: 'dangereusement empathique.',
    descriptor: 'Vous savez déjà. Vous savez toujours.',
    desc: [
      "Vous savez des choses sur les gens qu'ils ne vous ont pas encore dites. Pas parce que vous fouinez — parce que vous faites attention d'une façon que la plupart des gens ne font pas.",
      "Vous êtes chaleureux/chaleureuse, mais précis(e). Vous savez quand quelqu'un a besoin d'entendre la chose difficile et vous savez comment la dire.",
      "Vous avez des standards pour tout — votre espace, votre temps, les conversations que vous êtes prêt(e) à avoir. Pas parce que vous êtes difficile. Parce que vous savez ce qui fonctionne et vous avez arrêté de vous en excuser.",
      "Les gens se sentent vus autour de vous, ce qui signifie qu'ils vous évitent parfois quand ils ne sont pas prêts à être vus. Vous comprenez. Vous attendez.",
      "Vous n'êtes pas pour tout le monde. Vous vous êtes fait(e) à cette idée. En fait, vous préférez ça.",
      "Votre parfum est chaud, profond, et déjà décidé. Quelque chose qui n'a pas besoin de se justifier."
    ],
    main: {
      name: 'Black Tea', house: 'Jil Sander',
      desc: 'Sent comme la conversation que vous ne vouliez pas voir se terminer.',
      img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbc802f2d99f701a1415fd_therapist-blacktea.png',
      link: 'https://www.jilsander.com/fr-fr/jil-sander-black-tea-100-ml/J65YX0006JFR001998.html'
    },
    alts: [
      { name: 'Geranio Imperiale', house: 'Culti Milano', desc: 'Assez précis pour tout remarquer. Assez composé pour ne pas en mentionner la plupart.', img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd3d5e80c9c7c162eedbe_44.png', link: 'https://www.notino.fr/culti/geranio-imperiale-aquae-di-profumo-eau-de-toilette-mixte/' },
      { name: '1472 La Divina Commedia', house: 'Histoires de Parfums', desc: "Sait exactement où ça se termine. C'est ce qui le rend sûr d'être près de lui.", img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd3679c6d03bf4618308b_41.png', link: 'https://www.notino.fr/histoires-de-parfums/1472-eau-de-parfum-mixte/p-16349773/' },
      { name: '702', house: 'Bon Parfumeur', desc: "Sent comme quelqu'un qui a déjà tout pensé pour que vous n'ayez pas à le faire.", img: 'https://cdn.prod.website-files.com/69a98cf53a8601ad66e703e9/69cbd3a1d34b8acd99b18bb2_42.png', link: 'https://www.bonparfumeur.com/fr/products/702-incense-lavender-and-cashmere-wood' }
    ],
    ingredients: [
      {
        name: 'Oud',
        desc: 'Une odeur très enveloppante. Dense et collante.',
        detail: "Sombre, boisé et profondément complexe avec un bord brut qui le rend unique. Il vient de la résine qui se forme à l'intérieur des arbres d'agar lorsqu'ils sont infectés, c'est pourquoi c'est l'un des ingrédients les plus rares et les plus chers de la parfumerie. L'odeur est ancienne, en couches et légèrement médicinale, pas immédiatement confortable, mais impossible à oublier une fois rencontrée.\nEn parfumerie, l'oud est utilisé comme note de fond d'une longévité extraordinaire. Ses molécules sont parmi les plus lourdes qui existent, s'évaporant extrêmement lentement et restant sur la peau des heures et parfois des jours. Il transforme tout ce qui l'entoure. Souvent associé au bois de santal, à la rose ou aux résines sombres.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885775/oud1_bi4wwt.png'
      },
      {
        name: 'Bois de Santal',
        desc: 'Bois chaud dans la lumière de fin d\'après-midi. Crémeux et liquide.',
        detail: "Doux, crémeux et légèrement sucré avec une qualité chaude et laiteuse qui semble plus proche de la peau que de la forêt. Le vrai bois de santal, de Mysore en Inde ou des îles de Timor, est l'une des odeurs les plus douces qui existent. Vous le connaissez de l'encens, de certains savons, des soins haut de gamme.\nEn parfumerie, le bois de santal est l'une des notes de fond les plus importantes jamais utilisées. Ses molécules sont lourdes et s'évaporent lentement, créant une base chaude et crémeuse qui se mélange harmonieusement avec presque n'importe quel autre ingrédient. Il ne rivalise pas avec les autres ingrédients, il soutient. Souvent utilisé pour adoucir les bords des ingrédients plus sombres comme l'oud ou le patchouli.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885845/sandalwood_szlhj7.png'
      },
      {
        name: 'Patchouli',
        desc: 'L\'odeur des racines — pas de la terre, mais de la profondeur.',
        detail: "Terreux, sombre et légèrement sucré avec une qualité riche, presque fermentée en dessous. Pas la version lourde et écrasante que la plupart des gens associent aux années 1970. En petites quantités précises, il ajoute une terrosité sombre et ancrante. Vous pourriez le connaître de certaines bougies haut de gamme ou de parfums de niche.\nEn parfumerie, le patchouli est utilisé comme note de fond. Ses molécules lourdes s'évaporent lentement et prolongent la vie de tout ce qui est au-dessus. Il ajoute de la profondeur et du pouvoir de fixation. Souvent associé au bois de santal, à l'oud ou aux résines sombres. L'ingrédient qui laisse le parfum plus longtemps sur votre peau.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885848/patchouli1_mz9hrh.png'
      },
      {
        name: 'Thé Noir',
        desc: 'Une tasse qui a infusé juste assez longtemps. Chaude, légèrement amère, attentive.',
        detail: "Sec, légèrement vineux et légèrement fumé avec une qualité chaude, presque cuirée en dessous. Pas la version sucrée d'une bouteille au supermarché, mais la vraie chose, un peu comme un thé turc. Sur la peau, il devient plus chaud et plus complexe.\nEn parfumerie, le thé noir est utilisé pour apporter une sophistication chaude et légèrement amère qui se situe au cœur d'un parfum. Ses molécules s'évaporent à vitesse moyenne. Il ajoute une qualité sèche et attentive qui empêche les parfums de sembler trop doux ou trop sucrés. Souvent associé au bois de santal, à l'oud ou aux muscs légers.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885852/hf_20260428_130858_f0573332-8837-41bd-b9d6-b45adb7c73f3_mohca3.png'
      },
      {
        name: 'Betterave',
        desc: 'Sombre, légèrement sucrée, et complètement inattendue sur la peau.',
        detail: "Terreuse, légèrement sucrée, avec une profonde qualité minérale en dessous qui est unique. La betterave crue ne sent absolument pas la betterave cuite. C'est plus sombre et plus complexe, plus proche de la terre humide et du fer que de quelque chose de comestible. La plupart des gens n'y ont jamais pensé comme ingrédient de parfum, c'est exactement pourquoi ça fonctionne ici. Trouvez-en sur n'importe quel marché, coupez-en une et sentez-la avant qu'elle soit cuite. Utilisé par Comme des Garçons, Diptyque, Boy Smells, Jo Malone et d'autres.\nEn parfumerie, la betterave est utilisée comme note sombre inattendue qui ajoute une complexité terreuse et légèrement sucrée à la base d'un parfum. Souvent associée aux bois sombres, aux résines ou aux notes de thé.",
        img: 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885864/hf_20260428_130445_076b2947-292d-4493-9637-1eeb7a7199a5_nkqpoi.png'
      }
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
    '  background: rgba(0,0,0,0.45);',
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
'@media (max-width: 767px) {',
'  .fms-ingredient-item {',
'    flex-direction: row;',
'    gap: 16px;',
'    padding: 8px 0;',
'  }',
'  .fms-ingredient-img {',
'    order: 2;',
'    flex-shrink: 0;',
'    width: 64px;',
'    height: 64px;',
'    border-radius: 50%;',
'    object-fit: cover;',
'  }',
'  .fms-ingredient-body {',
'    order: 1;',
'    flex: 1;',
'  }',
'  .fms-ingredient-readmore {',
'    align-self: flex-start;',
'  }',
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
    '  background: rgba(0,0,0,0.45);',
    '  border-radius: 4px;',
    '}',
'.fms-z5-email-title {',
'  font-family: HIGHCRUISER, "Arial Black", Arial, sans-serif;',
'  font-size: clamp(28px, 4vw, 48px);',
'  font-weight: 400;',
'  color: #fff;',
'  letter-spacing: 0.06em;',
'  text-transform: uppercase;',
'  margin-bottom: 10px;',
'  line-height: 1.1;',
'}',
'.fms-z5-email-sub {',
'  font-family: Inconsolata, monospace;',
'  font-size: 35px;',
'  color: rgba(255,255,255,0.5);',
'  margin-bottom: 24px;',
'  letter-spacing: 0.04em;',
'  font-style: normal;',
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
    '<button id="fms-modal-close" aria-label="Fermer">\u2715</button>' +
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
        '<button class="fms-ingredient-readmore" data-archetype="' + key + '" data-index="' + idx + '">En savoir plus</button>' +
        '</div></div>';
    }).join('');
    ingredientsHTML = '<div class="fms-ingredients">' +
      '<span class="fms-ingredients-label">ingrédients qui méritent d\'être découverts</span>' +
      '<div class="fms-ingredients-list">' + itemsHTML + '</div>' +
      '</div>';
  }

  var ac = FMS_ARCH_COLORS[key] || { zoneBg: 'transparent', titleColor: '#8B3A22', textColor: '#2a2a2a', ruleColor: '#2a2a2a' };

  // ZONE 2a — Description only (gets archetype background)
  var z2a = document.createElement('div');
  z2a.className = 'fms-zone fms-z2a';
  z2a.style.marginTop = '5vh';
  z2a.style.paddingLeft = '10%';
  z2a.style.paddingRight = '10%';
  if (ac.zoneBg !== 'transparent') {
    z2a.style.cssText = 'background:' + ac.zoneBg + ';margin-left:calc(-50vw + 50%);margin-right:calc(-50vw + 50%);margin-top:5vh;padding:60px calc(50vw - 50% + 10%) 48px;box-sizing:border-box;';
  }
  z2a.innerHTML = '<div class="fms-z2-title" style="color:' + ac.titleColor + ';">VOTRE PERSONNALITÉ OLFACTIVE</div>' +
    '<hr class="fms-z1-rule" style="border-color:' + ac.ruleColor + ';opacity:0.3;">' +
    '<div class="fms-z2-text">' +
    arch.desc.map(function(p) { return '<p style="color:' + ac.textColor + ';">' + p + '</p>'; }).join('') +
    '</div>';
  block.appendChild(z2a);

  // ZONE 2b — Ingredients (always on page background)
  z2.innerHTML = ingredientsHTML +
    '<div class="fms-z3-label">votre parfum</div>';
  block.appendChild(z2);

  // ZONE 3 — Main perfume
  const z3 = document.createElement('div');
  z3.className = 'fms-zone fms-z3';
  z3.innerHTML = '<img class="fms-z3-bottle" src="' + arch.main.img + '" alt="' + arch.main.name + '" crossorigin="anonymous">' +
    '<div class="fms-z3-name">' + arch.main.name + '</div>' +
    '<div class="fms-z3-house">' + arch.main.house + '</div>' +
    '<div class="fms-z3-desc">' + arch.main.desc + '</div>' +
    '<a class="fms-z3-cta" href="' + arch.main.link + '" target="_blank" rel="noopener">découvrir \u2192</a>';
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
      '<a class="fms-z4-discover" href="' + a.link + '" target="_blank" rel="noopener">découvrir \u2192</a>' +
      '</div>';
  }).join('');
  z4.innerHTML = '<span class="fms-z4-label">à considérer également</span>' +
    '<span class="fms-z4-sublabel">même énergie, moins de 100\u20ac</span>' +
    '<div class="fms-z4-list">' + altsHTML + '</div>';
  block.appendChild(z4);

  // ZONE 5 — Share
  const z5 = document.createElement('div');
  z5.className = 'fms-zone fms-z5';
  z5.innerHTML = '<div class="fms-z5-email" id="fms-email-' + key + '">' +
    '<div class="fms-z5-email-title">Vous voulez garder ça ?</div>' +
    '<div class="fms-z5-email-sub">Votre archétype complet. Les ingrédients qui vous ont choisi(e). Un email, rien d\'autre.</div>' +
    '<div class="fms-z5-email-row">' +
    '<input class="fms-z5-email-input" id="fms-ei-' + key + '" type="email" placeholder="votre@email.com">' +
    '<button class="fms-z5-email-send" id="fms-es-' + key + '">Envoyer mon résultat</button>' +
    '</div>' +
    '<div class="fms-z5-email-consent">' +
    '<input type="checkbox" id="fms-ec-' + key + '">' +
    '<label class="fms-z5-email-consent-label" for="fms-ec-' + key + '">J\'accepte de recevoir mon résultat de quiz par email. Un seul email, pas de marketing. <a href="/fr/privacy-policy" target="_blank">Politique de confidentialité</a>.</label>' +
    '</div>' +
    '<div class="fms-z5-email-msg" id="fms-em-' + key + '"></div>' +
    '</div>';
block.appendChild(z5);

 
  // Email wiring
  var emailInput   = z5.querySelector('#fms-ei-' + key);
  var emailSend    = z5.querySelector('#fms-es-' + key);
  var emailConsent = z5.querySelector('#fms-ec-' + key);
  var emailMsg     = z5.querySelector('#fms-em-' + key);
  var APPS_URL     = 'https://script.google.com/macros/s/AKfycbxLaOnGVCv3P8ge0cKaP59ZdYUcgySLo7CUUhef4eltooQqg59W35MPzZ6CVtsnifA/exec';

  emailSend.addEventListener('click', function() {
    var email = emailInput.value.trim();
    if (!email || !email.includes('@')) {
      emailMsg.textContent = 'Veuillez entrer une adresse email valide.';
      emailMsg.className = 'fms-z5-email-msg error';
      return;
    }
    if (!emailConsent.checked) {
     emailMsg.textContent = 'Veuillez cocher la case de consentement pour continuer.';
      emailMsg.className = 'fms-z5-email-msg error';
      return;
    }
    emailSend.disabled = true;
    emailSend.textContent = 'Envoi en cours…';
    emailMsg.textContent = '';
    emailMsg.className = 'fms-z5-email-msg';

var winner = (sessionStorage.getItem('quiz_result') || localStorage.getItem('quiz_result') || '').toUpperCase();
var scores = {};
try { scores = JSON.parse(localStorage.getItem('quiz_scores') || '{}'); } catch(e2) {}
var answers = sessionStorage.getItem('quiz_answers') || localStorage.getItem('quiz_answers') || '';
var open_answer = sessionStorage.getItem('quiz_open') || localStorage.getItem('quiz_open') || ''; // ← this line

    fetch(APPS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'payload=' + encodeURIComponent(JSON.stringify({ email: email, winner: winner, scores: scores, answers: answers, open_answer: open_answer, page_url: window.location.href }))
    })
    .then(function(r) { return r.text(); })
    .then(function(t) {
      console.log('Response:', t);
      if (t && t.indexOf('error') === -1) {
        emailMsg.textContent = 'Fait ! Vérifiez votre boîte de réception dans quelques minutes.';
        emailMsg.className = 'fms-z5-email-msg success';
        emailSend.textContent = 'Envoyé ✓';
      } else {
        throw new Error(t);
      }
    })
    .catch(function(err) {
      console.log('Error:', err);
      emailMsg.textContent = 'Une erreur s\'est produite. Veuillez réessayer.';
      emailMsg.className = 'fms-z5-email-msg error';
      emailSend.disabled = false;
      emailSend.textContent = 'Envoyer mon résultat';
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
   // if (data.main.desc) ARCHETYPES[key].main.desc = data.main.desc;
    }
   // if (data.alts.length) {
//   ARCHETYPES[key].alts = data.alts.map(function(a) {
//     return { name: a.name, house: a.brand, link: a.link, img: a.img, desc: a.desc };
//   });
// }
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
