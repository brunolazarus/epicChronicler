import { useMutation } from '@tanstack/react-query'
import { client } from '@chronicler/api-client'

export function useUploadAudio() {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('audio', file)
      const { data, error } = await client.POST('/api/v1/pipeline/upload', {
        body: { audio: file } as never,
        bodySerializer: () => form,
      })
      if (error) throw new Error('Failed to upload audio')
      return { jobId: (data as { jobId: string }).jobId }
    },
  })
}
