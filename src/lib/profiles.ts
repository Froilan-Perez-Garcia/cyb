const KEY = 'cyb-profiles'
const MAX = 5

export const readProfiles = (): string[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
  } catch {
    return []
  }
}

const write = (emails: string[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(emails))
  } catch {
    return
  }
  return emails
}

export const saveProfile = (email: string) => {
  const normalized = email.trim().toLowerCase()
  const next = [normalized, ...readProfiles().filter((item) => item !== normalized)].slice(0, MAX)
  write(next)
}

export const removeProfile = (email: string) => {
  const next = readProfiles().filter((item) => item !== email)
  write(next)
  return next
}
