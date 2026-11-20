/**
 * A hilal is a circle with a second, offset circle cut out of it: both cusps then come out
 * identical and needle-sharp, and the inner edge stays a true arc instead of drifting.
 * `cut` and `offset` are fractions of the outer radius; `tilt` turns the opening up-right.
 */
export function crescentPath(
  cx: number,
  cy: number,
  radius: number,
  { cut = 0.88, offset = 0.36, tilt = -26 } = {},
) {
  const inner = radius * cut;
  const shift = radius * offset;
  const x = (shift * shift + radius * radius - inner * inner) / (2 * shift);
  const y = Math.sqrt(radius * radius - x * x);
  const angle = (tilt * Math.PI) / 180;
  const at = (px: number, py: number) =>
    `${(cx + px * Math.cos(angle) - py * Math.sin(angle)).toFixed(2)} ` +
    `${(cy + px * Math.sin(angle) + py * Math.cos(angle)).toFixed(2)}`;
  const top = at(x, -y);
  // Outer rim the long way round, then the cut-out circle back across the two cusps.
  return `M${top}A${radius} ${radius} 0 1 0 ${at(x, y)}A${inner} ${inner} 0 1 1 ${top}Z`;
}
