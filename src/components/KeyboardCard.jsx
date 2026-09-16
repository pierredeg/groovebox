import { memo, useEffect, useRef, useState } from 'react'
import Keyboard from './Keyboard.jsx'
import { chordPitchName, chordPitches, transposeSymbol } from '../lib/chords.js'
import { triggerChord } from '../lib/audio.js'
import { VELOCITY } from '../lib/pattern.js'

// Durée d'un accord pendant la démonstration pas à pas : assez long pour avoir
// le temps de poser les doigts, ce qui est tout l'intérêt de la section.
const WALK_MS = 2200

function KeyboardCard({ progression, transpose }) {
  const timers = useRef([])

  const chords = progression.chords.map(([symbol]) => ({
    symbol: transposeSymbol(symbol, transpose),
    pitches: chordPitches(symbol, transpose),
  }))

  // La démonstration est rattachée à une progression dans une tonalité donnée.
  // Si l'une des deux change, l'accord en cours ne correspond plus à ce qu'on
  // entend : on le déduit au rendu plutôt que de remettre l'état à zéro.
  const walkKey = `${progression.id}:${transpose}`
  const [walk, setWalk] = useState({ key: null, index: -1 })
  const current = walk.key === walkKey ? walk.index : -1

  const clear = () => {
    for (const timer of timers.current) window.clearTimeout(timer)
    timers.current = []
  }

  const setCurrent = (index) => setWalk({ key: walkKey, index })

  // Les minuteries en attente sont annulées au démontage et dès que la
  // progression ou la tonalité change.
  useEffect(() => clear, [walkKey])

  const play = (index) => {
    triggerChord(progression.timbre, chords[index].pitches, VELOCITY.NORMAL, undefined, 1.6)
    setCurrent(index)
  }

  const toggleWalk = () => {
    if (current !== -1) {
      clear()
      setCurrent(-1)
      return
    }
    chords.forEach((chord, index) => {
      timers.current.push(
        window.setTimeout(() => {
          triggerChord(progression.timbre, chord.pitches, VELOCITY.NORMAL, undefined, WALK_MS / 1000)
          setCurrent(index)
        }, index * WALK_MS),
      )
    })
    timers.current.push(
      window.setTimeout(() => {
        clear()
        setCurrent(-1)
      }, chords.length * WALK_MS),
    )
  }

  return (
    <article className={`card keyboard-card${current !== -1 ? ' is-playing' : ''}`}>
      <header className="card-head">
        <div className="card-title">
          <button
            type="button"
            className={`play${current !== -1 ? ' on' : ''}`}
            onClick={toggleWalk}
            aria-label={`Faire défiler les accords de ${progression.name}`}
          >
            {current !== -1 ? '■' : '▶'}
          </button>
          <div>
            <h2>{progression.name}</h2>
            <p className="genre">
              {progression.genre}
              {/* Hors du style en capitales : un chiffrage d'accord doit garder
                  sa casse, « FMAJ9 » ne se lit pas. */}
              <span className="genre-chords">{chords.map((chord) => chord.symbol).join('  →  ')}</span>
            </p>
          </div>
        </div>
      </header>

      <div className="keyboard-grid">
        {chords.map((chord, index) => (
          <button
            type="button"
            key={`${chord.symbol}-${index}`}
            className={`keyboard-slot${current === index ? ' current' : ''}`}
            onClick={() => play(index)}
          >
            <span className="keyboard-head">
              <span className="keyboard-step">{index + 1}</span>
              <span className="keyboard-symbol">{chord.symbol}</span>
            </span>
            <Keyboard
              pitches={chord.pitches}
              label={`${chord.symbol} : ${chord.pitches.map(chordPitchName).join(', ')}`}
            />
            <span className="keyboard-notes">
              {chord.pitches.map((pitch, position) => (
                <span key={pitch}>
                  <b>{position + 1}</b>
                  {chordPitchName(pitch)}
                </span>
              ))}
            </span>
          </button>
        ))}
      </div>
    </article>
  )
}

export default memo(KeyboardCard)
