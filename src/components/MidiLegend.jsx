import { INSTRUMENTS, noteName } from '../data/instruments.js'
import { triggerVoice } from '../lib/audio.js'
import { VELOCITY } from '../lib/pattern.js'

// Table de correspondance pad / note / instrument. C'est la réponse à la
// question qu'on se pose une fois le fichier déposé dans le DAW : « ce pad,
// c'est quel son ? »
export default function MidiLegend({ used }) {
  return (
    <section className="legend" aria-label="Mapping MIDI">
      <p className="legend-intro">
        Export General MIDI sur le <strong>canal 10</strong>. Les noms de notes suivent la convention
        où le do central (60) s'appelle C3 — celle d'Ableton, Logic et Cubase. Sous FL Studio, les
        mêmes notes s'affichent deux octaves plus haut.
      </p>

      <ul className="legend-grid">
        {INSTRUMENTS.map((instrument) => (
          <li
            key={instrument.id}
            className={used?.has(instrument.id) ? 'in-use' : undefined}
            style={{ '--accent': instrument.color }}
          >
            <button
              type="button"
              onClick={() => triggerVoice(instrument.id, VELOCITY.ACCENT)}
              title={`Écouter ${instrument.label}`}
            >
              <span className="legend-note">{noteName(instrument.note)}</span>
              <span className="legend-name">{instrument.label}</span>
              <span className="legend-number">{instrument.note}</span>
            </button>
          </li>
        ))}
      </ul>

      {used && (
        <p className="legend-foot">
          Les entrées en surbrillance sont celles qu'utilisent les grooves affichés. Cliquer sur une
          ligne joue le son.
        </p>
      )}
    </section>
  )
}
