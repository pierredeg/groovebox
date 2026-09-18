# Groovebox

Une bibliothèque personnelle de rythmiques **et de progressions d'accords** —
garage, jungle, 2-step, drum & bass, IDM, house — posées sur une grille de
séquenceur. On les écoute d'un clic, on les retouche case par case, et on les
glisse directement dans le DAW en MIDI.

![Aperçu](docs/preview.png)

## Ce que ça fait

- **36 grooves de référence** répartis en 6 genres — house, UK garage, 2-step,
  jungle, drum & bass, IDM — chacun sur 2 mesures en doubles-croches (32 pas).
- **Lecture instantanée** : synthèse Web Audio façon boîte à rythmes, aucun
  sample à charger.
- **Trois niveaux de frappe** : ghost note, coup normal, accent. C'est ce qui
  sépare un groove qui respire d'une boucle de métronome.
- **Un filtre « Ghostés »** et un badge par carte, qui comptent les ghost notes
  sur les fûts — voir plus bas pourquoi celles des hats ne comptent pas.
- **Swing réglable** par pattern, du binaire strict au triolet.
- **Export MIDI** en glisser-déposer vers la timeline du DAW, ou en
  téléchargement. Tempo et swing sont écrits dans le fichier.
- **18 progressions d'accords** dans les mêmes genres, avec le rythme des
  stabs — en garage et en house, c'est lui qui fait la moitié de l'identité.
- **Une rythmique et une progression jouent ensemble**, calées sur la même
  horloge : de quoi entendre un début de morceau sans passer par le DAW.
- **Une section Clavier** qui schématise chaque accord sur 37 touches, pour
  pouvoir les jouer sans savoir lire une partition.
- **Édition en place** : les retouches sont conservées d'une session à l'autre,
  avec un bouton pour rétablir l'original.

## Démarrer

```bash
npm install
npm run dev
```

| Commande | Effet |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run build` | build de production dans `dist/` |
| `npm test` | valide les patterns, relit les fichiers MIDI produits, lint |
| `npm run validate` | vérifie la syntaxe des patterns |
| `npm run check:midi` | décode chaque export MIDI pour vérifier qu'il est lisible |

## Mapping MIDI

L'export suit la convention **General MIDI Percussion**, sur le **canal 10** :
les notes tombent donc en face des bons pads dans un Drum Rack Ableton,
Battery, ou Logic Drummer, sans remapper quoi que ce soit.

| Instrument | Note | | Instrument | Note |
| --- | --- | --- | --- | --- |
| Kick | C1 (36) | | Ride | D#2 (51) |
| Rimshot | C#1 (37) | | Crash | C#2 (49) |
| Snare | D1 (38) | | Low tom | A1 (45) |
| Clap | D#1 (39) | | Mid tom | B1 (47) |
| Closed hat | F#1 (42) | | High tom | D2 (50) |
| Pedal hat | G#1 (44) | | Shaker | A#3 (70) |
| Open hat | A#1 (46) | | Cowbell | G#2 (56) |

Les noms de notes ci-dessus suivent la convention où le do central (60)
s'appelle C3 — celle d'Ableton, Logic et Cubase. Sous FL Studio, les mêmes
notes s'affichent deux octaves plus haut (le kick y est en C3). Le bouton
**Mapping MIDI** de l'application affiche la table complète, et chaque ligne de
la grille porte son nom de note.

Le fichier est un Standard MIDI File de format 0, résolution 480 ticks à la
noire. Le swing n'est pas un réglage à part : il est **gravé dans les positions
des notes**, donc le groove reste identique une fois le fichier déposé dans le
DAW.

## L'indicateur « ghosts »

Le badge d'une carte compte les ghost notes **sur les fûts** — kick, caisse,
clap, rimshot, toms, percussions — et ignore celles des hats, cymbales et
shakers. La distinction n'est pas cosmétique : une ligne de hats entièrement
ghostée fait exploser n'importe quelle statistique de densité sans rien changer
au ressenti, alors que trois ghosts de caisse entre deux temps forts
transforment le groove.

Le badge n'apparaît que si le pattern porte au moins six ghosts de fûts **et**
que sa deuxième mesure diffère de la première. Deux mesures identiques, c'est
une boucle d'une mesure jouée deux fois.

L'indicateur est recalculé à partir des données, pas écrit à la main : il reste
juste quand tu modifies un groove dans l'interface.

## Les accords

Les progressions vivent dans
[`src/data/progressions.js`](src/data/progressions.js) :

```js
{
  id: 'garage-organ-9ths',
  name: 'Organ 9ths',
  genre: 'UK Garage',
  bpm: 133,
  swing: 0.6,
  gate: 0.25,          // longueur d'une frappe : 0.15 = stab sec, 1 = tenu
  timbre: 'organ',     // organ | rhodes | pad
  notes: "...",
  chords: [['Am9', 8], ['Dm9', 8], ['Em9', 8], ['Am9', 8]],  // [chiffrage, pas]
  rhythm: '..x.|x.x.|..x.|x.x.|..x.|x.x.|..x.|x.x.',
}
```

`chords` découpe les 32 pas entre les accords ; `rhythm` dit où ils sont
frappés, dans la même notation que la batterie. Une frappe tient jusqu'à la
suivante, raccourcie par `gate`.

Tout est écrit avec **La pour fondamentale de référence**. Le sélecteur
`La →` transpose l'affichage et l'export — c'est une transposition, pas un
choix de tonalité : une progression en La mineur amenée sur Do devient du Do
mineur.

Vocabulaire d'accords reconnu : `m`, `m6`, `m7`, `m9`, `m11`, `m7b5`, `maj7`,
`maj9`, `maj7#11`, `7`, `9`, `13`, `7b9`, `7#9`, `7sus4`, `sus2`, `sus4`, `6`,
`6/9`, `add9`, `dim`, `dim7`, `aug`, et la triade majeure sans suffixe.

