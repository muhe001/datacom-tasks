import { Router } from 'express'
import asyncify from 'express-asyncify'
import tryParseReq from '../../try-parse-req'
import { listUsers, getUser,  ListUsersLastEvaluatedKey } from '../controllers/user'
import type { Filter } from '@repo/common'
import { RecordNotFoundException } from '../exceptions/RecordNotFoundException'

const userRouter: Router = asyncify(Router({ mergeParams: true }))

userRouter.get('/users', async (req, res) => {
  const lastEvaluatedKeyParsed: ListUsersLastEvaluatedKey | undefined = tryParseReq({ req, res, key: 'lastEvaluatedKey' })
  const filterParsed: Filter | undefined = tryParseReq({ req, res, key: 'filter' })
  const users = await listUsers({
    lastEvaluatedKey: lastEvaluatedKeyParsed,
    filter: filterParsed,
    userId: req.cognitoUser.userId,
  })

  res.json(users)
})

userRouter.get('/users/:userId', async (req, res) => {
  const { userId } = req.params
  const user = await getUser({
    userId: req.cognitoUser.userId
  })

  if (!user) {
    throw new RecordNotFoundException({ recordType: 'User', recordId: userId })
  }

  return res.json(user)
})

export default userRouter
