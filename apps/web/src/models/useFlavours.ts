import { useSuspenseQuery } from '@tanstack/react-query'
import { client, type Flavour } from '@chronicler/api-client'

export type { Flavour }

export function useFlavours() {
  return useSuspenseQuery({
    queryKey: ['flavours'],
    queryFn: async () => {
      const { data, error } = await client.GET('/api/v1/pipeline/flavours')
      if (error || !data) throw new Error('Failed to load flavours')
      return data
    },
  })
}
