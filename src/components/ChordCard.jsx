import { memo } from 'react'
import { progressionHits, chordPitchName, transposeSymbol, chordPitches } from '../lib/chords.js'
import { VELOCITY, mpcBarBeat, mpcPosition, nextVelocity } from '../lib/pattern.js'
import { downloadMidi, midiFileName, setDragData } from '../lib/midi.js'
import { triggerChord } from '../lib/audio.js'

// Mêmes niveaux de frappe que la batterie, pour que la lecture soit la même
// des deux côtés de l'application.
const VELOCITY_CLASS = {
  [VELOCITY.OFF]: 'off',
  [VELOCITY.GHOST]: 'ghost',
  [VELOCITY.NORMAL]: 'normal',
  [VELOCITY.ACCENT]: 'accent',
}

const TIMBRES = [
  { id: 'organ', label: 'Orgue' },
  { id: 'rhodes', label: 'Rhodes' },
  { id: 'pad', label: 'Nappe' },
]

function gateLabel(gate) {
  if (gate <= 0.3) return 'stab'
  if (gate >= 0.95) return 'tenu'
  return 'mi-long'
}

function ChordCard({ progression, transpose, isPlaying, playhead, ruler, onTogglePlay, onChange }) {
  const mpc = ruler === 'mpc'
  const steps = Array.from({ length: progression.steps }, (_, index) => index)
  const hits = progressionHits(progression, transpose)
  const struck = new Set(hits.map((hit) => hit.step))

  const setCell = (step, velocity) => {
    onChange({
      ...progression,
      rhythm: progression.rhythm.map((cell, index) => (index === step ? velocity : cell)),
    })
  }

  // Les blocs d'accords occupent autant de colonnes que de pas. Le point de
  // départ se recalcule depuis les accords précédents plutôt que par un
  // compteur muté pendant le rendu.
  const blocks = progression.chords.map(([symbol, span], index) => ({
    index,
    symbol,
    span,
    start: progression.chords.slice(0, index).reduce((sum, [, previous]) => sum + previous, 0),
    pitches: chordPitches(symbol, transpose),
  }))

  return (
    <article className={`card${isPlaying ? ' is-playing' : ''}`}>
      <header className="card-head">
        <div className="card-title">
          <button
            type="button"
            className={`play${isPlaying ? ' on' : ''}`}
            onClick={() => onTogglePlay(progression)}
            aria-label={isPlaying ? `Arrêter ${progression.name}` : `Jouer ${progression.name}`}
          >
            {isPlaying ? '■' : '▶'}
          </button>
          <div>
            <h2>{progression.name}</h2>
            <p className="genre">{progression.genre}</p>
          </div>
        </div>

        <div className="card-controls">
          <label>
            <span>BPM</span>
            <input
              type="number"
              min="40"
              max="220"
              value={progression.bpm}
              onChange={(event) =>
                onChange({ ...progression, bpm: Number(event.target.value) || progression.bpm })
              }
            />
          </label>
          <label>
            <span>Timbre</span>
            <select
              value={progression.timbre}
              onChange={(event) => onChange({ ...progression, timbre: event.target.value })}
            >
              {TIMBRES.map((timbre) => (
                <option key={timbre.id} value={timbre.id}>
                  {timbre.label}
                </option>
              ))}
            </select>
          </label>
          <label className="swing">
            <span>Attaque · {gateLabel(progression.gate)}</span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={progression.gate}
              onChange={(event) => onChange({ ...progression, gate: Number(event.target.value) })}
            />
          </label>
        </div>
      </header>

      {progression.notes && <p className="notes">{progression.notes}</p>}

      <div className="grid-scroll">
        <div className={`grid${mpc ? ' mpc' : ''}`} style={{ '--steps': progression.steps }}>
          <div className="grid-row grid-ruler">
            <div className="grid-label" aria-hidden="true" />
            {steps.map((step) => (
              <div
                key={step}
                className={`ruler-cell${step % 4 === 0 ? ' beat' : ''}${step === playhead ? ' playing' : ''}`}
              >
                {step % 4 === 0 ? (mpc ? mpcBarBeat(step) : step / 4 + 1) : ''}
              </div>
            ))}
          </div>

          <div className="grid-row chord-lane">
            <div className="grid-label">
              <span className="lane-name">ACCORDS</span>
            </div>
            {blocks.map((block) => (
              <button
                type="button"
                key={block.index}
                className={`chord-block${playhead >= block.start && playhead < block.start + block.span ? ' playing' : ''}`}
                style={{ gridColumn: `span ${block.span}` }}
                onClick={() =>
                  triggerChord(progression.timbre, block.pitches, VELOCITY.NORMAL, undefined, 1.1)
                }
                title={block.pitches.map(chordPitchName).join(' · ')}
              >
                <span className="chord-symbol">{transposeSymbol(block.symbol, transpose)}</span>
                <span className="chord-voicing">{block.pitches.map(chordPitchName).join(' ')}</span>
              </button>
            ))}
          </div>

          <div className="grid-row">
            <div className="grid-label">
              <span className="lane-name">RYTHME</span>
            </div>
            {progression.rhythm.map((velocity, step) => (
              <button
                type="button"
                key={step}
                className={`cell chord-cell ${VELOCITY_CLASS[velocity]}${step % 4 === 0 ? ' beat' : ''}${step === playhead ? ' playing' : ''}${struck.has(step) ? ' struck' : ''}`}
                aria-label={`Pas ${step + 1} (${mpcPosition(step)})`}
                title={mpcPosition(step)}
                onClick={(event) =>
                  setCell(step, event.altKey ? VELOCITY.OFF : nextVelocity(velocity))
                }
                onContextMenu={(event) => {
                  event.preventDefault()
                  setCell(step, VELOCITY.OFF)
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <footer className="card-foot">
        <button
          type="button"
          className="midi"
          draggable
          onDragStart={(event) => setDragData(event.dataTransfer, progression, transpose)}
          onClick={() => downloadMidi(progression, transpose)}
          title={`Glisser dans le DAW, ou cliquer pour télécharger ${midiFileName(progression)}`}
        >
          <span className="midi-icon">⠿</span> MIDI
          <span className="hint">canal 1 · {hits.length} frappes</span>
        </button>
      </footer>
    </article>
  )
}

export default memo(ChordCard)
