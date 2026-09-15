import { INSTRUMENT_BY_ID, INSTRUMENT_ORDER } from '../data/instruments.js'

// Les patterns sont écrits en notation texte, un caractère par pas :
//   X = accent, x = coup normal, o = ghost note, . = silence
//
// Ça garde le fichier de données lisible et éditable à la main : ajouter un
// groove, c'est ajouter un objet, pas écrire du code.
export const VELOCITY = {
  OFF: 0,
  GHOST: 1,
  NORMAL: 2,
  ACCENT: 3,
}

// Niveaux successifs quand on clique sur une case.
export const VELOCITY_CYCLE = [VELOCITY.OFF, VELOCITY.NORMAL, VELOCITY.ACCENT, VELOCITY.GHOST]

// Vélocités MIDI correspondantes.
export const MIDI_VELOCITY = {
  [VELOCITY.GHOST]: 38,
  [VELOCITY.NORMAL]: 96,
  [VELOCITY.ACCENT]: 120,
}

// Gains utilisés par le moteur audio.
export const AUDIO_GAIN = {
  [VELOCITY.GHOST]: 0.28,
  [VELOCITY.NORMAL]: 0.72,
  [VELOCITY.ACCENT]: 1,
}

const CHAR_TO_VELOCITY = {
  X: VELOCITY.ACCENT,
  x: VELOCITY.NORMAL,
  o: VELOCITY.GHOST,
  '.': VELOCITY.OFF,
  '-': VELOCITY.OFF,
  ' ': VELOCITY.OFF,
}

const VELOCITY_TO_CHAR = {
  [VELOCITY.ACCENT]: 'X',
  [VELOCITY.NORMAL]: 'x',
  [VELOCITY.GHOST]: 'o',
  [VELOCITY.OFF]: '.',
}

export function parseRow(row, steps) {
  const cleaned = row.replace(/\|/g, '')
  if (cleaned.length !== steps) {
    throw new Error(`Ligne de ${cleaned.length} pas au lieu de ${steps} : "${row}"`)
  }
  return Array.from(cleaned, (char) => {
    const velocity = CHAR_TO_VELOCITY[char]
    if (velocity === undefined) {
      throw new Error(`Caractère inconnu "${char}" dans "${row}"`)
    }
    return velocity
  })
}

export function serializeRow(cells) {
  return cells.map((velocity) => VELOCITY_TO_CHAR[velocity] ?? '.').join('')
}

// Transforme un pattern de la notation texte vers le modèle manipulé par l'UI.
export function hydratePattern(pattern) {
  const steps = pattern.steps ?? 32
  const trackIds = Object.keys(pattern.tracks)

  for (const id of trackIds) {
    if (!INSTRUMENT_BY_ID[id]) {
      throw new Error(`Instrument inconnu "${id}" dans le pattern "${pattern.id}"`)
    }
  }

  const tracks = trackIds
    .sort((a, b) => INSTRUMENT_ORDER.indexOf(a) - INSTRUMENT_ORDER.indexOf(b))
    .map((id) => ({ instrument: id, cells: parseRow(pattern.tracks[id], steps) }))

  return { ...pattern, steps, tracks }
}

export function dehydratePattern(pattern) {
  return {
    ...pattern,
    tracks: Object.fromEntries(
      pattern.tracks.map((track) => [track.instrument, serializeRow(track.cells)]),
    ),
  }
}

export function emptyRow(steps) {
  return new Array(steps).fill(VELOCITY.OFF)
}

export function nextVelocity(current) {
  const index = VELOCITY_CYCLE.indexOf(current)
  return VELOCITY_CYCLE[(index + 1) % VELOCITY_CYCLE.length]
}

// Décalage de swing, exprimé en fraction de pas, appliqué aux pas impairs.
// 0.5 = binaire strict, 0.66 = triolet.
export function swingOffset(stepIndex, swing) {
  return stepIndex % 2 === 1 ? 2 * swing - 1 : 0
}

export function isEmpty(pattern) {
  return pattern.tracks.every((track) => track.cells.every((cell) => cell === VELOCITY.OFF))
}

// La MPC affiche les positions au format mesure.temps.tick, avec 960 ticks par
// temps — soit 240 ticks par double-croche, c'est-à-dire exactement un pas de
// cette grille. Le premier pas est donc 001.01.000, le deuxième 001.01.240.
export const MPC_TICKS_PER_BEAT = 960

const STEPS_PER_BEAT = 4
const BEATS_PER_BAR = 4

export function mpcPosition(step) {
  const bar = Math.floor(step / (STEPS_PER_BEAT * BEATS_PER_BAR)) + 1
  const beat = Math.floor((step % (STEPS_PER_BEAT * BEATS_PER_BAR)) / STEPS_PER_BEAT) + 1
  const tick = (step % STEPS_PER_BEAT) * (MPC_TICKS_PER_BEAT / STEPS_PER_BEAT)
  return `${String(bar).padStart(3, '0')}.${String(beat).padStart(2, '0')}.${String(tick).padStart(3, '0')}`
}

// Mesure et temps seuls, pour la règle où la place manque.
export function mpcBarBeat(step) {
  return mpcPosition(step).slice(0, 6)
}
