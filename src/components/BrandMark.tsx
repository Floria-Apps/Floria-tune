import { useId } from "react";

/**
 * Floria Tune brand mark: dark rounded tile, crimson petal bloom, coral play
 * button and a teal leaf. Rendered inline so it stays crisp at any size and
 * inherits no external request.
 */
export function BrandMark({ className }: { className?: string }) {
  // Gradient ids must be unique: the mark is mounted more than once (sidebar
  // and top bar) and duplicate ids would collide in the same document.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const background = `brand-bg-${uid}`;
  const play = `brand-play-${uid}`;
  const core = `brand-core-${uid}`;

  return (
    <svg
      viewBox="0 0 512 512"
      role="presentation"
      focusable="false"
      className={className}
      width="100%"
      height="100%"
    >
      <defs>
        <radialGradient
          id={background}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(256 256) scale(256)"
        >
          <stop stopColor="#2C1720" />
          <stop offset="1" stopColor="#120A0D" />
        </radialGradient>
        <linearGradient
          id={core}
          x1="236"
          y1="236"
          x2="276"
          y2="276"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FB7185" />
          <stop offset="1" stopColor="#E11D48" />
        </linearGradient>
        <linearGradient
          id={play}
          x1="211"
          y1="164"
          x2="386.814"
          y2="292.683"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FB7185" />
          <stop offset="1" stopColor="#E11D48" />
        </linearGradient>
      </defs>

      <rect width="512" height="512" rx="112" fill={`url(#${background})`} />

      {/* Speaker core. */}
      <path
        d="M256 276C267.046 276 276 267.046 276 256C276 244.954 267.046 236 256 236C244.954 236 236 244.954 236 256C236 267.046 244.954 276 256 276Z"
        fill={`url(#${core})`}
      />

      {/* Petal bloom. */}
      <path
        opacity="0.6"
        d="M255.996 136C315.996 186 315.996 326 255.996 376C195.996 326 195.996 186 255.996 136ZM256 224C238.327 224 224 238.327 224 256C224 273.673 238.327 288 256 288C273.673 288 288 273.673 288 256C288 238.327 273.673 224 256 224Z"
        fill="#881337"
      />
      <path
        opacity="0.6"
        d="M195.997 152.076C272.959 165.377 342.958 286.621 315.997 359.922C239.036 346.62 169.036 225.377 195.997 152.076ZM255.999 224C238.326 224 223.999 238.327 223.999 256C223.999 273.673 238.326 288 255.999 288C273.672 288 287.999 273.673 287.999 256C287.999 238.327 273.672 224 255.999 224Z"
        fill="#881337"
      />
      <path
        opacity="0.6"
        d="M316.001 152.076C342.962 225.377 272.963 346.621 196.001 359.922C169.04 286.621 239.04 165.378 316.001 152.076ZM255.999 224C238.326 224 223.999 238.327 223.999 256C223.999 273.673 238.326 288 255.999 288C273.672 288 287.999 273.673 287.999 256C287.999 238.327 273.672 224 255.999 224Z"
        fill="#881337"
      />
      <path
        opacity="0.6"
        d="M152.078 196.001C225.379 169.04 346.622 239.04 359.924 316.001C286.623 342.962 165.379 272.963 152.078 196.001ZM256.002 224.001C238.329 224.001 224.002 238.328 224.002 256.001C224.002 273.674 238.329 288.001 256.002 288.001C273.675 288.001 288.002 273.674 288.002 256.001C288.002 238.328 273.675 224.001 256.002 224.001Z"
        fill="#881337"
      />
      <path
        opacity="0.6"
        d="M152.078 316.001C165.38 239.04 286.623 169.04 359.924 196.001C346.623 272.962 225.379 342.962 152.078 316.001ZM256.002 224.001C238.329 224.001 224.002 238.328 224.002 256.001C224.002 273.674 238.329 288.001 256.002 288.001C273.675 288.001 288.002 273.674 288.002 256.001C288.002 238.328 273.675 224.001 256.002 224.001Z"
        fill="#881337"
      />

      {/* Teal leaf. */}
      <path
        opacity="0.6"
        d="M136.004 256C186.004 196 326.004 196 376.004 256C326.004 316 186.004 316 136.004 256ZM256 224C238.327 224 224 238.327 224 256C224 273.673 238.327 288 256 288C273.673 288 288 273.673 288 256C288 238.327 273.673 224 256 224Z"
        fill="#10B981"
      />

      {/* Play button. */}
      <path
        d="M211 186.223C211 166.223 236 156.223 256 171.223L331 226.223C351 241.223 351 271.223 331 286.223L256 341.223C236 356.222 211 346.222 211 326.223V186.223ZM256 224C238.327 224 224 238.327 224 256C224 273.673 238.327 288 256 288C273.673 288 288 273.673 288 256C288 238.327 273.673 224 256 224Z"
        fill={`url(#${play})`}
      />
    </svg>
  );
}
