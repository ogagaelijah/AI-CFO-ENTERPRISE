// frontend/src/services/reportMappers/utils.js

export const today = () => new Date().toISOString().split('T')[0];

export const isValidData = (data) =>
  data && typeof data === 'object' && !Array.isArray(data);

export const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return isNaN(num) ? fallback : num;
};