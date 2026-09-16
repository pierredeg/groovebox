import { AUDIO_GAIN, VELOCITY, swingOffset } from './pattern.js'
import { progressionHits } from './chords.js'

// Moteur audio : synthèse façon boîte à rythmes (pas de samples, donc pas de
// fichiers à charger) + ordonnanceur à anticipation. Le principe de
// l'ordonnanceur est celui décrit par Chris Wilson dans « A Tale of Two
// Clocks » : un timer imprécis réveille régulièrement le code, qui programme
// les événements à l'avance sur l'horloge (précise) du contexte audio.

const LOOKAHEAD_MS = 25
const SCHEDULE_AHEAD_S = 0.12

let context = null
let master = null

export function getContext() {
  if (!context) {
    context = new (window.AudioContext || window.webkitAudioContext)()
    master = context.createGain()
    master.gain.value = 0.8

    // Un soupçon de compression pour que les accents ne saturent pas quand
    // plusieurs percussions tombent sur le même pas.
    const limiter = context.createDynamicsCompressor()
    limiter.threshold.value = -6
    limiter.knee.value = 6
    limiter.ratio.value = 8
    limiter.attack.value = 0.002
    limiter.release.value = 0.12

    master.connect(limiter)
    limiter.connect(context.destination)
  }
  return context
}

export function setMasterVolume(value) {
  getContext()
  master.gain.setTargetAtTime(value, context.currentTime, 0.02)
}

function noiseBuffer(ctx, seconds = 1) {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i += 1) {
    data[i] = Math.random() * 2 - 1
  }
  return buffer
}

let sharedNoise = null
function getNoise(ctx) {
  if (!sharedNoise) sharedNoise = noiseBuffer(ctx, 2)
  return sharedNoise
}

function envGain(ctx, time, peak, decay, hold = 0) {
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, time)
  gain.gain.linearRampToValueAtTime(peak, time + 0.002)
  if (hold > 0) gain.gain.setValueAtTime(peak, time + hold)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + hold + decay)
  return gain
}

function noiseVoice(ctx, time, { decay, filter, type = 'highpass', q = 1, peak, hold = 0 }) {
  const source = ctx.createBufferSource()
  source.buffer = getNoise(ctx)
  source.playbackRate.value = 1

  const biquad = ctx.createBiquadFilter()
  biquad.type = type
  biquad.frequency.value = filter
  biquad.Q.value = q

  const gain = envGain(ctx, time, peak, decay, hold)
  source.connect(biquad)
  biquad.connect(gain)
  gain.connect(master)
  source.start(time)
  source.stop(time + hold + decay + 0.05)
}

// Cymbale « métallique » à la 808 : six carrés inharmoniques passés dans un
// passe-haut.
function metallicVoice(ctx, time, { base, decay, peak, filter = 8000 }) {
  const ratios = [2, 3, 4.16, 5.43, 6.79, 8.21]
  const highpass = ctx.createBiquadFilter()
  highpass.type = 'highpass'
  highpass.frequency.value = filter

  const bandpass = ctx.createBiquadFilter()
  bandpass.type = 'bandpass'
  bandpass.frequency.value = filter * 1.2
  bandpass.Q.value = 0.6

  const gain = envGain(ctx, time, peak * 0.5, decay)
  highpass.connect(bandpass)
  bandpass.connect(gain)
  gain.connect(master)

  for (const ratio of ratios) {
    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.value = base * ratio
    osc.connect(highpass)
    osc.start(time)
    osc.stop(time + decay + 0.05)
  }
}

function drumVoice(ctx, time, { from, to, decay, peak, type = 'sine', pitchDecay = 0.05 }) {
  const osc = ctx.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(from, time)
  osc.frequency.exponentialRampToValueAtTime(to, time + pitchDecay)

  const gain = envGain(ctx, time, peak, decay)
  osc.connect(gain)
  gain.connect(master)
  osc.start(time)
  osc.stop(time + decay + 0.05)
}

