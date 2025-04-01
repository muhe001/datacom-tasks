import * as DynamoDbToolbox from 'dynamodb-toolbox'
import { assertHasRequiredEnvVars } from '@repo/common'
import { dynamoDbDocumentClient } from '../utils/dynamodb'
import { USER_TABLE } from '../config'

assertHasRequiredEnvVars(['USER_TABLE'])

// @ts-ignore
export const UserTable: DynamoDbToolbox.Table = new DynamoDbToolbox.Table({
  name: USER_TABLE,
  partitionKey: 'userId',
  // @ts-ignore
  DocumentClient: dynamoDbDocumentClient,
})

// @ts-ignore
const User = new DynamoDbToolbox.Entity({
  name: 'User',
  attributes: {
    userId: {
      partitionKey: true,
    },
    name: 'string',
    email: 'string',
    profilePicture: 'string',
  },
  table: UserTable,
})

export default User
