// Vérifie que chaque pattern est bien formé avant qu'il n'atterrisse dans
// l'appli : lignes de la bonne longueur, instruments connus, identifiants
// uniques, genres déclarés. `npm run validate`.
import { PATTERNS, GENRES } from '../src/data/patterns.js'
import { PROGRESSIONS } from '../src/data/progressions.js'
import { hydratePattern, VELOCITY } from '../src/lib/pattern.js'
import { hydrateProgression, progressionHits } from '../src/lib/chords.js'

const problems = []
const seen = new Set()

for (const pattern of PATTERNS) {
  const where = pattern.id ?? pattern.name ?? '(sans identifiant)'

  if (!pattern.id) problems.push(`${where} : identifiant manquant`)
  if (seen.has(pattern.id)) problems.push(`${where} : identifiant en double`)
  seen.add(pattern.id)

  if (!GENRES.includes(pattern.genre)) {
    problems.push(`${where} : genre "${pattern.genre}" absent de GENRES`)
  }
  if (!(pattern.bpm > 0)) problems.push(`${where} : BPM invalide`)
  if (!(pattern.swing >= 0.5 && pattern.swing <= 0.75)) {
    problems.push(`${where} : swing hors de [0.5, 0.75]`)
  }

  try {
    const hydrated = hydratePattern(pattern)
    if (hydrated.tracks.length === 0) problems.push(`${where} : aucune piste`)

    // Le swing ne déplace que les doubles impaires. Un pattern qui annonce un
    // shuffle mais ne frappe que sur les doubles paires sonne binaire : le
    // réglage est décoratif, et c'est presque toujours une ligne de hats
    // écrite en croches au lieu de doubles.
    const hitsOffGrid = hydrated.tracks.some((track) =>
      track.cells.some((cell, step) => cell !== 0 && step % 2 === 1),
    )
    if (pattern.swing > 0.505 && !hitsOffGrid) {
      problems.push(`${where} : swing ${pattern.swing} sans aucune frappe sur une double impaire`)
    }
  } catch (error) {
    problems.push(`${where} : ${error.message}`)
  }
}

if (problems.length > 0) {
  console.error(`${problems.length} problème(s) :`)
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

// --- progressions d'accords ---------------------------------------------

const TIMBRES = ['organ', 'rhodes', 'pad']
const seenProgressions = new Set()

for (const progression of PROGRESSIONS) {
  const where = progression.id ?? progression.name ?? '(sans identifiant)'

  if (!progression.id) problems.push(`${where} : identifiant manquant`)
  if (seenProgressions.has(progression.id)) problems.push(`${where} : identifiant en double`)
  seenProgressions.add(progression.id)

  if (!GENRES.includes(progression.genre)) {
    problems.push(`${where} : genre "${progression.genre}" absent de GENRES`)
  }
  if (!(progression.bpm > 0)) problems.push(`${where} : BPM invalide`)
  if (!TIMBRES.includes(progression.timbre)) {
    problems.push(`${where} : timbre "${progression.timbre}" inconnu`)
  }
  if (!(progression.gate > 0 && progression.gate <= 1)) {
    problems.push(`${where} : gate hors de ]0, 1]`)
  }

  try {
    const hydrated = hydrateProgression(progression)
    const hits = progressionHits(hydrated)

    if (hits.length === 0) problems.push(`${where} : aucune frappe`)

    // Un accord qu'aucune frappe ne déclenche ne sera jamais entendu : il
    // figure dans les données mais pas dans le son. C'est presque toujours
    // un rythme trop clairsemé pour le nombre d'accords.
    const struckChords = new Set(hits.map((hit) => hydrated.chordAt[hit.step]))
    hydrated.chords.forEach(([symbol], index) => {
      if (!struckChords.has(index)) {
        problems.push(`${where} : l'accord ${symbol} (position ${index + 1}) n'est jamais frappé`)
      }
    })

    const offGrid = hydrated.rhythm.some((cell, step) => cell !== VELOCITY.OFF && step % 2 === 1)
    if (progression.swing > 0.505 && !offGrid) {
      problems.push(`${where} : swing ${progression.swing} sans aucune frappe sur une double impaire`)
    }
  } catch (error) {
    problems.push(`${where} : ${error.message}`)
  }
}

const steps = PATTERNS.reduce(
  (total, pattern) =>
    total +
    Object.values(pattern.tracks).reduce(
      (count, row) => count + [...row.replace(/\|/g, '')].filter((c) => c !== '.').length,
      0,
    ),
  0,
)
const chords = PROGRESSIONS.reduce((total, p) => total + p.chords.length, 0)
console.log(`${PATTERNS.length} patterns valides, ${steps} frappes au total.`)
console.log(`${PROGRESSIONS.length} progressions valides, ${chords} accords au total.`)
