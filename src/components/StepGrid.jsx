import { INSTRUMENTS, INSTRUMENT_BY_ID, noteName } from '../data/instruments.js'
import { VELOCITY, mpcBarBeat, mpcPosition, nextVelocity } from '../lib/pattern.js'
import { triggerVoice } from '../lib/audio.js'

const VELOCITY_CLASS = {
  [VELOCITY.OFF]: 'off',
  [VELOCITY.GHOST]: 'ghost',
  [VELOCITY.NORMAL]: 'normal',
  [VELOCITY.ACCENT]: 'accent',
}

const VELOCITY_LABEL = {
  [VELOCITY.OFF]: 'silence',
  [VELOCITY.GHOST]: 'ghost note',
  [VELOCITY.NORMAL]: 'coup normal',
  [VELOCITY.ACCENT]: 'accent',
}

export default function StepGrid({ pattern, playhead, ruler, onToggleCell, onClearTrack, onRemoveTrack, onAddTrack }) {
  const mpc = ruler === 'mpc'
  const stepIndexes = Array.from({ length: pattern.steps }, (_, index) => index)
  const usedIds = new Set(pattern.tracks.map((track) => track.instrument))
  const available = INSTRUMENTS.filter((instrument) => !usedIds.has(instrument.id))

  return (
    <div className="grid-scroll">
      <div className={`grid${mpc ? ' mpc' : ''}`} style={{ '--steps': pattern.steps }}>
        <div className="grid-row grid-ruler">
          <div className="grid-label" aria-hidden="true" />
          {stepIndexes.map((step) => (
            <div
              key={step}
              className={`ruler-cell${step % 4 === 0 ? ' beat' : ''}${step % 16 === 0 ? ' bar' : ''}${step === playhead ? ' playing' : ''}`}
            >
              {step % 4 === 0 ? (mpc ? mpcBarBeat(step) : step / 4 + 1) : ''}
            </div>
          ))}
        </div>

        {pattern.tracks.map((track) => {
          const instrument = INSTRUMENT_BY_ID[track.instrument]
          return (
            <div className="grid-row" key={track.instrument}>
              <div className="grid-label">
                <button
                  type="button"
                  className="audition"
                  style={{ '--accent': instrument.color }}
                  onClick={() => triggerVoice(track.instrument, VELOCITY.ACCENT)}
                  title={`Écouter ${instrument.label} — note MIDI ${instrument.note} (${noteName(instrument.note)})`}
                >
                  {instrument.short}
                </button>
                {/* Le nom de note laisse la place aux actions au survol : c'est
                    lui qu'on lit en face du piano roll du DAW. */}
                <span className="grid-note">{noteName(instrument.note)}</span>
                <span className="grid-label-actions">
                  <button type="button" onClick={() => onClearTrack(track.instrument)} title="Vider la ligne">
                    ⌫
                  </button>
                  <button type="button" onClick={() => onRemoveTrack(track.instrument)} title="Supprimer la ligne">
                    ×
                  </button>
                </span>
              </div>

              {track.cells.map((velocity, step) => (
                <button
                  type="button"
                  key={step}
                  className={`cell ${VELOCITY_CLASS[velocity]}${step % 4 === 0 ? ' beat' : ''}${step % 16 === 0 ? ' bar' : ''}${step === playhead ? ' playing' : ''}`}
                  style={{ '--accent': instrument.color }}
                  aria-label={`${instrument.label}, pas ${step + 1} (${mpcPosition(step)}) : ${VELOCITY_LABEL[velocity]}`}
                  title={mpcPosition(step)}
                  onClick={(event) => {
                    // Alt-clic (ou clic droit) efface directement la case.
                    const value = event.altKey ? VELOCITY.OFF : nextVelocity(velocity)
                    onToggleCell(track.instrument, step, value)
                    if (value !== VELOCITY.OFF) triggerVoice(track.instrument, value)
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    onToggleCell(track.instrument, step, VELOCITY.OFF)
                  }}
                />
              ))}
            </div>
          )
        })}

        {available.length > 0 && (
          <div className="grid-row grid-add">
            <div className="grid-label">
              <select
                value=""
                onChange={(event) => {
                  if (event.target.value) onAddTrack(event.target.value)
                }}
                aria-label="Ajouter un instrument"
              >
                <option value="">+ piste</option>
                {available.map((instrument) => (
                  <option key={instrument.id} value={instrument.id}>
                    {instrument.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
