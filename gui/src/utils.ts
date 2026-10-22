export function capitalizeFirstLetter(val: string) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

export const formatLocalDateTime = (utcString: string): string => {
  const date = new Date(utcString.endsWith('Z') || utcString.includes('+') ? utcString : utcString + 'Z')
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${day}.${month}.${year}, ${hours}:${minutes}`
}

export const formatDuration = (durationSeconds: number): string => {
  const seconds = Math.max(0, Math.round(Number.isFinite(durationSeconds) ? durationSeconds : 0))
  if (seconds < 60) return `${seconds} s`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ${seconds % 60} s`

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes ? `${hours} h ${remainingMinutes} min` : `${hours} h`
}