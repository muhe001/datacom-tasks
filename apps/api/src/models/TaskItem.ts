import * as DynamoDbToolbox from 'dynamodb-toolbox'
import { assertHasRequiredEnvVars } from '@repo/common'
import { dynamoDbDocumentClient } from '../utils/dynamodb'
import { TASK_ITEM_TABLE } from '../config'

assertHasRequiredEnvVars(['TASK_ITEM_TABLE'])

// @ts-ignore
export const TaskItemTable = new DynamoDbToolbox.Table({
  name: TASK_ITEM_TABLE,
  partitionKey: 'userId',
  sortKey: 'itemId',
  // @ts-ignore
  DocumentClient: dynamoDbDocumentClient,
})

// @ts-ignore
const TaskItem = new DynamoDbToolbox.Entity({
  name: 'TaskItem',
  attributes: {
    userId: {
      partitionKey: true,
    },
    itemId: {
      sortKey: true,
    },
    title: 'string',
    description: 'string',
    status: 'string',
    dueDate: 'string',
    image: 'string',
  },
  table: TaskItemTable,
})

export default TaskItem
