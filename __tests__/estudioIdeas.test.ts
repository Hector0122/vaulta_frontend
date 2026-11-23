jest.mock('../api/client', () => ({}))
jest.mock('../api/storage', () => ({ storage: { getString: () => undefined, set: () => {} } }))

import { pickForPost, type Candidate } from '../api/estudioIdeas'

const at = (id: string, iso: string, extra: Partial<Candidate> = {}): Candidate => ({
  id,
  uri: `u/${id}`,
  date: iso,
  blurred: false,
  private: false,
  mimeType: 'image/jpeg',
  ...extra,
})

test('quita borrosas, privadas, videos y ya usadas', () => {
  const picked = pickForPost(
    [
      at('ok', '2020-01-01T10:00:00Z'),
      at('blur', '2020-01-01T11:00:00Z', { blurred: true }),
      at('priv', '2020-01-01T12:00:00Z', { private: true }),
      at('vid', '2020-01-01T13:00:00Z', { mimeType: 'video/mp4' }),
      at('used', '2020-01-01T14:00:00Z'),
    ],
    new Set(['used']),
  )
  expect(picked.map(p => p.id)).toEqual(['ok'])
})

test('una foto por ráfaga (< 1 min), en orden cronológico', () => {
  const picked = pickForPost(
    [
      at('c', '2020-01-01T10:05:00Z'),
      at('a', '2020-01-01T10:00:00Z'),
      at('a2', '2020-01-01T10:00:20Z'), // misma ráfaga que a
      at('b', '2020-01-01T10:01:30Z'),
    ],
    new Set(),
  )
  expect(picked.map(p => p.id)).toEqual(['a', 'b', 'c'])
})

test('respeta el máximo del carrusel', () => {
  const many = Array.from({ length: 15 }, (_, i) =>
    at(`p${i}`, new Date(Date.UTC(2020, 0, 1, i)).toISOString()),
  )
  expect(pickForPost(many, new Set())).toHaveLength(10)
})
