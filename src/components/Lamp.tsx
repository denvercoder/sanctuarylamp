import { type CSSProperties } from 'react'

/**
 * The sanctuary lamp.
 *
 * Red glass, always — see docs/COLOR.md. Brightness comes from one number, `lumen`,
 * whose floor is 0.25; it reaches 0 only during the Triduum, when the Church herself
 * extinguishes the lamp because the tabernacle is empty.
 *
 * Inline SVG and CSS only: no canvas, no animation library, a handful of composited
 * layers, and nothing running per frame in JavaScript.
 */
export function Lamp({
  lumen, size = 240, extinguished = false, className,
}: {
  lumen: number
  size?: number
  extinguished?: boolean
  className?: string
}) {
  const l = extinguished ? 0 : Math.max(0, Math.min(1, lumen))
  const style = { '--l': l, width: size, height: size * 1.35 } as CSSProperties

  return (
    <svg
      className={`lamp${extinguished ? ' lamp--out' : ''}${className ? ` ${className}` : ''}`}
      viewBox="0 0 200 270"
      style={style}
      role="img"
      aria-label={extinguished
        ? 'The sanctuary lamp is extinguished; the tabernacle is empty.'
        : 'The sanctuary lamp is burning.'}
    >
      <defs>
        <radialGradient id="bloom" cx="50%" cy="62%" r="50%">
          <stop offset="0%" stopColor="#F2A15A" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#C24A32" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#8E2B20" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="core" cx="50%" cy="72%" r="50%">
          <stop offset="0%" stopColor="#FFF3D0" />
          <stop offset="55%" stopColor="#F2A15A" />
          <stop offset="100%" stopColor="#C24A32" stopOpacity="0.1" />
        </radialGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#5E1611" />
          <stop offset="38%" stopColor="#A33124" />
          <stop offset="62%" stopColor="#8E2B20" />
          <stop offset="100%" stopColor="#4E120E" />
        </linearGradient>
        <linearGradient id="brass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6E5838" />
          <stop offset="40%" stopColor="#D8B87C" />
          <stop offset="70%" stopColor="#B08D57" />
          <stop offset="100%" stopColor="#5E4A2E" />
        </linearGradient>
        <filter id="soft" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id="softer" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="22" />
        </filter>
      </defs>

      {/* The glow thrown onto the surrounding darkness. Scales with lumen. */}
      <g className="lamp__glow" filter="url(#softer)">
        <ellipse cx="100" cy="176" rx="86" ry="92" fill="url(#bloom)" />
      </g>

      {/* Suspension: chain, then the brass crown. */}
      <g stroke="url(#brass)" strokeWidth="2.2" fill="none" opacity="0.9">
        <path d="M100 2 V44" />
        <ellipse cx="100" cy="48" rx="5" ry="7" />
        <path d="M100 55 V70" />
      </g>
      <path d="M62 78 H138 L126 92 H74 Z" fill="url(#brass)" opacity="0.95" />
      <g stroke="url(#brass)" strokeWidth="2" fill="none" opacity="0.8">
        <path d="M74 92 Q100 104 126 92" />
      </g>

      {/* The flame sits BEHIND the glass, because that is how you see a sanctuary
          lamp: the fire is inside the vessel and the red glass tints it. */}
      <g className="lamp__flame">
        <ellipse className="lamp__halo" cx="100" cy="152" rx="34" ry="44"
                 fill="url(#bloom)" filter="url(#soft)" />
        {/* Two nested groups because two animations both drive `transform`: on one
            element the later declaration silently wins, so they must compose through
            the DOM instead. Outer = the occasional gutter, inner = the constant play. */}
        <g className="lamp__gutter">
          <path className="lamp__core"
                d="M100 104 Q120 136 114 162 Q108 184 100 188 Q92 184 86 162 Q80 136 100 104 Z"
                fill="url(#core)" />
        </g>
        <ellipse cx="100" cy="170" rx="8" ry="13" fill="#FFF6DC" opacity="0.95" />
      </g>

      {/* The red glass vessel, translucent so the fire reads through it.
          Never any other colour — see docs/COLOR.md. */}
      <path
        className="lamp__glass"
        d="M72 96 Q64 150 78 196 Q100 224 122 196 Q136 150 128 96 Z"
        fill="url(#glass)"
        fillOpacity="0.74"
      />
      {/* The light the flame throws onto the inside of the glass. */}
      <ellipse className="lamp__inner" cx="100" cy="156" rx="30" ry="52"
               fill="url(#core)" opacity="0.42" filter="url(#soft)" />
      {/* Specular highlight. */}
      <path d="M82 104 Q76 150 86 190" stroke="#F0A98F" strokeWidth="3.4"
            fill="none" opacity="0.32" strokeLinecap="round" />
      <path d="M118 108 Q124 150 116 186" stroke="#5E1611" strokeWidth="5"
            fill="none" opacity="0.4" strokeLinecap="round" />

      {/* The rim of the vessel. */}
      <ellipse cx="100" cy="96" rx="28" ry="6" fill="url(#brass)" opacity="0.95" />

      {/* The wick, which remains when the fire does not. */}
      <path d="M100 196 V206" stroke="#3A2E26" strokeWidth="2.4" strokeLinecap="round" />

      {/* Base. */}
      <path d="M84 206 Q100 216 116 206 L112 214 H88 Z" fill="url(#brass)" opacity="0.9" />
      <path d="M100 214 V236" stroke="url(#brass)" strokeWidth="2" opacity="0.7" />
      <ellipse cx="100" cy="240" rx="7" ry="4" fill="url(#brass)" opacity="0.8" />
    </svg>
  )
}
