import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PatternCard from './components/PatternCard.jsx'
import ChordCard from './components/ChordCard.jsx'
import KeyboardCard from './components/KeyboardCard.jsx'
import MidiLegend from './components/MidiLegend.jsx'
import { GENRES, PATTERNS } from './data/patterns.js'
import { PROGRESSIONS } from './data/progressions.js'
import { INSTRUMENT_BY_ID } from './data/instruments.js'
import { Sequencer, setMasterVolume } from './lib/audio.js'
import { dehydratePattern, hydratePattern, patternProfile } from './lib/pattern.js'
import { TRANSPOSITIONS, dehydrateProgression, hydrateProgression } from './lib/chords.js'

const EDITS_KEY = 'groovebox:edits:v1'
const CHORD_EDITS_KEY = 'groovebox:chord-edits:v1'
const RULER_KEY = 'groovebox:ruler:v1'
const SECTION_KEY = 'groovebox:section:v1'
const TRANSPOSE_KEY = 'groovebox:transpose:v1'
const ALL = 'Tous'

function readStore(key) {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}')
  } catch {
    return {}
  }
}

function writeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Mode privé ou stockage plein : les modifications restent en mémoire.
  }
}

function readSetting(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

// Les données d'origine restent la référence ; les retouches sont stockées à
// part pour pouvoir toujours revenir en arrière.
function buildPatterns() {
  const edits = readStore(EDITS_KEY)
  return PATTERNS.map((pattern) => hydratePattern(edits[pattern.id] ?? pattern))
}

function buildProgressions() {
  const edits = readStore(CHORD_EDITS_KEY)
  return PROGRESSIONS.map((progression) =>
    hydrateProgression(edits[progression.id] ?? progression),
  )
}

export default function App() {
  const [patterns, setPatterns] = useState(buildPatterns)
  const [progressions, setProgressions] = useState(buildProgressions)
  const [edited, setEdited] = useState(() => new Set(Object.keys(readStore(EDITS_KEY))))

  const SECTIONS = ['drums', 'chords', 'keyboard']
  const [section, setSection] = useState(() => {
    const stored = readSetting(SECTION_KEY, 'drums')
    return SECTIONS.includes(stored) ? stored : 'drums'
  })
  const [genre, setGenre] = useState(ALL)
  const [query, setQuery] = useState('')
  const [ghostedOnly, setGhostedOnly] = useState(false)
  const [transpose, setTranspose] = useState(() => Number(readSetting(TRANSPOSE_KEY, '0')) || 0)

  // Un identifiant par emplacement : une rythmique et une progression peuvent
  // jouer en même temps.
  const [playing, setPlaying] = useState({ drum: null, chords: null })
  const [playhead, setPlayhead] = useState(-1)
  const [volume, setVolume] = useState(0.8)
  const [showLegend, setShowLegend] = useState(false)
  const [ruler, setRuler] = useState(() => (readSetting(RULER_KEY, 'beats') === 'mpc' ? 'mpc' : 'beats'))

  // Tempo et swing en vigueur : ceux du dernier élément lancé. Gardés en état
  // plutôt que lus sur le séquenceur, pour que la barre de transport se
  // rafraîchisse vraiment.
  const [transport, setTransport] = useState({ bpm: 120, swing: 0.5 })

  const sequencer = useRef(null)
  if (sequencer.current === null) sequencer.current = new Sequencer()

  useEffect(() => () => sequencer.current?.stop(), [])
  useEffect(() => setMasterVolume(volume), [volume])
  useEffect(() => {
    try {
      localStorage.setItem(RULER_KEY, ruler)
      localStorage.setItem(SECTION_KEY, section)
      localStorage.setItem(TRANSPOSE_KEY, String(transpose))
    } catch {
      // Stockage indisponible : les choix valent pour la session en cours.
    }
  }, [ruler, section, transpose])

  useEffect(() => {
    sequencer.current.setTranspose(transpose)
  }, [transpose])

  const stopAll = useCallback(() => {
    sequencer.current.stop()
    setPlaying({ drum: null, chords: null })
    setPlayhead(-1)
  }, [])

  const togglePlay = useCallback((kind, item) => {
    const player = sequencer.current
    setPlaying((current) => {
      if (current[kind] === item.id) {
        player.stopSlot(kind)
        const next = { ...current, [kind]: null }
        if (!next.drum && !next.chords) setPlayhead(-1)
        return next
      }
      player.start(kind, item, setPlayhead)
      setTransport({ bpm: item.bpm, swing: item.swing })
      return { ...current, [kind]: item.id }
    })
  }, [])

  const updatePattern = useCallback((next) => {
    setPatterns((current) => current.map((pattern) => (pattern.id === next.id ? next : pattern)))
    setEdited((current) => new Set(current).add(next.id))

    const edits = readStore(EDITS_KEY)
    edits[next.id] = dehydratePattern(next)
    writeStore(EDITS_KEY, edits)
    sequencer.current.update('drum', next)
    setPlaying((current) => {
      if (current.drum === next.id) setTransport({ bpm: next.bpm, swing: next.swing })
      return current
    })
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

    const edits = readStore(EDITS_KEY)
    delete edits[id]
    writeStore(EDITS_KEY, edits)
    sequencer.current.update('drum', restored)
  }, [])

  const updateProgression = useCallback((next) => {
    setProgressions((current) =>
      current.map((progression) => (progression.id === next.id ? next : progression)),
    )
    const edits = readStore(CHORD_EDITS_KEY)
    edits[next.id] = dehydrateProgression(next)
    writeStore(CHORD_EDITS_KEY, edits)
    sequencer.current.update('chords', next)
    setPlaying((current) => {
      if (current.chords === next.id) setTransport({ bpm: next.bpm, swing: next.swing })
      return current
    })
  }, [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') stopAll()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [stopAll])

  const library = section === 'drums' ? patterns : progressions

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return library.filter((item) => {
      if (genre !== ALL && item.genre !== genre) return false
      if (ghostedOnly && item.tracks && !patternProfile(item).ghosted) return false
      if (!needle) return true
      const extras = item.chords
        ? item.chords.map(([symbol]) => symbol)
        : item.tracks.map((track) => INSTRUMENT_BY_ID[track.instrument]?.label ?? '')
      return [item.name, item.genre, item.notes ?? '', String(item.bpm), ...extras]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
  }, [library, genre, query, ghostedOnly])

  const usedInstruments = useMemo(
    () =>
      new Set(
        visible.flatMap((item) => (item.tracks ?? []).map((track) => track.instrument)),
      ),
    [visible],
  )

  const counts = useMemo(() => {
    const byGenre = { [ALL]: library.length }
    for (const item of library) byGenre[item.genre] = (byGenre[item.genre] ?? 0) + 1
    return byGenre
  }, [library])

  const nowPlaying = useMemo(() => {
    const drum = patterns.find((pattern) => pattern.id === playing.drum)
    const chords = progressions.find((progression) => progression.id === playing.chords)
    return { drum, chords }
  }, [patterns, progressions, playing])

  return (
    <div className="app">
      <header className="masthead">
        <div className="masthead-title">
          <h1>Groovebox</h1>
          <p>
            Mes rythmiques et mes progressions de référence sur une grille. Une rythmique et une
            suite d'accords peuvent jouer ensemble.
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
          <button
            type="button"
            className={`legend-toggle${ruler === 'mpc' ? ' on' : ''}`}
            onClick={() => setRuler((current) => (current === 'mpc' ? 'beats' : 'mpc'))}
            aria-pressed={ruler === 'mpc'}
            title="Afficher les positions au format mesure.temps.tick de la MPC"
          >
            Temps MPC
          </button>
          <button
            type="button"
            className={`legend-toggle${showLegend ? ' on' : ''}`}
            onClick={() => setShowLegend((current) => !current)}
            aria-expanded={showLegend}
          >
            Mapping MIDI
          </button>
        </div>
      </header>

      <nav className="filters">
        <div className="sections">
          <button
            type="button"
            className={`section-tab${section === 'drums' ? ' on' : ''}`}
            onClick={() => setSection('drums')}
          >
            Rythmiques <span className="chip-count">{patterns.length}</span>
          </button>
          <button
            type="button"
            className={`section-tab${section === 'chords' ? ' on' : ''}`}
            onClick={() => setSection('chords')}
          >
            Accords <span className="chip-count">{progressions.length}</span>
          </button>
          <button
            type="button"
            className={`section-tab${section === 'keyboard' ? ' on' : ''}`}
            onClick={() => setSection('keyboard')}
          >
            Clavier
          </button>
        </div>

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

        <div className="filters-right">
          {section === 'drums' && (
            <button
              type="button"
              className={`legend-toggle${ghostedOnly ? ' on' : ''}`}
              onClick={() => setGhostedOnly((current) => !current)}
              aria-pressed={ghostedOnly}
              title="N'afficher que les grooves portés par des ghost notes, avec deux mesures différentes"
            >
              Ghostés
            </button>
          )}
          {section !== 'drums' && (
            <label className="key-select" title="Déplace la fondamentale de référence (La) vers une autre note">
              <span>La →</span>
              <select value={transpose} onChange={(event) => setTranspose(Number(event.target.value))}>
                {TRANSPOSITIONS.map((step) => (
                  <option key={step.name} value={step.transpose}>
                    {step.name}
                    {step.transpose === 0 ? ' (origine)' : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
          <input
            type="search"
            className="search"
            placeholder={section === 'drums' ? 'Chercher un groove…' : 'Chercher un accord…'}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </nav>

      {(nowPlaying.drum || nowPlaying.chords) && (
        <div className="transport">
          <span className="transport-light" aria-hidden="true" />
          <span className="transport-what">
            {nowPlaying.drum?.name ?? '—'}
            <span className="transport-plus">+</span>
            {nowPlaying.chords?.name ?? '—'}
          </span>
          <span className="transport-meta">
            {transport.bpm} BPM
            {transport.swing > 0.505 && ` · swing ${Math.round(transport.swing * 100)} %`}
          </span>
          <button type="button" className="stop-all" onClick={stopAll}>
            ■ Stop <kbd>Échap</kbd>
          </button>
        </div>
      )}

      {showLegend && <MidiLegend used={usedInstruments} />}

      {section === 'keyboard' && (
        <section className="keyboard-intro">
          <p>
            Trois octaves de Do à Do : les 37 touches du KeyStep. Les touches colorées sont celles à
            enfoncer, numérotées de la plus grave à la plus aiguë — la <strong>1</strong> est la
            fondamentale. Clique sur un schéma pour entendre l'accord, ou sur ▶ pour les faire
            défiler lentement, le temps de poser les doigts.
          </p>
          <p className="keyboard-intro-note">
            Les Do sont repérés sous le clavier. Si le rendu sonne trop grave ou trop aigu sur ta
            machine, c'est l'octave du clavier qu'il faut décaler, pas les touches : les positions
            restent les mêmes.
          </p>
        </section>
      )}

      <main className="library">
        {section === 'keyboard'
          ? visible.map((progression) => (
              <KeyboardCard key={progression.id} progression={progression} transpose={transpose} />
            ))
          : section === 'drums'
          ? visible.map((pattern) => (
              <PatternCard
                key={pattern.id}
                pattern={pattern}
                isPlaying={playing.drum === pattern.id}
                playhead={playhead}
                isEdited={edited.has(pattern.id)}
                ruler={ruler}
                onTogglePlay={(item) => togglePlay('drum', item)}
                onChange={updatePattern}
                onReset={resetPattern}
              />
            ))
          : visible.map((progression) => (
              <ChordCard
                key={progression.id}
                progression={progression}
                transpose={transpose}
                isPlaying={playing.chords === progression.id}
                playhead={playhead}
                ruler={ruler}
                onTogglePlay={(item) => togglePlay('chords', item)}
                onChange={updateProgression}
              />
            ))}
        {visible.length === 0 && <p className="empty">Rien ne correspond à cette recherche.</p>}
      </main>

      <footer className="colophon">
        <p>
          Batterie en General MIDI canal 10, accords sur le canal 1 avec leur vraie durée — chaque
          ligne porte son nom de note, et le bouton <strong>Mapping MIDI</strong> affiche la table
          complète. Tempo et swing sont écrits dans le fichier.
        </p>
        <p>
          Les progressions sont écrites avec <strong>La</strong> pour fondamentale de référence ; le
          sélecteur <strong>La →</strong> transpose l'affichage et l'export. C'est une
          transposition, pas un choix de tonalité : une progression en La mineur amenée sur Do
          devient du Do mineur.
        </p>
        {ruler === 'mpc' && (
          <p>
            Positions au format <code>mesure.temps.tick</code> de la MPC, à 960 ticks par temps —
            240 par double-croche. Sur un groove shufflé, les notes exportées ne tombent pas sur ces
            positions rondes : c'est le swing, pas une erreur.
          </p>
        )}
        <p>
          <code>X</code> accent · <code>x</code> normal · <code>o</code> ghost note · alt-clic pour
          effacer.
        </p>
      </footer>
    </div>
  )
}
