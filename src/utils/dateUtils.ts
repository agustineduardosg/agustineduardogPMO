export function addBusinessDays(startDate: Date, days: number): Date {
  const result = new Date(startDate);
  let added = 0;
  
  // if days is 0, we still want to ensure the start date isn't a weekend (if strict),
  // but usually duration is at least 1. If 1, it ends on the same day it starts.
  // Standard PM duration: a 1-day task starting Monday ends Monday.
  // So we add (days - 1) business days to find the end date.
  let daysToAdd = Math.max(0, days - 1);

  while (added < daysToAdd) {
    result.setDate(result.getDate() + 1);
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      added++;
    }
  }
  return result;
}

export function differenceInBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  
  // To avoid infinite loops if dates are swapped
  const start = startDate <= endDate ? startDate : endDate;
  const end = startDate <= endDate ? endDate : startDate;
  
  current.setTime(start.getTime());

  while (current <= end) {
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}
