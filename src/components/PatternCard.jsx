import { memo, useState } from 'react'
import StepGrid from './StepGrid.jsx'
import { downloadMidi, midiFileName, setDragData } from '../lib/midi.js'
import { serializeRow } from '../lib/pattern.js'

function swingLabel(swing) {
  if (swing <= 0.505) return 'binaire'
  if (swing >= 0.655) return 'triolet'
  return `${Math.round(swing * 100)} %`
}

// Mémoïsé : la tête de lecture avance ~20 fois par seconde et ne doit
// redessiner que la carte en cours de lecture, pas toute la bibliothèque.
function PatternCard({
  pattern,
  isPlaying,
  playhead,
  isEdited,
  ruler,
  onTogglePlay,
  onChange,
  onReset,
}) {
  const [copied, setCopied] = useState(false)

  const setCell = (instrument, step, velocity) => {
    onChange({
      ...pattern,
      tracks: pattern.tracks.map((track) =>
        track.instrument === instrument
          ? { ...track, cells: track.cells.map((cell, index) => (index === step ? velocity : cell)) }
          : track,
      ),
    })
  }

  const clearTrack = (instrument) => {
    onChange({
      ...pattern,
      tracks: pattern.tracks.map((track) =>
        track.instrument === instrument ? { ...track, cells: track.cells.map(() => 0) } : track,
      ),
    })
  }

  const removeTrack = (instrument) => {
    onChange({ ...pattern, tracks: pattern.tracks.filter((track) => track.instrument !== instrument) })
  }

  const addTrack = (instrument) => {
    onChange({
      ...pattern,
      tracks: [...pattern.tracks, { instrument, cells: new Array(pattern.steps).fill(0) }],
    })
  }

  // Copie la notation texte du pattern, pour le recoller dans patterns.js.
  const copyNotation = async () => {
    const text = pattern.tracks
      .map((track) => {
        const row = serializeRow(track.cells).replace(/(.{4})(?=.)/g, '$1|')
        return `      ${(track.instrument + ':').padEnd(8)}'${row}',`
      })
      .join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <article className={`card${isPlaying ? ' is-playing' : ''}`}>
      <header className="card-head">
        <div className="card-title">
          <button
            type="button"
            className={`play${isPlaying ? ' on' : ''}`}
            onClick={() => onTogglePlay(pattern)}
            aria-label={isPlaying ? `Arrêter ${pattern.name}` : `Jouer ${pattern.name}`}
          >
            {isPlaying ? '■' : '▶'}
          </button>
          <div>
            <h2>
              {pattern.name}
              {isEdited && <span className="badge" title="Modifié par rapport à l'original">modifié</span>}
            </h2>
            <p className="genre">{pattern.genre}</p>
          </div>
        </div>

        <div className="card-controls">
          <label>
            <span>BPM</span>
            <input
              type="number"
              min="40"
              max="220"
              value={pattern.bpm}
              onChange={(event) => onChange({ ...pattern, bpm: Number(event.target.value) || pattern.bpm })}
            />
          </label>
          <label className="swing">
            <span>Swing · {swingLabel(pattern.swing)}</span>
            <input
              type="range"
              min="0.5"
              max="0.7"
              step="0.01"
              value={pattern.swing}
              onChange={(event) => onChange({ ...pattern, swing: Number(event.target.value) })}
            />
          </label>
        </div>
      </header>

      {pattern.notes && <p className="notes">{pattern.notes}</p>}

      <StepGrid
        pattern={pattern}
        playhead={isPlaying ? playhead : -1}
        ruler={ruler}
        onToggleCell={setCell}
        onClearTrack={clearTrack}
        onRemoveTrack={removeTrack}
        onAddTrack={addTrack}
      />

      <footer className="card-foot">
        <button
          type="button"
          className="midi"
          draggable
          onDragStart={(event) => setDragData(event.dataTransfer, pattern)}
          onClick={() => downloadMidi(pattern)}
          title={`Glisser dans le DAW, ou cliquer pour télécharger ${midiFileName(pattern)}`}
        >
          <span className="midi-icon">⠿</span> MIDI
          <span className="hint">glisser vers le DAW · clic = téléchargement</span>
        </button>

        <button type="button" className="ghost-button" onClick={copyNotation}>
          {copied ? 'Notation copiée' : 'Copier la notation'}
        </button>

        {isEdited && (
          <button type="button" className="ghost-button" onClick={() => onReset(pattern.id)}>
            Rétablir l'original
          </button>
        )}
      </footer>
    </article>
  )
}

export default memo(PatternCard)
