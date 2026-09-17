import { useMutation } from '@tanstack/react-query'
import { client } from '@chronicler/api-client'
import { MOCK_API, mockGenerateJobId } from './mock.js'

export interface Transcript {
  speaker: string
  text: string
}

export function useGenerateChronicle() {
  return useMutation({
    mutationFn: async (input: { transcripts: Transcript[]; flavour: string }) => {
      if (MOCK_API) return { jobId: mockGenerateJobId() }
      const { data, error } = await client.POST('/api/v1/pipeline/generate', {
        body: { ...input, flavour: input.flavour as 'medieval' | 'sports' | 'nature' | 'fantasy' },
      })
      if (error || !data) throw new Error('Failed to generate chronicle')
      return data
    },
  })
}
