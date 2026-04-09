// Reproduction of the Masters Tournament logo:
// Yellow US map, red flag in Georgia, dark green italic serif "MASTERS" text.
// No circle — transparent background, wider-than-tall aspect ratio.

const US_PATH =
  // NW Washington, east along northern border
  'M 2,18 L 11,15 L 23,13 L 34,13 ' +
  // Great Lakes notch (MN → Lake Superior bump → Upper Michigan peninsula)
  'L 39,12 L 42,11 L 46,13 L 48,11 L 50,13 L 53,12 ' +
  // New England / Maine
  'L 62,11 L 69,10 ' +
  // Cape Cod bump, East Coast heading south
  'L 71,16 L 69,17 L 67,20 L 67,23 L 65,26 L 64,29 L 62,31 ' +
  // Florida peninsula
  'L 59,33 L 61,38 L 60,44 L 57,50 L 54,46 L 51,34 ' +
  // Gulf Coast, Mississippi delta
  'L 47,35 L 43,38 L 38,38 ' +
  // Texas
  'L 33,38 L 28,41 L 24,47 L 21,44 ' +
  // Southwest states, California coast heading north
  'L 18,41 L 14,38 L 10,37 L 7,32 L 5,23 L 5,16 ' +
  // Washington coast back to start
  'L 6,14 Z';

export function MastersLogoMark({ size = 52 }: { size?: number }) {
  // Natural aspect ratio: 105 wide × 65 tall
  const height = size;
  const width = Math.round(size * 105 / 65);

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 105 65"
      fill="none"
      aria-label="The Masters Tournament"
    >
      {/* US map depth shadow */}
      <path d={US_PATH} fill="#B8900A" transform="translate(0.8,1.2)" opacity="0.45" />

      {/* US map — gold fill */}
      <path d={US_PATH} fill="#F0BE18" />

      {/* Flagstick in Georgia */}
      <line x1="63" y1="31" x2="63" y2="19" stroke="white" strokeWidth="1.3" strokeLinecap="round" />

      {/* Flag — red */}
      <path d="M 63,19 L 70,22 L 63,25 Z" fill="#C41E1E" />

      {/* "THE" — tiny, dark green, spaced */}
      <text
        x="52" y="55"
        textAnchor="middle"
        fill="#1c4932"
        fontSize="5.5"
        fontFamily="Georgia, 'Times New Roman', serif"
        letterSpacing="2"
      >THE</text>

      {/* "MASTERS" — large italic green serif, matching the real wordmark */}
      <text
        x="52" y="64"
        textAnchor="middle"
        fill="#006747"
        fontSize="14"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontStyle="italic"
        fontWeight="600"
        letterSpacing="0.5"
      >MASTERS</text>
    </svg>
  );
}
