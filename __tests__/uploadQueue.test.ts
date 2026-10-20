const mockStore = new Map<string, string>()

jest.mock('../api/storage', () => ({
  storage: {
    getString: (k: string) => mockStore.get(k),
    set: (k: string, v: string) => mockStore.set(k, v),
    remove: (k: string) => mockStore.delete(k),
  },
}))
jest.mock('react-native-fs', () => ({
  CachesDirectoryPath: '/cache',
  copyFile: jest.fn(() => Promise.resolve()),
  unlink: jest.fn(() => Promise.resolve()),
}))
jest.mock('../api/server', () => ({ BASE_URL: 'http://test.local' }))
jest.mock('../api/client', () => ({ getToken: () => Promise.resolve('t') }))

import RNFS from 'react-native-fs'
import { addToQueue, getQueue, processQueue } from '../services/UploadQueue'

let inFlight = 0
let maxInFlight = 0

class FakeXHR {
  status = 0
  responseText = ''
  timeout = 0
  onload?: () => void
  onerror?: () => void
  ontimeout?: () => void
  private body: any
  open() {}
  setRequestHeader() {}
  send(body: any) {
    this.body = body
    inFlight++
    maxInFlight = Math.max(maxInFlight, inFlight)
    setTimeout(() => {
      inFlight--
      const name: string = this.body.parts[0][1].name
      this.status = name.startsWith('bad') ? 500 : 200
      this.onload?.()
    }, 5)
  }
}

class FakeFormData {
  parts: [string, any][] = []
  append(key: string, value: any) {
    this.parts.push([key, value])
  }
}

beforeEach(() => {
  mockStore.clear()
  inFlight = 0
  maxInFlight = 0
  ;(globalThis as any).XMLHttpRequest = FakeXHR
  ;(globalThis as any).FormData = FakeFormData
})

test('uploads 3 at a time, keeps failures, and runs once even if called twice', async () => {
  addToQueue([
    { uri: 'file:///cache/a.jpg', name: 'a.jpg', type: 'image/jpeg' },
    { uri: 'file:///cache/b.jpg', name: 'b.jpg', type: 'image/jpeg' },
    { uri: 'file:///cache/bad1.jpg', name: 'bad1.jpg', type: 'image/jpeg' },
    { uri: 'file:///cache/c.jpg', name: 'c.jpg', type: 'image/jpeg' },
    { uri: 'file:///cache/bad2.jpg', name: 'bad2.jpg', type: 'image/jpeg' },
  ])

  const first = processQueue()
  expect(processQueue()).toBe(first)
  const result = await first

  expect(result).toMatchObject({ running: false, completed: 3, failed: 2, total: 5 })
  expect(maxInFlight).toBe(3)
  expect(getQueue().map(i => [i.name, i.status])).toEqual([
    ['bad1.jpg', 'failed'],
    ['bad2.jpg', 'failed'],
  ])
  expect(RNFS.unlink).toHaveBeenCalledWith('/cache/a.jpg')
})

test('picks up items added while a run is in progress', async () => {
  addToQueue([{ uri: 'file:///cache/a.jpg', name: 'a.jpg', type: 'image/jpeg' }])
  const run = processQueue()
  addToQueue([{ uri: 'file:///cache/late.jpg', name: 'late.jpg', type: 'image/jpeg' }])
  const result = await run
  expect(result).toMatchObject({ completed: 2, failed: 0, total: 2 })
  expect(getQueue()).toEqual([])
})
