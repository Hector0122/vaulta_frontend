const mockStore = new Map<string, string>()

jest.mock('../api/storage', () => ({
  storage: {
    getString: (k: string) => mockStore.get(k),
    set: (k: string, v: string) => mockStore.set(k, v),
  },
}))

import {
  createDraft,
  deleteDraft,
  getDraft,
  listDrafts,
  updateDraft,
  MAX_CAROUSEL,
} from '../api/estudio'

beforeEach(() => mockStore.clear())

test('crea, edita, lista y borra borradores', () => {
  const a = createDraft(['p1', 'p2'], 'thumb')
  expect(a).toMatchObject({ photoIds: ['p1', 'p2'], caption: '', ratio: '4:5', published: false })

  updateDraft(a.id, { caption: 'hola', ratio: '1:1', published: true })
  expect(getDraft(a.id)).toMatchObject({ caption: 'hola', ratio: '1:1', published: true })

  const b = createDraft(['p3'], null)
  updateDraft(b.id, { caption: 'más nuevo' })
  expect(listDrafts().map(d => d.id)[0]).toBe(b.id)

  deleteDraft(a.id)
  expect(listDrafts().map(d => d.id)).toEqual([b.id])
})

test('rechaza 0 o más de 10 fotos', () => {
  expect(() => createDraft([], null)).toThrow()
  const tooMany = Array.from({ length: MAX_CAROUSEL + 1 }, (_, i) => `p${i}`)
  expect(() => createDraft(tooMany, null)).toThrow()
})

test('datos corruptos no truenan la app', () => {
  mockStore.set('estudio-drafts', '{no es json')
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  expect(listDrafts()).toEqual([])
})
