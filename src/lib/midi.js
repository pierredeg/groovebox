import { INSTRUMENT_BY_ID } from '../data/instruments.js'
import { MIDI_VELOCITY, VELOCITY, swingOffset } from './pattern.js'
import { progressionHits } from './chords.js'

// Écriture d'un Standard MIDI File (format 0) octet par octet — aucune
// dépendance nécessaire, le format tient en quelques dizaines de lignes.

const TICKS_PER_QUARTER = 480
const TICKS_PER_STEP = TICKS_PER_QUARTER / 4 // un pas = une double-croche
const DRUM_NOTE_LENGTH_TICKS = 60
const DRUM_CHANNEL = 9 // canal 10 en numérotation humaine
const CHORD_CHANNEL = 0

// Programmes General MIDI correspondant aux timbres de l'application, pour que
// le fichier sonne juste dans un lecteur GM. Un DAW les ignore sans dommage.
const GM_PROGRAMS = { organ: 16, rhodes: 4, pad: 89 }

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

// Transforme une liste de notes { tick, note, velocity, length } en événements
// MIDI absolus, indépendamment de ce qui les a produites.
function noteEvents(notes, channel) {
  const events = []
  for (const { tick, note, velocity, length } of notes) {
    events.push({ tick, order: 1, bytes: [0x90 | channel, note, velocity] })
    events.push({ tick: tick + Math.max(1, Math.round(length)), order: 0, bytes: [0x80 | channel, note, 0x40] })
  }
  // À tick égal, les note-off passent avant les note-on pour ne pas couper une
  // frappe qui vient d'être déclenchée sur la même note.
  events.sort((a, b) => a.tick - b.tick || a.order - b.order)
  return events
}

function buildMidi({ name, bpm, notes, channel, program }) {
  const microsecondsPerQuarter = Math.round(60000000 / bpm)

  const head = [
    0x00, 0xff, 0x51, 0x03,
    (microsecondsPerQuarter >> 16) & 0xff,
    (microsecondsPerQuarter >> 8) & 0xff,
    microsecondsPerQuarter & 0xff,
    0x00, 0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08, // 4/4
    0x00, ...writeText(0x03, name),
  ]
  if (program !== undefined) head.push(0x00, 0xc0 | channel, program)

  const body = []
  let previousTick = 0
  for (const event of noteEvents(notes, channel)) {
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

// Le swing est gravé dans les positions du fichier : le groove reste identique
// une fois le MIDI déposé dans le DAW.
function swungTick(step, swing) {
  return step * TICKS_PER_STEP + Math.round(swingOffset(step, swing) * TICKS_PER_STEP)
}

export function patternToMidi(pattern) {
  const notes = []
  for (const track of pattern.tracks) {
    const instrument = INSTRUMENT_BY_ID[track.instrument]
    if (!instrument) continue

    track.cells.forEach((velocity, step) => {
      if (velocity === VELOCITY.OFF) return
      notes.push({
        tick: swungTick(step, pattern.swing),
        note: instrument.note,
        velocity: MIDI_VELOCITY[velocity],
        length: DRUM_NOTE_LENGTH_TICKS,
      })
    })
  }

  return buildMidi({
    name: `${pattern.name} — ${pattern.genre}`,
    bpm: pattern.bpm,
    notes,
    channel: DRUM_CHANNEL,
  })
}

// Les accords partent sur un canal mélodique, avec la durée réelle de chaque
// frappe — c'est elle qui distingue un stab sec d'un accord tenu.
export function progressionToMidi(progression, transpose = 0) {
  const notes = []
  for (const hit of progressionHits(progression, transpose)) {
    for (const pitch of hit.pitches) {
      notes.push({
        tick: swungTick(hit.step, progression.swing),
        note: pitch,
        velocity: MIDI_VELOCITY[hit.velocity],
        length: hit.lengthSteps * TICKS_PER_STEP,
      })
    }
  }

  return buildMidi({
    name: `${progression.name} — ${progression.genre}`,
    bpm: progression.bpm,
    notes,
    channel: CHORD_CHANNEL,
    program: GM_PROGRAMS[progression.timbre],
  })
}

// Aiguille selon la nature de l'élément : une progression porte des accords.
export function toMidi(item, transpose = 0) {
  return item.chords ? progressionToMidi(item, transpose) : patternToMidi(item)
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

export function midiBlob(item, transpose = 0) {
  return new Blob([toMidi(item, transpose)], { type: 'audio/midi' })
}

export function midiDataUrl(item, transpose = 0) {
  const bytes = toMidi(item, transpose)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `data:audio/midi;base64,${btoa(binary)}`
}

export function downloadMidi(item, transpose = 0) {
  const url = URL.createObjectURL(midiBlob(item, transpose))
  const link = document.createElement('a')
  link.href = url
  link.download = midiFileName(item)
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Laisse au navigateur le temps de démarrer le téléchargement.
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

// Glisser-déposer vers le DAW : Chrome interprète `DownloadURL` et matérialise
// un vrai fichier sur le disque, que la timeline d'Ableton ou de Logic accepte.
export function setDragData(dataTransfer, item, transpose = 0) {
  const name = midiFileName(item)
  dataTransfer.effectAllowed = 'copy'
  dataTransfer.setData('DownloadURL', `audio/midi:${name}:${midiDataUrl(item, transpose)}`)
  dataTransfer.setData('text/plain', name)
}
