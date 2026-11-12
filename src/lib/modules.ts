import { useSyncExternalStore } from 'react'

const KEY = 'cyb-debts'
const listeners = new Set<() => void>()

const read = () => {
  try {
    return localStorage.getItem(KEY) === 'on'
  } catch {
    return false
  }
}

export const setDebtsModule = (on: boolean) => {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    return
  }
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const useDebtsFlag = () => useSyncExternalStore(subscribe, read)
