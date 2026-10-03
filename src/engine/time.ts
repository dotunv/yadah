/**
 * Yadah keeps hours. It is not locked: you can always wake it. But at night
 * it is half asleep, and in the small hours it is asleep, and that is a
 * place you arrive at, not an error.
 */

/** 0 (day) .. 1 (deep night), from the hour of the day (0..24). */
export function night(hour: number): number {
  const h = ((hour % 24) + 24) % 24
  if (h >= 7 && h < 21) return 0
  if (h >= 21 && h < 23) return ((h - 21) / 2) * 0.55
  if (h >= 23) return 0.55 + (h - 23) * 0.45
  if (h < 5) return 1
  return 1 - (h - 5) / 2
}

export const isAsleep = (n: number) => n > 0.9

export const hourNow = () => {
  const d = new Date()
  return d.getHours() + d.getMinutes() / 60
}
