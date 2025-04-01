import { Filter } from '@repo/common'
import User from '../models/User'
import { generateId } from '../utils/id'
import { dynamoCreateItem, getAttributesWithout, scanAll } from '../utils/dynamodb'
import { DEFAULT_PAGE_SIZE } from '@repo/common'
import { debug } from '@repo/common'

const READ_ONLY_ATTRIBUTES = ['userId']
const IMMUTABLE_ATTRIBUTES = [...READ_ONLY_ATTRIBUTES]

interface CreateUserParams {
  user: Record<string, any>
  userId?: string
}

export async function createUser({
  user, userId
}: CreateUserParams): Promise<any> {
  const attributes = getAttributesWithout({ attributes: user, without: READ_ONLY_ATTRIBUTES })

  const _userId = userId || generateId()
  attributes.userId = _userId

  debug('api.controller.user.create', { attributes, userId, _userId, a: 'a' })
  debug('api.controller.user.create2', { attributes, userId, _userId, a: 'a' })

  await dynamoCreateItem({
    entity: User,
    attributes,
  })

  return { data: attributes }
}

export async function updateUser({ userId, user }: { userId: string; user: Record<string, any> }): Promise<any> {
  const attributes = getAttributesWithout({ attributes: user, without: IMMUTABLE_ATTRIBUTES })
  attributes.userId = userId

  debug('api.controller.user.update', { attributes })

  const userItem = await User.update(attributes, { returnValues: 'ALL_NEW' })

  return userItem.Attributes
}

export async function getUser({ userId }: { userId: string }) {
  const user = await User.get({ userId })
  const userItem = user?.Item

  if (!userItem) return null

  const data = userItem

  return { data }
}

export interface ListUsersLastEvaluatedKey {
  userId: string
}

interface ListUsersParams {
  lastEvaluatedKey?: ListUsersLastEvaluatedKey
  filter?: Filter
  userId: string
}

export async function listUsers({ lastEvaluatedKey, filter, userId }: ListUsersParams) {
  const userQueryResponse = await User.query(userId, { limit: DEFAULT_PAGE_SIZE, startKey: lastEvaluatedKey })

  return {
    data: userQueryResponse.Items,
    lastEvaluatedKey: userQueryResponse.LastEvaluatedKey,
  }
}

export async function deleteUser({ userId }: { userId: string }): Promise<any> {
  const itemToDeleteKey = { userId }

  const user = await User.get(itemToDeleteKey)

  if (!user) return null

  return User.delete(itemToDeleteKey)
}

export async function getCurrentUser(req: { cognitoUser: { userId: string } }) {
  if (!req) throw new Error('req is required')

  const currentUser = await getUser({
    userId: req.cognitoUser.userId,
  })

  if (!currentUser) throw new Error(`Couldn't find current user ${req.cognitoUser.userId}`)

  return currentUser
}
