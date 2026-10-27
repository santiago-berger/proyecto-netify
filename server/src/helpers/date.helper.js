// YYYY-MM-DD using the server's local time (toISOString uses UTC and shifts the day at night)
export const toLocalISODate = (date) => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

export const addDays = (date, days) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

export const getCurrentPeriod = () => {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
};

// first and last day (YYYY-MM-DD) of a month
export const getMonthRange = (month, year) => ({
  start: toLocalISODate(new Date(year, month - 1, 1)),
  end: toLocalISODate(new Date(year, month, 0)),
});
