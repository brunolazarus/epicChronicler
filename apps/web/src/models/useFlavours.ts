import { useSuspenseQuery } from '@tanstack/react-query'
import { client } from '@chronicler/api-client'

export interface Flavour {
  key: string
  name: string
  description: string
}

export function useFlavours() {
  return useSuspenseQuery({
    queryKey: ['flavours'],
    queryFn: async () => {
      const { data, error } = await client.GET('/api/v1/pipeline/flavours')
      if (error) throw new Error('Failed to load flavours')
      return data as Flavour[]
    },
  })
}
