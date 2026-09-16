import { VELOCITY, parseRow, serializeRow } from './pattern.js'

// Théorie d'accords : lecture d'un chiffrage (Am9, Fmaj7#11, D7sus4…) vers des
// hauteurs MIDI concrètes.
//
// Les progressions sont écrites en La mineur de référence ; la transposition
// est appliquée à la lecture, pas dans les données.

const ROOT_SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

// Intervalles en demi-tons depuis la fondamentale. Le vocabulaire couvre ce
// qu'on rencontre réellement en garage, house et 2-step : beaucoup de 9èmes et
// de 11èmes, peu de triades sèches.
const QUALITIES = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  maj7: [0, 4, 7, 11],
  maj9: [0, 4, 7, 11, 14],
  'maj7#11': [0, 4, 7, 11, 18],
  m7: [0, 3, 7, 10],
  m9: [0, 3, 7, 10, 14],
  m11: [0, 3, 7, 10, 14, 17],
  m6: [0, 3, 7, 9],
  7: [0, 4, 7, 10],
  9: [0, 4, 7, 10, 14],
  13: [0, 4, 7, 10, 14, 21],
  '7b9': [0, 4, 7, 10, 13],
  '7#9': [0, 4, 7, 10, 15],
  '7sus4': [0, 5, 7, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  6: [0, 4, 7, 9],
  '6/9': [0, 4, 7, 9, 14],
  add9: [0, 4, 7, 14],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  m7b5: [0, 3, 6, 10],
  aug: [0, 4, 8],
}

// La fondamentale est toujours ramenée dans l'octave C2–B2 (MIDI 48–59), donc
// les accords sonnent autour du do central. Sans ça une
// progression qui descend d'une quinte dérive vers le grave d'accord en
// accord ; là, le registre reste stable et les enchaînements restent proches.
const ANCHOR = 48

export function parseChord(symbol) {
  const match = /^([A-G])([#b]?)(.*)$/.exec(symbol)
  if (!match) throw new Error(`Chiffrage illisible : "${symbol}"`)

  const [, letter, accidental, quality] = match
  const intervals = QUALITIES[quality]
  if (!intervals) throw new Error(`Qualité d'accord inconnue : "${quality}" dans "${symbol}"`)

  let semitone = ROOT_SEMITONES[letter]
  if (accidental === '#') semitone += 1
  if (accidental === 'b') semitone -= 1

  return { symbol, letter, accidental, quality, semitone: (semitone + 12) % 12, intervals }
}

export function chordPitches(symbol, transpose = 0) {
  const { semitone, intervals } = parseChord(symbol)
  const root = ANCHOR + (((semitone + transpose) % 12) + 12) % 12
  return intervals.map((interval) => root + interval)
}

// Deux orthographes, chacune dans son contexte. Les tables General MIDI et les
// noms de pads s'écrivent avec des dièses ; un chiffrage d'accord s'écrit avec
// des bémols — personne n'écrit G#maj9 là où Abmaj9 se lit d'un coup d'œil.
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const CHORD_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

export function pitchName(note) {
  return `${SHARP_NAMES[note % 12]}${Math.floor(note / 12) - 2}`
}

export function chordPitchName(note) {
  return `${CHORD_NAMES[note % 12]}${Math.floor(note / 12) - 2}`
}

// Chiffrage transposé, pour l'affichage. On garde la qualité telle quelle et on
// ne renomme que la fondamentale.
export function transposeSymbol(symbol, transpose = 0) {
  const { semitone, quality } = parseChord(symbol)
  return CHORD_NAMES[(((semitone + transpose) % 12) + 12) % 12] + quality
}

// Le réglage déplace la fondamentale de référence (La) vers une autre note :
// c'est une transposition, pas une tonalité — une progression en La mineur
// amenée sur Do devient du Do mineur, pas du Do majeur.
export const TRANSPOSITIONS = CHORD_NAMES.map((name, index) => ({
  name,
  transpose: (index - 9 + 12) % 12,
}))

// Prépare une progression pour l'interface : rythme décodé, et pour chaque pas
// l'accord en vigueur.
export function hydrateProgression(progression) {
  const steps = progression.steps ?? 32
  const rhythm = parseRow(progression.rhythm, steps)

  const total = progression.chords.reduce((sum, [, span]) => sum + span, 0)
  if (total !== steps) {
    throw new Error(`Les accords couvrent ${total} pas au lieu de ${steps}`)
  }

  const chordAt = []
  progression.chords.forEach(([symbol, span], index) => {
    for (let i = 0; i < span; i += 1) chordAt.push(index)
    parseChord(symbol)
  })

  return { ...progression, steps, rhythm, chordAt, gate: progression.gate ?? 0.9 }
}

// Les frappes de la progression : pour chaque pas joué, les hauteurs et la
// durée. Une frappe tient jusqu'à la suivante, réduite par le `gate` — c'est
// lui qui sépare un stab sec d'un accord tenu.
export function progressionHits(progression, transpose = 0) {
  const struck = []
  progression.rhythm.forEach((velocity, step) => {
    if (velocity !== VELOCITY.OFF) struck.push(step)
  })

  return struck.map((step, index) => {
    const next = index + 1 < struck.length ? struck[index + 1] : struck[0] + progression.steps
    const span = next - step
    const [symbol] = progression.chords[progression.chordAt[step]]
    return {
      step,
      symbol,
      displaySymbol: transposeSymbol(symbol, transpose),
      pitches: chordPitches(symbol, transpose),
      velocity: progression.rhythm[step],
      lengthSteps: Math.max(0.25, span * progression.gate),
    }
  })
}

export function dehydrateProgression(progression) {
  return { ...progression, rhythm: serializeRow(progression.rhythm) }
}