// Une voix par instrument. `level` vaut entre 0 et 1 selon la vélocité.
const VOICES = {
  kick(ctx, time, level) {
    drumVoice(ctx, time, { from: 150, to: 48, decay: 0.42, peak: level, pitchDecay: 0.06 })
    noiseVoice(ctx, time, { decay: 0.02, filter: 2200, peak: level * 0.25 })
  },
  snare(ctx, time, level) {
    drumVoice(ctx, time, { from: 240, to: 170, decay: 0.12, peak: level * 0.5, type: 'triangle' })
    drumVoice(ctx, time, { from: 340, to: 250, decay: 0.09, peak: level * 0.3, type: 'triangle' })
    noiseVoice(ctx, time, { decay: 0.18, filter: 1600, type: 'bandpass', q: 0.7, peak: level * 0.8 })
  },
  clap(ctx, time, level) {
    // Trois micro-rafales serrées puis une queue plus longue : c'est ce
    // décalage qui donne le « flam » caractéristique du clap.
    for (const offset of [0, 0.011, 0.022]) {
      noiseVoice(ctx, time + offset, {
        decay: 0.02,
        filter: 1100,
        type: 'bandpass',
        q: 0.8,
        peak: level * 0.7,
      })
    }
    noiseVoice(ctx, time + 0.03, {
      decay: 0.22,
      filter: 1200,
      type: 'bandpass',
      q: 0.9,
      peak: level * 0.6,
    })
  },
  rim(ctx, time, level) {
    drumVoice(ctx, time, { from: 1700, to: 400, decay: 0.03, peak: level * 0.6, type: 'triangle', pitchDecay: 0.01 })
    noiseVoice(ctx, time, { decay: 0.03, filter: 3000, peak: level * 0.4 })
  },
  chat(ctx, time, level) {
    metallicVoice(ctx, time, { base: 320, decay: 0.05, peak: level * 0.6, filter: 8500 })
  },
  phat(ctx, time, level) {
    metallicVoice(ctx, time, { base: 320, decay: 0.1, peak: level * 0.55, filter: 8000 })
  },
  ohat(ctx, time, level) {
    metallicVoice(ctx, time, { base: 320, decay: 0.34, peak: level * 0.5, filter: 8000 })
  },
  ride(ctx, time, level) {
    metallicVoice(ctx, time, { base: 280, decay: 0.5, peak: level * 0.35, filter: 6000 })
  },
  crash(ctx, time, level) {
    metallicVoice(ctx, time, { base: 220, decay: 1.4, peak: level * 0.4, filter: 4500 })
  },
  ltom(ctx, time, level) {
    drumVoice(ctx, time, { from: 180, to: 90, decay: 0.35, peak: level * 0.85, pitchDecay: 0.1 })
  },
  mtom(ctx, time, level) {
    drumVoice(ctx, time, { from: 260, to: 130, decay: 0.3, peak: level * 0.85, pitchDecay: 0.09 })
  },
  htom(ctx, time, level) {
    drumVoice(ctx, time, { from: 360, to: 190, decay: 0.25, peak: level * 0.85, pitchDecay: 0.08 })
  },
  shaker(ctx, time, level) {
    noiseVoice(ctx, time, { decay: 0.06, filter: 6500, peak: level * 0.4, hold: 0.005 })
  },
  cowbell(ctx, time, level) {
    drumVoice(ctx, time, { from: 540, to: 540, decay: 0.28, peak: level * 0.3, type: 'square' })
    drumVoice(ctx, time, { from: 800, to: 800, decay: 0.28, peak: level * 0.3, type: 'square' })
  },
  conga(ctx, time, level) {
    drumVoice(ctx, time, { from: 420, to: 300, decay: 0.22, peak: level * 0.7, pitchDecay: 0.05 })
  },
}

export function triggerVoice(instrumentId, velocity, when) {
  if (velocity === VELOCITY.OFF) return
  const ctx = getContext()
  const voice = VOICES[instrumentId]
  if (!voice) return
  voice(ctx, when ?? ctx.currentTime, AUDIO_GAIN[velocity] ?? 0.7)
}


