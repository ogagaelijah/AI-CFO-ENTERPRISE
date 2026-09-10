export function mapHorizons(raw = {}) {
  const data = raw.data || {};
  const labels = raw.labels || {};
  return Object.keys(data).map((key) => ({
    value: key,
    days: data[key],
    label: labels[key] || key,
  }));
}