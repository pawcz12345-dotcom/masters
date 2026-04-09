// Faithful reproduction of the Masters Tournament / Augusta National logo:
// yellow US map outline on Augusta green, red flagstick in Georgia, italic serif text.

const US_PATH =
  // NW Washington, east along northern border
  'M 10,22 L 18,20 L 28,18 L 37,18 ' +
  // Great Lakes notch (MN → Lake Superior bump → Upper Michigan)
  'L 41,17 L 44,16 L 47,18 L 49,16 L 51,18 L 53,17 ' +
  // New England / Maine
  'L 60,17 L 66,16 ' +
  // Cape Cod, East Coast south
  'L 67,22 L 65,23 L 63,26 L 62,28 L 62,30 L 61,32 L 59,34 L 57,36 ' +
  // Florida peninsula
  'L 58,39 L 57,44 L 55,50 L 53,46 L 50,38 ' +
  // Gulf Coast, Mississippi delta
  'L 47,40 L 43,43 L 39,43 ' +
  // Texas
  'L 35,43 L 30,45 L 27,49 L 24,46 ' +
  // Southwest, California coast
  'L 21,43 L 18,41 L 14,41 L 11,40 L 9,37 L 8,29 L 8,25 ' +
  // Washington coast back to start
  'L 9,22 Z';

export function MastersLogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      aria-label="The Masters Tournament"
    >
      {/* Augusta green background */}
      <circle cx="40" cy="40" r="39" fill="#004F38" />

      {/* US map — depth shadow */}
      <path d={US_PATH} fill="#003A2A" transform="translate(0.7,0.9)" />

      {/* US map — gold fill */}
      <path d={US_PATH} fill="#F0BE18" />

      {/* Flagstick in Georgia (SE quadrant of map) */}
      <line
        x1="58.5" y1="35"
        x2="58.5" y2="23"
        stroke="white"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Flag — red, pointing right off the stick */}
      <path d="M 58.5,23 L 64,25.5 L 58.5,28 Z" fill="#C41E1E" />

      {/* "THE" — small italic gold */}
      <text
        x="40" y="61"
        textAnchor="middle"
        fill="#F0BE18"
        fontSize="6"
        fontFamily="'Libre Franklin', 'BentonSans', Arial, Helvetica, sans-serif"
        fontStyle="normal"
        letterSpacing="2.5"
      >THE</text>

      {/* "MASTERS" — larger italic white */}
      <text
        x="40" y="72"
        textAnchor="middle"
        fill="white"
        fontSize="9.5"
        fontFamily="'Libre Franklin', 'BentonSans', Arial, Helvetica, sans-serif"
        fontStyle="normal"
        letterSpacing="1"
      >MASTERS</text>
    </svg>
  );
}
