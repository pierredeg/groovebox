// Vérifie que chaque pattern est bien formé avant qu'il n'atterrisse dans
// l'appli : lignes de la bonne longueur, instruments connus, identifiants
// uniques, genres déclarés. `npm run validate`.
import { PATTERNS, GENRES } from '../src/data/patterns.js'
import { hydratePattern } from '../src/lib/pattern.js'

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

const steps = PATTERNS.reduce(
  (total, pattern) =>
    total +
    Object.values(pattern.tracks).reduce(
      (count, row) => count + [...row.replace(/\|/g, '')].filter((c) => c !== '.').length,
      0,
    ),
  0,
)
console.log(`${PATTERNS.length} patterns valides, ${steps} frappes au total.`)
