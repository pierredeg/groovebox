// Relit chaque fichier MIDI produit avec un décodeur écrit indépendamment de
// l'encodeur : si les deux sont d'accord sur le tempo, le nombre de notes, le
// canal et les vélocités, le fichier est lisible par un DAW. `npm run check:midi`.
import { PATTERNS } from '../src/data/patterns.js'
import { hydratePattern, MIDI_VELOCITY, VELOCITY } from '../src/lib/pattern.js'
import { patternToMidi, midiFileName } from '../src/lib/midi.js'

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
      const note = bytes[i++], velocity = bytes[i++]
      events.push({ tick, kind: kind === 0x90 ? 'on' : 'off', channel, note, velocity })
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
console.log(failures === 0 ? '\nTous les fichiers MIDI sont valides.' : `\n${failures} échec(s).`)
process.exit(failures === 0 ? 0 : 1)
