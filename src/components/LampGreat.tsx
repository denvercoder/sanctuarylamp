import { type CSSProperties } from 'react'

/**
 * The great lamp — Recollection on a large screen.
 *
 * The compact lamp is drawn for a 200px header slot, where detail would only turn to
 * mush. On a desktop that same drawing floats in the middle of an enormous dark room
 * doing nothing, so this is a different object rather than the same one scaled up: a
 * proper hanging sanctuary lamp, suspended on three chains from a ceiling canopy, with
 * a faceted red glass vessel, the float and wick visible inside it, and the fire lighting
 * the brass from within.
 *
 * Still just SVG and CSS. No canvas, no WebGL, no animation library.
 */

const CHAIN_LINKS = 14

export function LampGreat({
  lumen, extinguished = false,
}: { lumen: number; extinguished?: boolean }) {
  const l = extinguished ? 0 : Math.max(0, Math.min(1, lumen))
  const style = { '--l': l } as CSSProperties

  // The upper chain, drawn as interlocking links rather than a line.
  const links = Array.from({ length: CHAIN_LINKS }, (_, i) => {
    const y = 36 + i * 15
    const edgeOn = i % 2 === 1
    return (
      <ellipse
        key={i}
        cx={200} cy={y}
        rx={edgeOn ? 2.4 : 7} ry={9}
        className={edgeOn ? 'gl-rod gl-chain--edge' : 'gl-chain'}
      />
    )
  })

  return (
    <svg
      className={`lamp-great${extinguished ? ' lamp-great--out' : ''}`}
      viewBox="0 0 400 940"
      style={style}
      role="img"
      aria-label={extinguished
        ? 'The sanctuary lamp is extinguished; the tabernacle is empty.'
        : 'The sanctuary lamp is burning.'}
    >
      <defs>
        <radialGradient id="gl-room" cx="50%" cy="56%" r="50%">
          <stop offset="0%" stopColor="#E08A4E" stopOpacity="0.5" />
          <stop offset="38%" stopColor="#B4402A" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#5E1611" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="gl-bloom" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD08A" stopOpacity="0.95" />
          <stop offset="40%" stopColor="#E8823F" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#B4402A" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="gl-flame2" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#FFFBEC" />
          <stop offset="30%" stopColor="#FFE099" />
          <stop offset="70%" stopColor="#F0913F" />
          <stop offset="100%" stopColor="#C2472C" />
        </linearGradient>
        {/* The base of a real flame is blue where combustion is cleanest. */}
        <radialGradient id="gl-blue" cx="50%" cy="72%" r="55%">
          <stop offset="0%" stopColor="#8FB8E8" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#8FB8E8" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="gl-glass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4A1009" />
          <stop offset="14%" stopColor="#7E2318" />
          <stop offset="32%" stopColor="#C4432F" />
          <stop offset="50%" stopColor="#9B2E21" />
          <stop offset="68%" stopColor="#C4432F" />
          <stop offset="86%" stopColor="#6B1C13" />
          <stop offset="100%" stopColor="#3E0D07" />
        </linearGradient>
        <linearGradient id="gl-brass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4A3A22" />
          <stop offset="18%" stopColor="#9A7C4A" />
          <stop offset="38%" stopColor="#EFD9A0" />
          <stop offset="55%" stopColor="#C2A066" />
          <stop offset="76%" stopColor="#8A6E40" />
          <stop offset="100%" stopColor="#40321D" />
        </linearGradient>
        <linearGradient id="gl-brass-v" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#E3C88C" />
          <stop offset="55%" stopColor="#A8874F" />
          <stop offset="100%" stopColor="#5B4728" />
        </linearGradient>

        <filter id="gl-soft" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id="gl-softer" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="46" />
        </filter>
        <filter id="gl-tiny" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
      </defs>

      {/* The light thrown into the room. */}
      <g className="gl-room" filter="url(#gl-softer)">
        <ellipse cx="200" cy="560" rx="200" ry="290" fill="url(#gl-room)" />
      </g>

      {/* Ceiling canopy and chain */}
      <g className="gl-metal">
        <path d="M168 10 H232 L224 30 H176 Z" fill="url(#gl-brass)" />
        <ellipse cx="200" cy="31" rx="24" ry="5" fill="url(#gl-brass-v)" />
        {links}
      </g>

      {/* Gathering ring, where the three chains meet */}
      <g className="gl-metal">
        <ellipse cx="200" cy="252" rx="17" ry="6" fill="none"
                 stroke="url(#gl-brass)" strokeWidth="5" />
        {/* Three chains splaying to the vessel's rim */}
        <path d="M188 256 L118 430" className="gl-strand" />
        <path d="M212 256 L282 430" className="gl-strand" />
        <path d="M200 258 L200 424" className="gl-rod gl-strand--back" strokeWidth="3.2" />
      </g>

      {/* The vessel's brass collar and scrollwork */}
      <g className="gl-metal">
        <path d="M104 432 Q200 462 296 432 L292 452 Q200 482 108 452 Z" fill="url(#gl-brass)" />
        <ellipse cx="200" cy="437" rx="96" ry="17" fill="url(#gl-brass-v)" opacity="0.85" />
        <ellipse cx="200" cy="437" rx="78" ry="12" fill="#1A120C" opacity="0.55" />
        {/* Scrollwork brackets at the three chain points */}
        <path d="M118 430 q-14 14 -4 30 q12 14 26 4" className="gl-scroll" />
        <path d="M282 430 q14 14 4 30 q-12 14 -26 4" className="gl-scroll" />
      </g>

      {/* ── The fire ───────────────────────────────────────────────────────── */}
      {/* Drawn BEHIND the glass: the fire is inside the vessel and the red
          glass tints it, which is how a sanctuary lamp actually reads. */}
      <g className="gl-fire">
        <ellipse className="gl-halo" cx="200" cy="596" rx="86" ry="120"
                 fill="url(#gl-bloom)" filter="url(#gl-soft)" />
        <g className="gl-gutter">
          <g className="gl-sway">
            <path className="gl-body"
                  d="M200 452
                     Q262 540 248 614
                     Q236 668 200 690
                     Q164 668 152 614
                     Q138 540 200 452 Z"
                  fill="url(#gl-flame2)" />
            <path className="gl-inner"
                  d="M200 536 Q226 584 219 622 Q212 652 200 664 Q188 652 181 622 Q174 584 200 536 Z"
                  fill="#FFFBEC" opacity="0.92" filter="url(#gl-tiny)" />
            <ellipse className="gl-blue" cx="200" cy="664" rx="26" ry="30" fill="url(#gl-blue)" />
          </g>
        </g>
      </g>

      {/* ── The red glass ──────────────────────────────────────────────────── */}
      <g className="gl-glass-group">
        <path
          className="gl-glass"
          d="M110 452
             Q98 574 128 664
             Q160 730 200 742
             Q240 730 272 664
             Q302 574 290 452
             Q200 482 110 452 Z"
          fill="url(#gl-glass)"
          fillOpacity="0.72"
        />
        {/* Facets: a moulded glass cup catches light in vertical bands. */}
        <g className="gl-facets">
          <path d="M143 470 Q134 580 160 668" />
          <path d="M172 478 Q166 586 186 700" />
          <path d="M228 478 Q234 586 214 700" />
          <path d="M257 470 Q266 580 240 668" />
        </g>
        {/* The fire's light on the inside of the glass. */}
        <ellipse className="gl-innerlight" cx="200" cy="600" rx="74" ry="126"
                 fill="url(#gl-bloom)" filter="url(#gl-soft)" />
        {/* Specular edge and the shadowed side. */}
        <path className="gl-spec" d="M132 470 Q120 578 148 660" />
        <path className="gl-shadow" d="M268 470 Q280 578 252 660" />
        <ellipse cx="200" cy="455" rx="90" ry="15" fill="#2A0C07" opacity="0.5" />
      </g>

      {/* The float and wick, riding on the oil inside the glass. */}
      <g className="gl-float">
        <ellipse cx="200" cy="692" rx="34" ry="8" fill="#3A2A18" opacity="0.85" />
        <ellipse cx="200" cy="689" rx="34" ry="8" fill="url(#gl-brass-v)" opacity="0.6" />
        <path d="M200 684 V698" className="gl-wick" />
      </g>

      {/* Base finial */}
      <g className="gl-metal">
        <path d="M168 738 Q200 756 232 738 L224 760 Q200 772 176 760 Z" fill="url(#gl-brass)" />
        <path d="M200 770 V808" className="gl-rod" strokeWidth="5" />
        <ellipse cx="200" cy="816" rx="17" ry="9" fill="url(#gl-brass-v)" />
        <path d="M200 824 L200 854" className="gl-rod" strokeWidth="3" opacity="0.7" />
        <circle cx="200" cy="862" r="7" fill="url(#gl-brass-v)" />
      </g>
    </svg>
  )
}
