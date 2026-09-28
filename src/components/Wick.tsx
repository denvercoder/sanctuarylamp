import type { CompletionState } from '../lib/rule/types'

/**
 * The checkbox, which is a wick.
 *
 * Unlit is a bare wick; kept is a lit one; excused is a wick set aside, drawn as a dashed
 * stem. There are no checkmarks in this application and nothing ever turns green.
 */
export function Wick({
  state, onClick, label,
}: { state?: CompletionState; onClick: () => void; label: string }) {
  const cls = state === 'kept' ? 'wick wick--kept'
    : state === 'excused' ? 'wick wick--excused'
    : 'wick'
  return (
    <button
      type="button" className={cls} onClick={onClick}
      aria-pressed={state === 'kept'}
      aria-label={
        state === 'kept' ? `${label} — kept`
        : state === 'excused' ? `${label} — excused`
        : state === 'noted' ? `${label} — noted`
        : label
      }
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {/* Unlit: a bare wick in a ring, so it reads as something you can light. */}
        <circle className="wick__ring" cx="12" cy="11" r="8.5" />
        <g className="wick__fire">
          <ellipse cx="12" cy="10" rx="7" ry="9" fill="#C24A32" opacity="0.38" />
          <path d="M12 2.5 Q16.5 9 15 13.2 Q13.4 16.4 12 17 Q10.6 16.4 9 13.2 Q7.5 9 12 2.5 Z"
                fill="#F2A15A" />
          <ellipse cx="12" cy="14" rx="1.9" ry="2.9" fill="#FFF6DC" />
        </g>
        <path className="wick__stem" d="M12 16.5 V21" />
      </svg>
    </button>
  )
}
