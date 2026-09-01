export function formatScoreOutOfTen(value: number, scale = 100) {
  return ((value / scale) * 10).toFixed(1);
}
