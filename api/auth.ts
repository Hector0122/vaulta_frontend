import { BASE_URL } from './server'

export async function login(email: string, password: string) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Login failed' }))
    throw new Error(err.message || `Error ${res.status}`)
  }
  return res.json() as Promise<{
    token: string
    user: { id: string; email: string; name: string }
  }>
}

export async function register(email: string, name: string, password: string) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Registration failed' }))
    throw new Error(err.message || `Error ${res.status}`)
  }
  return res.json() as Promise<{
    token: string
    user: { id: string; email: string; name: string }
  }>
}