À l'export, les accords partent sur le **canal 1** avec leur durée réelle et un
changement de programme General MIDI correspondant au timbre — pas sur le canal
10 des percussions.

`npm run validate` refuse notamment **un accord qu'aucune frappe ne
déclenche** : il figurerait dans les données sans jamais s'entendre.

## La section Clavier

Chaque accord est dessiné sur un clavier de **37 touches, trois octaves de Do à
Do** — la disposition d'un Arturia KeyStep 37. Les touches à enfoncer sont
colorées et numérotées de la plus grave à la plus aiguë ; la **1** est toujours
la fondamentale. Les Do sont repérés sous le clavier pour se situer.

Un clic sur un schéma joue l'accord ; le bouton ▶ de la carte fait défiler la
progression au ralenti, en laissant le temps de poser les doigts.

Les voicings tiennent dans ces 37 touches par construction : les fondamentales
sont ramenées dans l'octave MIDI 48–59, et l'accord le plus large de la
bibliothèque (une 13ème) culmine à 80 — sous le plafond de 84.

L'octave absolue dépend du réglage de ton clavier ; ce sont les **positions
relatives** qui comptent, et elles ne bougent pas quand on décale l'octave.

## Ajouter un groove

Tout est dans [`src/data/patterns.js`](src/data/patterns.js). Un pattern est un
objet, pas du code :

```js
{
  id: 'garage-mon-groove',
  name: 'Mon Groove',
  genre: 'UK Garage',
  bpm: 134,
  swing: 0.6,
  notes: "Ce qui fait marcher ce groove, en une phrase.",
  tracks: {
    kick:  'X...|X...|X...|X...|X...|X...|X...|X...',
    snare: '....|X...|....|X...|....|X...|....|X...',
    chat:  'xoxo|xo.o|xoxo|xo.o|xoxo|xo.o|xoxo|xo.o',
  },
}
```

### La notation

Un caractère par pas, 32 pas pour deux mesures :

| | |
| --- | --- |
| `X` | accent (vélocité 120) |
| `x` | coup normal (vélocité 96) |
| `o` | ghost note (vélocité 38) |
| `.` | silence |
| `\|` | séparateur de temps, purement visuel — ignoré à la lecture |

Les identifiants de piste disponibles sont ceux de
[`src/data/instruments.js`](src/data/instruments.js) : `kick`, `snare`, `clap`,
`rim`, `chat`, `phat`, `ohat`, `ride`, `crash`, `ltom`, `mtom`, `htom`,
`shaker`, `cowbell`, `conga`.

Le plus simple pour créer un pattern : partir d'un groove existant dans
l'interface, le modifier à la souris, puis cliquer sur **Copier la notation** —
les lignes obtenues se collent telles quelles dans `patterns.js`.

### Vérifier

```bash
npm run validate
```

Le script refuse les lignes qui ne font pas 32 pas, les instruments inconnus,
les identifiants en double — et signale les patterns dont **le swing ne sert à
rien** : si toutes les frappes tombent sur des doubles paires, le réglage de
shuffle est décoratif et le groove sonnera binaire. C'est presque toujours une
ligne de hats écrite en croches au lieu de doubles.

## Raccourcis

| | |
| --- | --- |
| Clic sur une case | silence → normal → accent → ghost → silence |
| Alt-clic / clic droit | efface la case |
| Clic sur le nom d'un instrument | écoute l'instrument seul |
| `Échap` | arrête la lecture |

## Déploiement

Un push sur `main` publie le site sur GitHub Pages via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). Il faut activer
Pages une fois dans **Settings → Pages → Source : GitHub Actions**.

## Notes techniques

- **Ordonnancement audio** : un timer JavaScript ne suffit pas à tenir un tempo.
  Le séquenceur suit le principe de *A Tale of Two Clocks* — un intervalle
  imprécis réveille le code toutes les 25 ms, qui programme les frappes à
  l'avance sur l'horloge précise du contexte audio.
- **Aucune dépendance audio ni MIDI.** Les percussions sont synthétisées
  (oscillateurs, bruit filtré, six carrés inharmoniques pour les cymbales) et
  l'écriture du fichier MIDI tient dans
  [`src/lib/midi.js`](src/lib/midi.js).
- **Le glisser-déposer vers le DAW** repose sur `DownloadURL`, que Chrome
  transforme en vrai fichier sur le disque. Sur les navigateurs qui ne le
  gèrent pas, le clic sur le même bouton télécharge le `.mid`.
