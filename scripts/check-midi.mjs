// Relit chaque fichier MIDI produit avec un décodeur écrit indépendamment de
// l'encodeur : si les deux sont d'accord sur le tempo, le nombre de notes, le
// canal et les vélocités, le fichier est lisible par un DAW. `npm run check:midi`.
import { PATTERNS } from '../src/data/patterns.js'
import { hydratePattern, MIDI_VELOCITY, VELOCITY } from '../src/lib/pattern.js'
import { patternToMidi, progressionToMidi, midiFileName } from '../src/lib/midi.js'
import { PROGRESSIONS } from '../src/data/progressions.js'
import { hydrateProgression, progressionHits } from '../src/lib/chords.js'

function decode(bytes) {
  let i = 0
  const str = (n) => { const s = Buffer.from(bytes.slice(i, i + n)).toString('latin1'); i += n; return s }
  const u32 = () => { const v = (bytes[i] << 24) | (bytes[i+1] << 16) | (bytes[i+2] << 8) | bytes[i+3]; i += 4; return v >>> 0 }
  const u16 = () => { const v = (bytes[i] << 8) | bytes[i+1]; i += 2; return v }
  const varInt = () => { let v = 0; for (;;) { const b = bytes[i++]; v = (v << 7) | (b & 0x7f); if (!(b & 0x80)) return v } }

  if (str(4) !== 'MThd') throw new Error('MThd manquant')
  const headerLen = u32()
  if (headerLen !== 6) throw new Error('en-tête de longueur ' + headerLen)
  const format = u16(), ntrks = u16(), division = u16()

  if (str(4) !== 'MTrk') throw new Error('MTrk manquant')
  const trackLen = u32()
  const trackStart = i
  const events = []
  let tick = 0, tempo = null, running = null

  while (i < trackStart + trackLen) {
    tick += varInt()
    let status = bytes[i]
    if (status < 0x80) { status = running } else { i += 1; running = status }

    if (status === 0xff) {
      const type = bytes[i++]
      const len = varInt()
      const data = bytes.slice(i, i + len); i += len
      if (type === 0x51) tempo = (data[0] << 16) | (data[1] << 8) | data[2]
      if (type === 0x2f) { events.push({ tick, kind: 'end' }); break }
      events.push({ tick, kind: 'meta', type })
    } else {
      const kind = status & 0xf0
      const channel = status & 0x0f
      // Program change (0xC0) et aftertouch de canal (0xD0) ne portent qu'un
      // seul octet de donnée, contrairement à tous les autres.
      if (kind === 0xc0 || kind === 0xd0) {
        const value = bytes[i++]
        events.push({ tick, kind: kind === 0xc0 ? 'program' : 'aftertouch', channel, value })
      } else {
        const note = bytes[i++], velocity = bytes[i++]
        events.push({ tick, kind: kind === 0x90 ? 'on' : 'off', channel, note, velocity })
      }
    }
  }

  if (i !== trackStart + trackLen) throw new Error(`longueur de piste incohérente (${i - trackStart} lu / ${trackLen} annoncé)`)
  if (i !== bytes.length) throw new Error('octets en trop après la piste')
  return { format, ntrks, division, tempo, events }
}

