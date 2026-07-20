export type Photo = {
  uri: string
  fullUri: string
  largeUri?: string | null
  date: string
  id: string
  favorite: boolean
  tags: string[]
  blurred: boolean
  private: boolean
  mimeType: string
}

export type ListItem =
  | { type: 'header'; date: string; key: string; photoIds: string[] }
  | { type: 'photo'; photo: Photo; key: string }

export function flattenWithHeaders(photos: Photo[]): ListItem[] {
  const groups: { [date: string]: Photo[] } = {}
  photos.forEach(p => {
    if (!groups[p.date]) groups[p.date] = []
    groups[p.date].push(p)
  })
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a))

  const items: ListItem[] = []
  sortedDates.forEach(date => {
    const dayPhotos = groups[date]
    items.push({
      type: 'header',
      date,
      key: `header-${date}`,
      photoIds: dayPhotos.map(p => p.id),
    })
    dayPhotos.forEach(photo => {
      items.push({ type: 'photo', photo, key: photo.id })
    })
  })
  return items
}

export function dateRange(
  start?: string | null,
  end?: string | null,
): { dateFrom?: string; dateTo?: string } {
  if (!start && !end) return {}
  return {
    dateFrom: start ? new Date(start + 'T00:00:00').toISOString() : undefined,
    dateTo: end ? new Date(end + 'T23:59:59').toISOString() : undefined,
  }
}
