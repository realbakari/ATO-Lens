export function describeObservedChange(
  label: string,
  earlier: number,
  later: number
): string {
  const difference = later - earlier;
  if (difference === 0) {
    return `${label} was unchanged at $${later.toLocaleString()}.`;
  }
  const direction = difference > 0 ? 'increased' : 'decreased';
  const percentage =
    earlier === 0 ? '' : ` (${Math.abs((difference / earlier) * 100).toFixed(1)}%)`;
  return `${label} ${direction} by $${Math.abs(difference).toLocaleString()}${percentage}, from $${earlier.toLocaleString()} to $${later.toLocaleString()}.`;
}
