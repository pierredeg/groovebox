import { chordPitchName } from '../lib/chords.js'

// Schéma d'un clavier de 37 touches — trois octaves de Do à Do, la disposition
// du KeyStep 37. Les touches à enfoncer sont colorées et numérotées de la plus
// grave à la plus aiguë : pas besoin de lire une partition, il suffit de
// compter les touches.

export const LOWEST = 48
export const HIGHEST = 84

const WHITE_W = 14
const WHITE_H = 58
const BLACK_W = 9
const BLACK_H = 36
const LABEL_H = 15

const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10])

const isBlack = (note) => BLACK_PITCH_CLASSES.has(note % 12)

// Position horizontale de chaque touche, calculée une fois pour toutes.
const LAYOUT = (() => {
  const keys = []
  let whiteIndex = 0
  for (let note = LOWEST; note <= HIGHEST; note += 1) {
    if (isBlack(note)) {
      keys.push({ note, black: true, x: whiteIndex * WHITE_W - BLACK_W / 2 })
    } else {
      keys.push({ note, black: false, x: whiteIndex * WHITE_W })
      whiteIndex += 1
    }
  }
  return { keys, whites: whiteIndex }
})()

const WIDTH = LAYOUT.whites * WHITE_W
const HEIGHT = WHITE_H + LABEL_H

export default function Keyboard({ pitches, label }) {
  const held = new Map(pitches.map((pitch, index) => [pitch, index + 1]))
  const root = pitches[0]

  return (
    <svg
      className="keyboard"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH}
      height={HEIGHT}
      role="img"
      aria-label={label ?? `Touches à jouer : ${pitches.map(chordPitchName).join(', ')}`}
    >
      {LAYOUT.keys
        .filter((key) => !key.black)
        .map((key) => {
          const order = held.get(key.note)
          return (
            <g key={key.note}>
              <rect
                x={key.x}
                y={0}
                width={WHITE_W}
                height={WHITE_H}
                rx={2}
                className={`key white${order ? ' held' : ''}${key.note === root ? ' root' : ''}`}
              />
              {order && (
                <text x={key.x + WHITE_W / 2} y={WHITE_H - 9} className="key-order">
                  {order}
                </text>
              )}
              {key.note % 12 === 0 && (
                <text x={key.x + WHITE_W / 2} y={HEIGHT - 4} className="key-c">
                  {chordPitchName(key.note)}
                </text>
              )}
            </g>
          )
        })}

      {LAYOUT.keys
        .filter((key) => key.black)
        .map((key) => {
          const order = held.get(key.note)
          return (
            <g key={key.note}>
              <rect
                x={key.x}
                y={0}
                width={BLACK_W}
                height={BLACK_H}
                rx={1.5}
                className={`key black${order ? ' held' : ''}${key.note === root ? ' root' : ''}`}
              />
              {order && (
                <text x={key.x + BLACK_W / 2} y={BLACK_H - 6} className="key-order on-black">
                  {order}
                </text>
              )}
            </g>
          )
        })}
    </svg>
  )
}
