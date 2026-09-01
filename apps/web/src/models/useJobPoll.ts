import { useQuery } from '@tanstack/react-query'
import { client } from '@chronicler/api-client'

export interface JobStatus {
  status: string
  progress: number
  result: unknown
  error: string | null
}

export class JobExpiredError extends Error {}

export function useJobPoll(jobId: string | null) {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const { data, error, response } = await client.GET('/api/v1/pipeline/jobs/{id}', {
        params: { path: { id: jobId! } },
      })
      if (error) {
        if (response.status === 404) throw new JobExpiredError('Job not found')
        throw new Error('Failed to poll job')
      }
      return data as JobStatus
    },
    enabled: jobId !== null,
    retry: false,
    refetchInterval: (query) => {
      if (query.state.error instanceof JobExpiredError) return false
      const status = query.state.data?.status
      return status === 'completed' || status === 'failed' ? false : 600
    },
  })
}