// --- voix harmoniques ----------------------------------------------------
//
// Trois timbres, synthétisés comme les percussions : aucun sample. Chacun
// reçoit une durée, car c'est elle qui distingue un stab d'un accord tenu.

function chordEnv(ctx, time, duration, peak, { attack, decay, sustain, release }) {
  const gain = ctx.createGain()
  const end = time + duration
  gain.gain.setValueAtTime(0, time)
  gain.gain.linearRampToValueAtTime(peak, time + attack)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * sustain), time + attack + decay)
  gain.gain.setValueAtTime(Math.max(0.0001, peak * sustain), Math.max(time + attack + decay, end))
  gain.gain.exponentialRampToValueAtTime(0.0001, Math.max(time + attack + decay, end) + release)
  return { gain, stop: Math.max(time + attack + decay, end) + release + 0.05 }
}

const CHORD_VOICES = {
  // Orgue : addition d'harmoniques entières, façon tirettes. Le petit clic
  // d'attaque est ce qui le rend reconnaissable.
  organ(ctx, freq, time, duration, level) {
    const { gain, stop } = chordEnv(ctx, time, duration, level * 0.5, {
      attack: 0.006, decay: 0.03, sustain: 0.9, release: 0.06,
    })
    gain.connect(master)

    for (const [ratio, amount] of [[1, 1], [2, 0.5], [3, 0.3], [4, 0.16]]) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq * ratio
      const partial = ctx.createGain()
      partial.gain.value = amount
      osc.connect(partial)
      partial.connect(gain)
      osc.start(time)
      osc.stop(stop)
    }

    noiseVoice(ctx, time, { decay: 0.012, filter: 4000, peak: level * 0.06 })
  },

  // Rhodes : modulation de fréquence à deux opérateurs. L'indice de modulation
  // s'effondre en 150 ms — c'est l'attaque de la lamelle, puis il ne reste
  // qu'une sinusoïde qui s'éteint.
  rhodes(ctx, freq, time, duration, level) {
    const { gain, stop } = chordEnv(ctx, time, duration, level * 0.55, {
      attack: 0.004, decay: 0.5, sustain: 0.35, release: 0.35,
    })
    gain.connect(master)

    const carrier = ctx.createOscillator()
    carrier.type = 'sine'
    carrier.frequency.value = freq

    const modulator = ctx.createOscillator()
    modulator.type = 'sine'
    modulator.frequency.value = freq * 2

    const index = ctx.createGain()
    index.gain.setValueAtTime(freq * 3.2, time)
    index.gain.exponentialRampToValueAtTime(freq * 0.05, time + 0.15)

    modulator.connect(index)
    index.connect(carrier.frequency)
    carrier.connect(gain)

    modulator.start(time)
    carrier.start(time)
    modulator.stop(stop)
    carrier.stop(stop)
  },

  // Nappe : deux dents de scie légèrement désaccordées, filtrées, avec une
  // attaque lente. Le battement entre les deux fait toute l'épaisseur.
  pad(ctx, freq, time, duration, level) {
    const { gain, stop } = chordEnv(ctx, time, duration, level * 0.32, {
      attack: 0.25, decay: 0.3, sustain: 0.85, release: 0.7,
    })

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.Q.value = 0.8
    filter.frequency.setValueAtTime(freq * 2, time)
    filter.frequency.linearRampToValueAtTime(freq * 6, time + Math.min(0.9, duration))

    filter.connect(gain)
    gain.connect(master)

    for (const detune of [-7, 7]) {
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = freq
      osc.detune.value = detune
      osc.connect(filter)
      osc.start(time)
      osc.stop(stop)
    }
  },
}

function midiToFrequency(note) {
  return 440 * 2 ** ((note - 69) / 12)
}

