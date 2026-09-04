import { useQuery } from '@tanstack/react-query'
import { client, type JobStatus } from '@chronicler/api-client'

export type { JobStatus }

export class JobExpiredError extends Error {}

export function useJobPoll(jobId: string | null) {
  return useQuery<JobStatus, Error>({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const { data, error, response } = await client.GET('/api/v1/pipeline/jobs/{id}', {
        params: { path: { id: jobId! } },
      })
      if (error || !data) {
        if (response.status === 404) throw new JobExpiredError('Job not found')
        throw new Error('Failed to poll job')
      }
      return data
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
