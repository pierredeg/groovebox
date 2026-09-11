// Bibliothèque de rythmiques.
//
// Notation : un caractère par pas (double-croche), 32 pas = 2 mesures.
//   X = accent   x = coup normal   o = ghost note   . = silence
//   |            séparateur de temps, purement visuel (ignoré au parsing)
//
// swing : 0.50 = binaire strict, 0.58–0.62 = le shuffle garage/2-step,
//         0.66 = triolet franc.
//
// Ajouter un groove = ajouter un objet ici. `npm run validate` vérifie que
// chaque ligne fait bien 32 pas et que les instruments existent.

export const GENRES = ['House', 'UK Garage', '2-Step', 'Jungle', 'IDM']

export const PATTERNS = [
  // ---------------------------------------------------------------- House
  {
    id: 'house-four-to-the-floor',
    name: 'Four to the Floor',
    genre: 'House',
    bpm: 124,
    swing: 0.5,
    notes: "Le socle : kick sur les quatre temps, clap sur 2 et 4, open hat sur le contretemps. Tout le reste de la house se construit là-dessus.",
    tracks: {
      kick:   'X...|X...|X...|X...|X...|X...|X...|X...',
      clap:   '....|X...|....|X...|....|X...|....|X...',
      ohat:   '..x.|..x.|..x.|..x.|..x.|..x.|..x.|..x.',
      shaker: 'oooo|oooo|oooo|oooo|oooo|oooo|oooo|oooo',
    },
  },
  {
    id: 'house-deep-shuffle',
    name: 'Deep Shuffle',
    genre: 'House',
    bpm: 122,
    swing: 0.58,
    notes: "Croches shufflées et open hat sur le « a » du temps : le balancement deep house, à garder sous 125 BPM.",
    tracks: {
      kick: 'X...|X...|X...|X...|X...|X...|X...|X...',
      clap: '....|X...|....|X...|....|X...|....|X...',
      chat: 'xoo.|xoo.|xoo.|xoo.|xoo.|xoo.|xoo.|xoo.',
      ohat: '...x|...x|...x|...x|...x|...x|...x|...x',
      rim:  '....|....|..o.|....|....|....|..o.|....',
    },
  },
  {
    id: 'house-jackin-bump',
    name: "Jackin' Bump",
    genre: 'House',
    bpm: 126,
    swing: 0.54,
    notes: "Le kick supplémentaire juste avant le temps 1 relance la boucle — c'est le « jack » de la house de Chicago.",
    tracks: {
      kick:    'X...|X...|X...|X..x|X...|X...|X...|X..x',
      clap:    '....|X...|....|X...|....|X...|....|X...',
      chat:    'x..o|x.oo|x..o|x.oo|x..o|x.oo|x..o|x.oo',
      ohat:    '..x.|....|..x.|....|..x.|....|..x.|....',
      cowbell: '....|....|....|....|..o.|....|..o.|....',
    },
  },
  {
    id: 'house-rolling-perc',
    name: 'Rolling Perc',
    genre: 'House',
    bpm: 125,
    swing: 0.5,
    notes: "Grille percussive qui tourne sur deux mesures : la conga répond au kick sans jamais tomber dessus.",
    tracks: {
      kick:  'X...|X...|X...|X...|X...|X...|X...|X...',
      clap:  '....|X...|....|X...|....|X...|....|X...',
      ohat:  '..x.|..x.|..x.|..x.|..x.|..x.|..x.|..x.',
      conga: '....|..o.|.x..|..o.|....|..o.|.x..|o.x.',
    },
  },

  // ------------------------------------------------------------ UK Garage
  {
    id: 'garage-speed-4x4',
    name: 'Speed Garage 4x4',
    genre: 'UK Garage',
    bpm: 134,
    swing: 0.6,
    notes: "Kick 4/4 mais hats shufflés : c'est le décalage entre les deux qui fait le speed garage, pas le kick.",
    tracks: {
      kick:  'X...|X...|X...|X...|X...|X...|X...|X...',
      snare: '....|X...|....|X...|....|X...|....|X...',
      chat:  'xoxo|xo.o|xoxo|xo.o|xoxo|xo.o|xoxo|xo.o',
      ohat:  '....|..x.|....|..x.|....|..x.|....|..x.',
      rim:   '..o.|....|..o.|....|..o.|....|..o.|..o.',
    },
  },
  {
    id: 'garage-skip',
    name: 'Garage Skip',
    genre: 'UK Garage',
    bpm: 133,
    swing: 0.62,
    notes: "Le kick sort de la grille 4/4 sur le troisième temps : la boucle « saute » et appelle la mesure suivante.",
    tracks: {
      kick:  'X...|....|X.x.|....|X...|....|X.x.|..x.',
      snare: '....|X...|....|X...|....|X...|....|X...',
      clap:  '....|X...|....|X...|....|X...|....|X..o',
      chat:  'x..o|x.oo|x..o|x.oo|x..o|x.oo|x..o|x.oo',
      ohat:  '..x.|....|..x.|....|..x.|....|..x.|....',
    },
  },
  {
    id: 'garage-organ-bump',
    name: 'Organ Bump',
    genre: 'UK Garage',
    bpm: 135,
    swing: 0.58,
    notes: "Rimshots sur le contretemps et kick syncopé : la grille type des tracks à nappe d'orgue.",
    tracks: {
      kick:  'X...|..x.|X...|....|X...|..x.|X...|.x..',
      snare: '....|X...|....|X...|....|X...|....|X...',
      chat:  'xoxo|xox.|xoxo|xox.|xoxo|xox.|xoxo|xox.',
      rim:   '....|..o.|....|..o.|....|..o.|....|..o.',
      ohat:  '....|...x|....|...x|....|...x|....|...x',
    },
  },

  // --------------------------------------------------------------- 2-Step
  {
    id: '2step-classic',
    name: 'Classic 2-Step',
    genre: '2-Step',
    bpm: 135,
    swing: 0.62,
    notes: "La définition du genre : aucun kick sur les temps 2 et 4, la caisse claire y répond seule. D'où le « deux pas ».",
    tracks: {
      kick:  'X...|....|..x.|....|X...|....|..x.|....',
      snare: '....|X...|....|X...|....|X...|....|X...',
      chat:  'xoxo|xo.o|xoxo|xo.o|xoxo|xo.o|xoxo|xo.o',
      ohat:  '....|..x.|....|..x.|....|..x.|....|..x.',
      rim:   '..o.|....|....|..o.|..o.|....|....|..o.',
    },
  },
  {
    id: '2step-sweet-skip',
    name: 'Sweet Skip',
    genre: '2-Step',
    bpm: 136,
    swing: 0.64,
    notes: "Swing poussé presque au triolet, ghost notes derrière la caisse claire : le côté chaloupé du 2-step chanté.",
    tracks: {
      kick:  'X...|...x|....|..x.|X...|...x|....|.x..',
      snare: '....|X...|....|X..o|....|X...|....|X..o',
      chat:  'x..o|x.o.|x..o|x.o.|x..o|x.o.|x..o|x.oo',
      ohat:  '..x.|....|..x.|....|..x.|....|..x.|....',
    },
  },
  {
    id: '2step-ghost-shuffle',
    name: 'Ghost Shuffle',
    genre: '2-Step',
    bpm: 134,
    swing: 0.66,
    notes: "Tout est dans les ghost notes : les enlever transforme le groove en boucle plate. À jouer avec le swing à fond.",
    tracks: {
      kick:   'X...|....|.x..|....|X...|..o.|.x..|....',
      snare:  '....|X.o.|....|X...|..o.|X.o.|....|X...',
      chat:   'o.xo|o.xo|o.xo|o.xo|o.xo|o.xo|o.xo|o.xo',
      shaker: 'oooo|oooo|oooo|oooo|oooo|oooo|oooo|oooo',
      rim:    '....|...o|....|...o|....|...o|....|...o',
    },
  },
  {
    id: '2step-broken-4x4',
    name: 'Broken 4x4',
    genre: '2-Step',
    bpm: 138,
    swing: 0.58,
    notes: "À mi-chemin du garage 4/4 et du 2-step : le kick tient le début de mesure puis se disloque.",
    tracks: {
      kick:  'X...|....|X.x.|....|X...|..x.|X...|....',
      snare: '....|X...|....|X...|....|X...|....|X...',
      clap:  '....|X...|....|X...|....|X...|....|X...',
      chat:  'xoo.|xoxo|xoo.|xoxo|xoo.|xoxo|xoo.|xoxo',
      ohat:  '...x|....|...x|....|...x|....|...x|....',
    },
  },

  // --------------------------------------------------------------- Jungle
  {
    id: 'jungle-amen-core',
    name: 'Amen Core',
    genre: 'Jungle',
    bpm: 174,
    swing: 0.5,
    notes: "Squelette du break le plus samplé de l'histoire : kick doublé sur le troisième temps, caisse claire fantôme derrière le quatrième.",
    tracks: {
      kick:  'X...|....|..xx|....|X...|....|..x.|....',
      snare: '....|X...|....|X.o.|....|X..o|....|X.o.',
      chat:  '..x.|..x.|..x.|..x.|..x.|..x.|..x.|..x.',
      ride:  'x...|x...|x...|x...|x...|x...|x...|x...',
    },
  },
  {
    id: 'jungle-think-break',
    name: 'Think Break',
    genre: 'Jungle',
    bpm: 172,
    swing: 0.52,
    notes: "Plus aéré que l'Amen, avec l'open hat en fin de mesure. Le break à sortir quand la track sature.",
    tracks: {
      kick:  'X...|....|X...|....|X...|..x.|X...|....',
      snare: '....|X..o|....|X...|....|X..o|..o.|X...',
      chat:  'x.oo|x.o.|x.oo|x.o.|x.oo|x.o.|x.oo|x.o.',
      ohat:  '....|....|....|..x.|....|....|....|..x.',
    },
  },
  {
    id: 'jungle-rolling',
    name: 'Rolling Jungle',
    genre: 'Jungle',
    bpm: 176,
    swing: 0.5,
    notes: "Hats sur les doubles en contretemps : c'est ce tapis continu qui donne l'impression que le break roule sans fin.",
    tracks: {
      kick:  'X...|....|..x.|..x.|X...|.x..|..x.|....',
      snare: '....|X...|....|X...|....|X...|....|X.oX',
      chat:  '.o.o|.o.o|.o.o|.o.o|.o.o|.o.o|.o.o|.o.o',
      ride:  'x..x|..x.|x..x|..x.|x..x|..x.|x..x|..x.',
    },
  },
  {
    id: 'jungle-half-time',
    name: 'Half-Time Roller',
    genre: 'Jungle',
    bpm: 174,
    swing: 0.5,
    notes: "Caisse claire sur le troisième temps seulement : même tempo, moitié moins de vitesse ressentie. Le fill de toms relance la boucle.",
    tracks: {
      kick:  'X...|....|....|....|X...|....|..x.|....',
      snare: '....|....|X...|....|....|....|X...|..o.',
      chat:  'x.o.|x.o.|x.o.|x.o.|x.o.|x.o.|x.o.|x.o.',
      ltom:  '....|....|....|....|....|....|....|o.o.',
    },
  },

  // ------------------------------------------------------------------ IDM
  {
    id: 'idm-braindance',
    name: 'Braindance',
    genre: 'IDM',
    bpm: 155,
    swing: 0.5,
    notes: "Le kick ne retombe jamais au même endroit d'une mesure à l'autre : la boucle avance sans jamais se refermer.",
    tracks: {
      kick:  'X...|..x.|....|X...|..x.|....|X.x.|....',
      snare: '....|X...|...o|....|X..o|....|....|X...',
      chat:  'x.oo|.ox.|oo.x|x.o.|.oxo|x..o|xo.x|.oxo',
      rim:   '...o|....|o...|...o|....|o...|...o|....',
    },
  },
  {
    id: 'idm-fractured-7',
    name: 'Fractured 7s',
    genre: 'IDM',
    bpm: 96,
    swing: 0.5,
    notes: "Polyrythmie : le kick tombe tous les 7 pas, le rimshot tous les 5, le hat tous les 3. Rien ne se réaligne avant la fin des deux mesures.",
    tracks: {
      kick:  'X...|...X|....|..X.|....|.X..|....|X...',
      snare: '....|....|X...|....|....|....|X...|....',
      rim:   'o...|.o..|..o.|...o|....|o...|.o..|..o.',
      chat:  'x..x|..x.|.x..|x..x|..x.|.x..|x..x|..x.',
    },
  },
  {
    id: 'idm-glitch-shuffle',
    name: 'Glitch Shuffle',
    genre: 'IDM',
    bpm: 140,
    swing: 0.56,
    notes: "Caisse claire déplacée d'une double sur le quatrième temps, hats hachés : la grille reste carrée mais le ressenti décroche.",
    tracks: {
      kick:   'X..o|....|x...|.o..|X...|..x.|....|x.o.',
      snare:  '....|X...|....|..X.|....|X...|.X..|....',
      chat:   'oxo.|x.oo|.xox|o.x.|oxo.|x.oo|.xox|oo.x',
      htom:   '....|....|...o|....|....|....|...o|.o..',
      shaker: 'o.oo|o.o.|.oo.|oo.o|o.oo|o.o.|.oo.|oo.o',
    },
  },
  {
    id: 'idm-slow-ticks',
    name: 'Slow Ticks',
    genre: 'IDM',
    bpm: 88,
    swing: 0.5,
    notes: "Tempo lent, grille clairsemée : chaque silence compte autant qu'une frappe. À doubler en 176 pour l'utiliser en jungle.",
    tracks: {
      kick: 'X...|....|....|..x.|X...|....|.x..|....',
      rim:  '..o.|o..o|..o.|....|..o.|o..o|....|o.o.',
      chat: '...o|..x.|o...|...x|...o|..x.|o...|...x',
      ltom: '....|....|.o..|....|....|....|..o.|....',
    },
  },
]
