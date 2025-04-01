import { Filter } from '@repo/common'
import TaskItem from '../models/TaskItem'
import { generateId } from '../utils/id'
import { dynamoCreateItem, getAttributesWithout } from '../utils/dynamodb'
import { DEFAULT_PAGE_SIZE } from '@repo/common'
import { debug } from '@repo/common'

const READ_ONLY_ATTRIBUTES = ['itemId', 'userId']
const IMMUTABLE_ATTRIBUTES = [...READ_ONLY_ATTRIBUTES]

// TODO: create proper types
export async function createTaskItem({
  taskItem,
  userId,
  itemId = generateId(),
}: {
  taskItem: any
  userId: string
  itemId?: string
}) {
  const attributes = getAttributesWithout({ attributes: taskItem, without: READ_ONLY_ATTRIBUTES })
  attributes.userId = userId
  attributes.itemId = itemId

  debug('api.controller.taskItem.create', { attributes })

  await dynamoCreateItem({
    entity: TaskItem,
    attributes,
  })

  return { data: attributes }
}

// TODO: create proper types
export async function updateTaskItem({
  userId,
  itemId,
  taskItem
}: {
  userId: string
  itemId: string
  taskItem: any
}): Promise<any> {
  const attributes = getAttributesWithout({ attributes: taskItem, without: IMMUTABLE_ATTRIBUTES })
  attributes.userId = userId
  attributes.itemId = itemId

  debug('api.controller.taskItem.update', { attributes })

  const taskItemItem = await TaskItem.update(attributes, { returnValues: 'ALL_NEW' })

  return taskItemItem.Attributes
}

// TODO: create proper types
export async function getTaskItem({
  userId,
  itemId
}: {
  userId: string
  itemId: string
}) {
  const taskItem = await TaskItem.get({ userId, itemId })
  const taskItemItem = taskItem?.Item

  if (!taskItemItem) return null

  const data = taskItemItem

  return { data }
}

interface ListTaskItemsParams {
  lastEvaluatedKey?: string
  filter?: Filter
  userId: string
}

export async function listTaskItems({ lastEvaluatedKey, filter, userId }: ListTaskItemsParams) {
  debug('api.controller.taskItem.listTaskItems', { lastEvaluatedKey, filter, userId })
  const taskItemQueryResponse = await TaskItem.query(userId, { limit: DEFAULT_PAGE_SIZE, startKey: lastEvaluatedKey ? {
    itemId: lastEvaluatedKey,
    userId
  }: undefined})
  debug('api.controller.taskItem.taskItemQueryResponse', { taskItemQueryResponse })
  return {
    data: taskItemQueryResponse.Items,
    lastEvaluatedKey: taskItemQueryResponse?.LastEvaluatedKey?.itemId
  }
}

// TODO: create proper types
export async function deleteTaskItem({
  userId,
  itemId
}: {
  userId: string
  itemId: string
}): Promise<any> {
  const itemToDeleteKey = { userId, itemId }

  const taskItem = await TaskItem.get(itemToDeleteKey)

  if (!taskItem) return null

  return TaskItem.delete(itemToDeleteKey)
}
