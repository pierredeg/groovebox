// Catalogue des instruments de percussion.
//
// `note` suit la convention General MIDI Percussion (canal 10), ce qui permet
// aux fichiers exportés de tomber directement en face des bons pads dans un
// Drum Rack Ableton, Battery, Logic Drummer, etc.
export const INSTRUMENTS = [
  { id: 'kick', label: 'Kick', short: 'KCK', note: 36, color: '#ff5a3c' },
  { id: 'snare', label: 'Snare', short: 'SNR', note: 38, color: '#ffd23f' },
  { id: 'clap', label: 'Clap', short: 'CLP', note: 39, color: '#ff8fb1' },
  { id: 'rim', label: 'Rimshot', short: 'RIM', note: 37, color: '#c792ea' },
  { id: 'chat', label: 'Closed hat', short: 'CHH', note: 42, color: '#5ad2ff' },
  { id: 'phat', label: 'Pedal hat', short: 'PHH', note: 44, color: '#49b6dd' },
  { id: 'ohat', label: 'Open hat', short: 'OHH', note: 46, color: '#7cf5d5' },
  { id: 'ride', label: 'Ride', short: 'RDE', note: 51, color: '#9ad0a0' },
  { id: 'crash', label: 'Crash', short: 'CRS', note: 49, color: '#b6c2ff' },
  { id: 'ltom', label: 'Low tom', short: 'LTM', note: 45, color: '#e08d4f' },
  { id: 'mtom', label: 'Mid tom', short: 'MTM', note: 47, color: '#e8a663' },
  { id: 'htom', label: 'High tom', short: 'HTM', note: 50, color: '#f0bf7e' },
  { id: 'shaker', label: 'Shaker', short: 'SHK', note: 70, color: '#8fa3b8' },
  { id: 'cowbell', label: 'Cowbell', short: 'CWB', note: 56, color: '#d9d06a' },
  { id: 'conga', label: 'Conga', short: 'CNG', note: 63, color: '#cf9b6e' },
]

export const INSTRUMENT_BY_ID = Object.fromEntries(
  INSTRUMENTS.map((instrument) => [instrument.id, instrument]),
)

// Ordre d'affichage dans la grille : du plus grave au plus aigu, comme sur une
// boîte à rythmes.
export const INSTRUMENT_ORDER = INSTRUMENTS.map((instrument) => instrument.id)

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// Nom de note affiché pour un numéro MIDI, dans la convention où le do central
// (60) s'appelle C3 — celle d'Ableton, Logic et Cubase, donc le kick GM (36)
// s'écrit C1. FL Studio décale les mêmes notes de deux octaves vers le haut.
//
// Calculé plutôt qu'écrit à la main : une table recopiée finit toujours par
// contenir une faute, et une faute ici envoie l'utilisateur sur le mauvais pad.
export function noteName(note) {
  return `${NOTE_NAMES[note % 12]}${Math.floor(note / 12) - 2}`
}
