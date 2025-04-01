import { CognitoJwtVerifier } from 'aws-jwt-verify'
import { COGNITO_USER_POOL_ID, COGNITO_USER_POOL_CLIENT_ID } from '../config'
import { assertHasRequiredEnvVars } from '@repo/common'

assertHasRequiredEnvVars(['COGNITO_USER_POOL_ID', 'COGNITO_USER_POOL_CLIENT_ID'])

export const idTokenVerifier = CognitoJwtVerifier.create({
  userPoolId: COGNITO_USER_POOL_ID,
  clientId: COGNITO_USER_POOL_CLIENT_ID,
  tokenUse: 'id',
})
