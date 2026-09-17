import { useMutation } from '@tanstack/react-query'
import { client } from '@chronicler/api-client'
import { MOCK_API, mockUploadJobId } from './mock.js'

export function useUploadAudio() {
  return useMutation({
    mutationFn: async (file: File) => {
      if (MOCK_API) return { jobId: mockUploadJobId() }
      const form = new FormData()
      form.append('audio', file)
      const { data, error } = await client.POST('/api/v1/pipeline/upload', {
        body: { audio: file } as never,
        bodySerializer: () => form,
      })
      if (error || !data) throw new Error('Failed to upload audio')
      return data
    },
  })
}
