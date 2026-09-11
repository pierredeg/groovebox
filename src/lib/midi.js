import { INSTRUMENT_BY_ID } from '../data/instruments.js'
import { MIDI_VELOCITY, VELOCITY, swingOffset } from './pattern.js'

// Écriture d'un Standard MIDI File (format 0) octet par octet — aucune
// dépendance nécessaire, le format tient en quelques dizaines de lignes.

const TICKS_PER_QUARTER = 480
const TICKS_PER_STEP = TICKS_PER_QUARTER / 4 // un pas = une double-croche
const NOTE_LENGTH_TICKS = 60
const DRUM_CHANNEL = 9 // canal 10 en numérotation humaine

// Quantité variable (variable-length quantity), l'encodage des deltas MIDI.
function writeVarInt(value) {
  const bytes = [value & 0x7f]
  let rest = value >> 7
  while (rest > 0) {
    bytes.unshift((rest & 0x7f) | 0x80)
    rest >>= 7
  }
  return bytes
}

function writeText(type, text) {
  const bytes = Array.from(new TextEncoder().encode(text))
  return [0xff, type, ...writeVarInt(bytes.length), ...bytes]
}

function chunk(id, data) {
  const header = Array.from(new TextEncoder().encode(id))
  const length = data.length
  return [
    ...header,
    (length >> 24) & 0xff,
    (length >> 16) & 0xff,
    (length >> 8) & 0xff,
    length & 0xff,
    ...data,
  ]
}

// Construit la liste d'événements absolus (tick, octets) du pattern.
function patternEvents(pattern) {
  const events = []

  for (const track of pattern.tracks) {
    const instrument = INSTRUMENT_BY_ID[track.instrument]
    if (!instrument) continue

    track.cells.forEach((velocity, step) => {
      if (velocity === VELOCITY.OFF) return

      // Le swing est gravé dans les positions du fichier : le groove reste
      // identique une fois le MIDI déposé dans le DAW.
      const offset = Math.round(swingOffset(step, pattern.swing) * TICKS_PER_STEP)
      const onTick = step * TICKS_PER_STEP + offset

      events.push({ tick: onTick, order: 1, bytes: [0x90 | DRUM_CHANNEL, instrument.note, MIDI_VELOCITY[velocity]] })
      events.push({ tick: onTick + NOTE_LENGTH_TICKS, order: 0, bytes: [0x80 | DRUM_CHANNEL, instrument.note, 0x40] })
    })
  }

  // À tick égal, les note-off passent avant les note-on pour ne pas couper une
  // frappe qui vient d'être déclenchée sur la même note.
  events.sort((a, b) => a.tick - b.tick || a.order - b.order)
  return events
}

export function patternToMidi(pattern) {
  const microsecondsPerQuarter = Math.round(60000000 / pattern.bpm)

  const head = [
    0x00, 0xff, 0x51, 0x03,
    (microsecondsPerQuarter >> 16) & 0xff,
    (microsecondsPerQuarter >> 8) & 0xff,
    microsecondsPerQuarter & 0xff,
    0x00, 0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08, // 4/4
    0x00, ...writeText(0x03, `${pattern.name} — ${pattern.genre}`),
  ]

  const body = []
  let previousTick = 0
  for (const event of patternEvents(pattern)) {
    body.push(...writeVarInt(event.tick - previousTick), ...event.bytes)
    previousTick = event.tick
  }

  const track = chunk('MTrk', [...head, ...body, 0x00, 0xff, 0x2f, 0x00])
  const header = chunk('MThd', [
    0x00, 0x00, // format 0
    0x00, 0x01, // une piste
    (TICKS_PER_QUARTER >> 8) & 0xff,
    TICKS_PER_QUARTER & 0xff,
  ])

  return new Uint8Array([...header, ...track])
}

export function midiFileName(pattern) {
  const slug = `${pattern.genre} ${pattern.name}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  return `${slug}-${Math.round(pattern.bpm)}bpm.mid`
}

export function midiBlob(pattern) {
  return new Blob([patternToMidi(pattern)], { type: 'audio/midi' })
}

export function midiDataUrl(pattern) {
  const bytes = patternToMidi(pattern)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `data:audio/midi;base64,${btoa(binary)}`
}

export function downloadMidi(pattern) {
  const url = URL.createObjectURL(midiBlob(pattern))
  const link = document.createElement('a')
  link.href = url
  link.download = midiFileName(pattern)
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Laisse au navigateur le temps de démarrer le téléchargement.
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

// Glisser-déposer vers le DAW : Chrome interprète `DownloadURL` et matérialise
// un vrai fichier sur le disque, que la timeline d'Ableton ou de Logic accepte.
export function setDragData(dataTransfer, pattern) {
  const name = midiFileName(pattern)
  dataTransfer.effectAllowed = 'copy'
  dataTransfer.setData('DownloadURL', `audio/midi:${name}:${midiDataUrl(pattern)}`)
  dataTransfer.setData('text/plain', name)
}
