// Colour hint only, using common reference points: below 70 is low, above 180 is high.
function level(value) {
  if (value < 70) return 'low';
  if (value > 180) return 'high';
  return 'normal';
}

export default function ValueBadge({ value }) {
  return <span className={`badge badge-${level(value)}`}>{value} mg/dl</span>;
}
