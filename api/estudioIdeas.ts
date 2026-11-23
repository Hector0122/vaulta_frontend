import { authenticatedGet, fetchPhotosPage, getPeople } from './client'
import { listDrafts, MAX_CAROUSEL } from './estudio'

// Ideas para publicar en Vaulta Estudio — solo usa datos que Vaulta ya tiene
// (fecha, favoritas, caras, nitidez). No usa tags ni IA. Ver PLAN_ESTUDIO.md.

export type Candidate = {
  id: string
  uri: string
  date: string
  blurred: boolean
  private: boolean
  mimeType: string
}

export type Idea = {
  key: string
  title: string
  subtitle: string
  coverUri: string
  photoIds: string[]
  caption: string
}

const BURST_MS = 60_000 // fotos a menos de 1 min = misma ráfaga

/**
 * Filtra y elige fotos para una publicación: sin borrosas, privadas, videos
 * ni fotos ya usadas en borradores, y solo una foto por ráfaga.
 */
export function pickForPost(
  photos: Candidate[],
  usedIds: Set<string>,
  max = MAX_CAROUSEL,
): Candidate[] {
  const ok = photos
    .filter(p => !p.blurred && !p.private && p.mimeType.startsWith('image/') && !usedIds.has(p.id))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
  const picked: Candidate[] = []
  let lastKept = -Infinity
  for (const p of ok) {
    const t = Date.parse(p.date)
    if (t - lastKept < BURST_MS) continue
    picked.push(p)
    lastKept = t
    if (picked.length === max) break
  }
  return picked
}

// En UTC porque photos/this-day compara mes/día de createdAt en UTC
function dayRange(year: number, month: number, day: number) {
  return {
    dateFrom: new Date(Date.UTC(year, month, day, 0, 0, 0)).toISOString(),
    dateTo: new Date(Date.UTC(year, month, day, 23, 59, 59)).toISOString(),
  }
}

async function fetchCandidates(opts: Parameters<typeof fetchPhotosPage>[0]): Promise<Candidate[]> {
  // shortcut: solo la primera página (100 fotos); suficiente para sugerir hasta 10
  const { photos } = await fetchPhotosPage({ maxKeys: 100, ...opts })
  return photos
}

function toIdea(
  key: string,
  title: string,
  subtitle: string,
  caption: string,
  picked: Candidate[],
): Idea | null {
  if (picked.length === 0) return null
  return { key, title, subtitle, caption, coverUri: picked[0].uri, photoIds: picked.map(p => p.id) }
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Carga todas las ideas. Una fuente que falla no tumba a las demás. */
export async function loadIdeas(): Promise<Idea[]> {
  const used = new Set(listDrafts().flatMap(d => d.photoIds))
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()
  const today = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  const sources: Promise<(Idea | null)[]>[] = [
    // 🕰️ Hace X años (mismo endpoint que Recuerdos)
    authenticatedGet<{ year: number; yearsAgo: number }[]>(`photos/this-day?date=${today}`).then(
      years =>
        Promise.all(
          years.slice(0, 3).map(async ({ year, yearsAgo }) => {
            const picked = pickForPost(await fetchCandidates(dayRange(year, m, d)), used)
            return toIdea(
              `tbt-${year}`,
              `Hace ${plural(yearsAgo, 'año', 'años')}`,
              `${plural(picked.length, 'foto', 'fotos')} de este día en ${year}`,
              `Hace ${plural(yearsAgo, 'año', 'años')} 🕰️ #tbt`,
              picked,
            )
          }),
        ),
    ),
    // ❤️ Favoritas sin publicar
    fetchCandidates({ favoritesOnly: true }).then(photos => {
      const picked = pickForPost(photos, used)
      return [
        toIdea('favs', 'Tus favoritas', `${plural(picked.length, 'foto', 'fotos')} sin publicar`, '', picked),
      ]
    }),
    // 👤 Con las personas que más salen
    getPeople().then(people =>
      Promise.all(
        [...people]
          .sort((a, b) => b.photoCount - a.photoCount)
          .slice(0, 2)
          .map(async p => {
            const picked = pickForPost(await fetchCandidates({ person: p.name }), used)
            return toIdea(
              `person-${p.name}`,
              `Con ${p.name}`,
              plural(picked.length, 'foto', 'fotos'),
              `Con ${p.name} ✨`,
              picked,
            )
          }),
      ),
    ),
    // 📅 Lo de esta semana
    fetchCandidates({ dateFrom: new Date(Date.now() - 7 * 86_400_000).toISOString() }).then(photos => {
      const picked = pickForPost(photos, used)
      return [
        toIdea('week', 'Esta semana', `${plural(picked.length, 'foto', 'fotos')} recientes`, '', picked),
      ]
    }),
  ]

  const results = await Promise.allSettled(sources)
  return results.flatMap(r => {
    if (r.status === 'rejected') {
      console.warn('[estudio] una fuente de ideas falló', r.reason)
      return []
    }
    return r.value.filter((i): i is Idea => i !== null)
  })
}
