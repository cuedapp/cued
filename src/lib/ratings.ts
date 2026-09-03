export function formatScoreOutOfTen(value: number, scale = 100) {
  return ((value / scale) * 10).toFixed(1);
}

export function formatPercentage(value: number, scale = 100) {
  return `${Math.round((value / scale) * 100)}%`;
}
