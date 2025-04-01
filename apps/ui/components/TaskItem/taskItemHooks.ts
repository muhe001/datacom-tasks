'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notification } from 'antd'
import axios from 'axios'
import type { Filter } from '@repo/common'

interface ListTaskItemsParams {
  lastEvaluatedKey?: string
  filter?: Filter
}

const api = {
  listTaskItems: ({ lastEvaluatedKey, filter }: ListTaskItemsParams) => {
    return axios.get(`/tasks`, {
      params: {
        lastEvaluatedKey,
        filter,
      },
    })
  },
  getTaskItem: ({ itemId }) => axios.get(`/tasks/${itemId}`),
  createTaskItem: ({ data }) => axios.post(`/tasks`, { taskItem: data }),
  updateTaskItem: ({ itemId, data }) => axios.put(`/tasks/${itemId}`, { taskItem: data }),
  deleteTaskItem: ({ itemId }) => axios.delete(`/tasks/${itemId}`),
}

const taskItemQueryKeys = {
  root: () => {
    return ['tasks']
  },
  list: ({ page }: { page?: number }) => {
    const queryKey: Array<any> = [...taskItemQueryKeys.root(), 'list']

    if (page) {
      queryKey.push({ page })
    }

    return queryKey
  },
  search: ({ title }: { title?: string }) => {
    return [...taskItemQueryKeys.root(), 'search', { title }]
  },
  details: ({ itemId }: { itemId: string }) => [...taskItemQueryKeys.root(), 'details', { itemId }],
}

interface UseListTaskItemsQueryParams {
  page?: number
  lastEvaluatedKey?: string
}

export interface TaskItemData {
  [k: string]: any
}

interface ListTaskItemsApiResponse {
  data: Array<TaskItemData>
  lastEvaluatedKey: string
}

export function useListTaskItemsQuery({ page, lastEvaluatedKey }: UseListTaskItemsQueryParams) {
  const queryClient = useQueryClient()
  const listTaskItemsQuery = useQuery<ListTaskItemsApiResponse>(
    taskItemQueryKeys.list({ page }),
    async () => {
      const apiResponse = await api.listTaskItems({ lastEvaluatedKey })
      apiResponse.data.data.map((taskItem) => queryClient.setQueryData(taskItemQueryKeys.details({ itemId: taskItem.itemId }), { data: taskItem }))
      return apiResponse.data
    },
    {
      keepPreviousData: true,
    },
  )

  return listTaskItemsQuery
}

interface UseSearchTaskItemsQueryParams {
  title?: string
  lastEvaluatedKey?: string
}

export function useSearchTaskItemsQuery({ title, lastEvaluatedKey }: UseSearchTaskItemsQueryParams) {
  const searchTaskItemsQuery = useQuery(
    taskItemQueryKeys.search({ title }),
    async () => {
      const filter =
        title ?
          {
            filters: [
              {
                property: 'title',
                value: title,
              },
            ],
          }
        : undefined
      const apiResponse = await api.listTaskItems({ lastEvaluatedKey, filter })
      return apiResponse.data
    },
    {
      keepPreviousData: true,
      staleTime: 30000, // 30s
    },
  )

  return searchTaskItemsQuery
}

export function useGetTaskItemQuery({ itemId }) {
  const getTaskItemQuery = useQuery(
    taskItemQueryKeys.details({ itemId }),
    async () => {
      const apiResponse = await api.getTaskItem({ itemId })
      return apiResponse.data
    },
    {
      enabled: Boolean(itemId),
    },
  )

  return getTaskItemQuery
}

export function useCreateTaskItemMutation() {
  const queryClient = useQueryClient()
  const createTaskItemMutation = useMutation<any, any, any>(async ({ data }) => {
    try {
      const response = await api.createTaskItem({ data })

      queryClient.invalidateQueries(taskItemQueryKeys.list({}))
      queryClient.setQueryData(taskItemQueryKeys.details({ itemId: response.data.data.itemId }), { data: response.data.data })
      return response
    } catch (error: any) {
      notification.error({
        message: 'Create failed',
        description: error?.response?.data?.message || error?.message || 'Unknown error',
        placement: 'topRight',
      })
    }
  })

  return createTaskItemMutation
}

export function useUpdateTaskItemMutation() {
  const queryClient = useQueryClient()
  const updateTaskItemMutation = useMutation<any, any, any>(async ({ itemId, data }) => {
    try {
      const response = await api.updateTaskItem({ itemId, data })

      queryClient.invalidateQueries(taskItemQueryKeys.list({}))
      queryClient.setQueryData(taskItemQueryKeys.details({ itemId: data.itemId }), { data: response.data.data })

      return response
    } catch (error: any) {
      notification.error({
        message: 'Update failed',
        description: error?.response?.data?.message || error?.message || 'Unknown error',
        placement: 'topRight',
      })
    }
  })

  return updateTaskItemMutation
}

export function useDeleteTaskItemMutation() {
  const queryClient = useQueryClient()
  const deleteTaskItemMutation = useMutation<any, any, any>(async ({ itemId }) => {
    try {
      const response = await api.deleteTaskItem({ itemId })

      queryClient.invalidateQueries(taskItemQueryKeys.root())

      return response
    } catch (error: any) {
      notification.error({
        message: 'Delete failed',
        description: error?.response?.data?.message || error?.message || 'Unknown error',
        placement: 'topRight',
      })
    }
  })

  return deleteTaskItemMutation
}