export function triggerChord(timbre, pitches, velocity, when, duration = 0.5) {
  if (velocity === VELOCITY.OFF) return
  const ctx = getContext()
  const voice = CHORD_VOICES[timbre] ?? CHORD_VOICES.organ
  const time = when ?? ctx.currentTime

  // Un accord de six notes ne doit pas être six fois plus fort qu'une seule :
  // on répartit l'énergie au lieu de l'additionner.
  const level = (AUDIO_GAIN[velocity] ?? 0.7) / Math.sqrt(pitches.length)
  for (const pitch of pitches) {
    voice(ctx, midiToFrequency(pitch), time, duration, level)
  }
}

// Lecture en boucle. Deux emplacements indépendants — une rythmique et une
// progression — partagent la même horloge, ce qui permet de les superposer.
// Le tempo et le swing sont ceux du dernier élément lancé.
export class Sequencer {
  constructor() {
    this.timer = null
    this.slots = { drum: null, chords: null }
    this.hits = { chords: new Map() }
    this.transpose = 0
    this.bpm = 120
    this.swing = 0.5
    this.steps = 32
    this.onStep = null
    this.stepIndex = 0
    this.nextStepTime = 0
  }

  get isPlaying() {
    return this.timer !== null
  }

  playing(kind) {
    return this.slots[kind] !== null
  }

  adopt(item) {
    this.bpm = item.bpm
    this.swing = item.swing
    this.steps = item.steps
  }

  cacheChords() {
    const progression = this.slots.chords
    const map = new Map()
    if (progression) {
      for (const hit of progressionHits(progression, this.transpose)) map.set(hit.step, hit)
    }
    this.hits.chords = map
  }

  start(kind, item, onStep) {
    const ctx = getContext()
    if (ctx.state === 'suspended') ctx.resume()

    this.slots[kind] = item
    this.adopt(item)
    if (kind === 'chords') this.cacheChords()
    if (onStep) this.onStep = onStep

    // Si quelque chose joue déjà, le nouvel élément se greffe sur l'horloge en
    // cours plutôt que de la relancer : c'est ce qui les garde calés.
    if (this.timer === null) {
      this.stepIndex = 0
      this.nextStepTime = ctx.currentTime + 0.06
      this.timer = window.setInterval(() => this.tick(), LOOKAHEAD_MS)
      this.tick()
    }
  }

  update(kind, item) {
    if (!this.slots[kind]) return
    this.slots[kind] = item
    this.adopt(item)
    if (kind === 'chords') this.cacheChords()
  }

  setTranspose(transpose) {
    this.transpose = transpose
    this.cacheChords()
  }

  stopSlot(kind) {
    this.slots[kind] = null
    if (kind === 'chords') this.cacheChords()
    if (!this.slots.drum && !this.slots.chords) this.stop()
  }

  stop() {
    if (this.timer !== null) {
      window.clearInterval(this.timer)
      this.timer = null
    }
    this.slots = { drum: null, chords: null }
    this.hits.chords = new Map()
    if (this.onStep) this.onStep(-1)
    this.onStep = null
  }

  tick() {
    const ctx = getContext()
    if (this.timer === null) return

    const stepDuration = 60 / this.bpm / 4

    while (this.nextStepTime < ctx.currentTime + SCHEDULE_AHEAD_S) {
      const step = this.stepIndex % this.steps
      const time = this.nextStepTime + swingOffset(step, this.swing) * stepDuration

      const pattern = this.slots.drum
      if (pattern) {
        for (const track of pattern.tracks) {
          triggerVoice(track.instrument, track.cells[step], time)
        }
      }

      const progression = this.slots.chords
      const hit = this.hits.chords.get(step)
      if (progression && hit) {
        triggerChord(progression.timbre, hit.pitches, hit.velocity, time, hit.lengthSteps * stepDuration)
      }

      const scheduledStep = step
      const delayMs = Math.max(0, (time - ctx.currentTime) * 1000)
      window.setTimeout(() => {
        if (this.timer !== null) this.onStep?.(scheduledStep)
      }, delayMs)

      this.nextStepTime += stepDuration
      this.stepIndex += 1
    }
  }
}