let failures = 0
for (const raw of PATTERNS) {
  const pattern = hydratePattern(raw)
  try {
    const decoded = decode(patternToMidi(pattern))

    const expectedHits = pattern.tracks.reduce(
      (n, t) => n + t.cells.filter((c) => c !== VELOCITY.OFF).length, 0)
    const ons = decoded.events.filter((e) => e.kind === 'on')
    const offs = decoded.events.filter((e) => e.kind === 'off')

    const bpm = 60000000 / decoded.tempo
    const problems = []
    if (decoded.format !== 0) problems.push('format ≠ 0')
    if (decoded.division !== 480) problems.push('division ≠ 480')
    if (Math.abs(bpm - pattern.bpm) > 0.5) problems.push(`tempo décodé ${bpm.toFixed(1)} ≠ ${pattern.bpm}`)
    if (ons.length !== expectedHits) problems.push(`${ons.length} note-on pour ${expectedHits} frappes`)
    if (offs.length !== expectedHits) problems.push(`${offs.length} note-off pour ${expectedHits} frappes`)
    if (ons.some((e) => e.channel !== 9)) problems.push('note hors du canal 10')
    if (ons.some((e) => !Object.values(MIDI_VELOCITY).includes(e.velocity))) problems.push('vélocité inattendue')
    if (decoded.events.at(-1).kind !== 'end') problems.push('pas de End of Track')

    // Le swing doit décaler les pas impairs d'un nombre entier de ticks.
    const swung = ons.some((e) => e.tick % 120 !== 0)
    if (pattern.swing > 0.505 && !swung) problems.push('swing non appliqué')
    if (pattern.swing <= 0.505 && swung) problems.push('swing appliqué à tort')

    if (problems.length) { failures += 1; console.log(`✗ ${pattern.id} : ${problems.join(', ')}`) }
    else console.log(`✓ ${midiFileName(pattern).padEnd(40)} ${ons.length} notes, ${bpm.toFixed(0)} BPM, swing ${pattern.swing}`)
  } catch (error) {
    failures += 1
    console.log(`✗ ${pattern.id} : ${error.message}`)
  }
}

// --- progressions d'accords ---------------------------------------------

const GM_PROGRAMS = { organ: 16, rhodes: 4, pad: 89 }

for (const raw of PROGRESSIONS) {
  const progression = hydrateProgression(raw)
  try {
    const decoded = decode(progressionToMidi(progression))
    const hits = progressionHits(progression)
    const expectedNotes = hits.reduce((n, hit) => n + hit.pitches.length, 0)

    const ons = decoded.events.filter((e) => e.kind === 'on')
    const offs = decoded.events.filter((e) => e.kind === 'off')
    const programs = decoded.events.filter((e) => e.kind === 'program')
    const bpm = 60000000 / decoded.tempo

    const problems = []
    if (Math.abs(bpm - progression.bpm) > 0.5) problems.push(`tempo ${bpm.toFixed(1)} ≠ ${progression.bpm}`)
    if (ons.length !== expectedNotes) problems.push(`${ons.length} note-on pour ${expectedNotes} attendues`)
    if (offs.length !== expectedNotes) problems.push(`${offs.length} note-off pour ${expectedNotes}`)
    // Les accords doivent sortir sur un canal mélodique, pas sur le canal 10.
    if (ons.some((e) => e.channel !== 0)) problems.push('accord hors du canal 1')
    if (programs.length !== 1 || programs[0].value !== GM_PROGRAMS[progression.timbre]) {
      problems.push(`programme GM absent ou incorrect pour "${progression.timbre}"`)
    }

    // Chaque note doit durer quelque chose, et le gate doit se voir : un stab
    // sec produit des notes nettement plus courtes qu'un accord tenu.
    const durations = ons.map((on) => {
      const off = offs.find((o) => o.note === on.note && o.tick > on.tick)
      return off ? off.tick - on.tick : 0
    })
    if (durations.some((d) => d <= 0)) problems.push('note de durée nulle')

    const longest = Math.max(...durations)
    if (progression.gate <= 0.3 && longest > 240) problems.push(`stab trop long (${longest} ticks)`)
    if (progression.gate >= 0.95 && longest < 240) problems.push(`accord tenu trop court (${longest} ticks)`)

    if (problems.length) { failures += 1; console.log(`✗ ${progression.id} : ${problems.join(', ')}`) }
    else console.log(`✓ ${midiFileName(progression).padEnd(40)} ${ons.length} notes, ${progression.chords.length} accords, gate ${progression.gate}, ${progression.timbre}`)
  } catch (error) {
    failures += 1
    console.log(`✗ ${progression.id} : ${error.message}`)
  }
}

console.log(failures === 0 ? '\nTous les fichiers MIDI sont valides.' : `\n${failures} échec(s).`)
process.exit(failures === 0 ? 0 : 1)
