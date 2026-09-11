import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PatternCard from './components/PatternCard.jsx'
import { GENRES, PATTERNS } from './data/patterns.js'
import { INSTRUMENT_BY_ID } from './data/instruments.js'
import { Sequencer, setMasterVolume } from './lib/audio.js'
import { dehydratePattern, hydratePattern } from './lib/pattern.js'

const STORAGE_KEY = 'groovebox:edits:v1'
const ALL = 'Tous'

function readEdits() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function writeEdits(edits) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(edits))
  } catch {
    // Mode privé ou stockage plein : les modifications restent en mémoire.
  }
}

// Les patterns d'origine sont la référence ; les retouches de l'utilisateur
// sont stockées à part pour pouvoir toujours revenir en arrière.
function buildInitialState() {
  const edits = readEdits()
  return PATTERNS.map((pattern) => hydratePattern(edits[pattern.id] ?? pattern))
}

export default function App() {
  const [patterns, setPatterns] = useState(buildInitialState)
  const [edited, setEdited] = useState(() => new Set(Object.keys(readEdits())))
  const [genre, setGenre] = useState(ALL)
  const [query, setQuery] = useState('')
  const [playingId, setPlayingId] = useState(null)
  const [playhead, setPlayhead] = useState(-1)
  const [volume, setVolume] = useState(0.8)

  const sequencer = useRef(null)
  if (sequencer.current === null) sequencer.current = new Sequencer()

  useEffect(() => () => sequencer.current?.stop(), [])

  useEffect(() => {
    setMasterVolume(volume)
  }, [volume])

  const stop = useCallback(() => {
    sequencer.current.stop()
    setPlayingId(null)
    setPlayhead(-1)
  }, [])

  const togglePlay = useCallback(
    (pattern) => {
      if (sequencer.current.isPlaying && playingId === pattern.id) {
        stop()
        return
      }
      sequencer.current.start(pattern, setPlayhead)
      setPlayingId(pattern.id)
    },
    [playingId, stop],
  )

  const updatePattern = useCallback((next) => {
    setPatterns((current) => current.map((pattern) => (pattern.id === next.id ? next : pattern)))
    setEdited((current) => new Set(current).add(next.id))

    const edits = readEdits()
    edits[next.id] = dehydratePattern(next)
    writeEdits(edits)

    sequencer.current.update(next)
  }, [])

  const resetPattern = useCallback((id) => {
    const original = PATTERNS.find((pattern) => pattern.id === id)
    if (!original) return

    const restored = hydratePattern(original)
    setPatterns((current) => current.map((pattern) => (pattern.id === id ? restored : pattern)))
    setEdited((current) => {
      const next = new Set(current)
      next.delete(id)
      return next
    })

    const edits = readEdits()
    delete edits[id]
    writeEdits(edits)

    sequencer.current.update(restored)
  }, [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') stop()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [stop])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return patterns.filter((pattern) => {
      if (genre !== ALL && pattern.genre !== genre) return false
      if (!needle) return true
      const haystack = [
        pattern.name,
        pattern.genre,
        pattern.notes ?? '',
        String(pattern.bpm),
        ...pattern.tracks.map((track) => INSTRUMENT_BY_ID[track.instrument]?.label ?? ''),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    })
  }, [patterns, genre, query])

  const counts = useMemo(() => {
    const byGenre = { [ALL]: patterns.length }
    for (const pattern of patterns) {
      byGenre[pattern.genre] = (byGenre[pattern.genre] ?? 0) + 1
    }
    return byGenre
  }, [patterns])

  return (
    <div className="app">
      <header className="masthead">
        <div className="masthead-title">
          <h1>Groovebox</h1>
          <p>
            Mes rythmiques de référence sur une grille. Clic pour écouter, clic sur une case pour la
            modifier, glisser le bouton MIDI dans le DAW.
          </p>
        </div>
        <div className="masthead-tools">
          <label className="volume">
            <span>Volume</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
            />
          </label>
          {playingId && (
            <button type="button" className="stop-all" onClick={stop}>
              ■ Stop <kbd>Échap</kbd>
            </button>
          )}
        </div>
      </header>

      <nav className="filters">
        <div className="chips">
          {[ALL, ...GENRES].map((value) => (
            <button
              type="button"
              key={value}
              className={`chip${genre === value ? ' on' : ''}`}
              onClick={() => setGenre(value)}
            >
              {value}
              <span className="chip-count">{counts[value] ?? 0}</span>
            </button>
          ))}
        </div>
        <input
          type="search"
          className="search"
          placeholder="Chercher un groove, un instrument, un tempo…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </nav>

      <main className="library">
        {visible.map((pattern) => (
          <PatternCard
            key={pattern.id}
            pattern={pattern}
            isPlaying={playingId === pattern.id}
            playhead={playhead}
            isEdited={edited.has(pattern.id)}
            onTogglePlay={togglePlay}
            onChange={updatePattern}
            onReset={resetPattern}
          />
        ))}
        {visible.length === 0 && <p className="empty">Aucun groove ne correspond à cette recherche.</p>}
      </main>

      <footer className="colophon">
        <p>
          Export General MIDI canal 10 : kick C1 (36), snare D1 (38), closed hat F#1 (42), open hat
          A#1 (46)… Le tempo et le swing sont écrits dans le fichier.
        </p>
        <p>
          <code>X</code> accent · <code>x</code> normal · <code>o</code> ghost note · alt-clic pour
          effacer.
        </p>
      </footer>
    </div>
  )
}
