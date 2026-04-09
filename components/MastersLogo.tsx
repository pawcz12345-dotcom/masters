export function MastersLogoMark({ size = 52 }: { size?: number }) {
  return (
    <img
      src="/masters-logo.png"
      alt="The Masters Tournament"
      height={size}
      style={{ height: size, width: 'auto' }}
    />
  );
}
