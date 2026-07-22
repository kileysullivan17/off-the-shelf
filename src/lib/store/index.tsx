import { createContext, useContext, type ReactNode } from 'react'
import {
  useMutation, useQuery, useQueryClient,
} from '@tanstack/react-query'
import type { DB } from '../types'
import type { DataStore } from './DataStore'
import { LocalStore } from './LocalStore'
import { SupabaseStore } from './SupabaseStore'

/** Pick the adapter: Supabase when configured, local demo otherwise (D1). */
export function createDataStore(): DataStore {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (url && key) return new SupabaseStore(url, key)
  return new LocalStore()
}

const StoreContext = createContext<DataStore | null>(null)

export function StoreProvider({ store, children }: { store: DataStore; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore(): DataStore {
  const s = useContext(StoreContext)
  if (!s) throw new Error('useStore outside StoreProvider')
  return s
}

const DB_KEY = ['db']

/** The whole household dataset under one query key (D5). */
export function useDB() {
  const store = useStore()
  return useQuery<DB>({ queryKey: DB_KEY, queryFn: () => store.load() })
}

/** Run any DataStore mutation, then refresh the dataset. */
export function useMutate() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fn: (s: DataStore) => Promise<void>) => fn(store),
    onSettled: () => qc.invalidateQueries({ queryKey: DB_KEY }),
  })
}
