import { AdminUpdateUserAttributesCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider'
import axios from 'axios'
import type { Context, PreTokenGenerationTriggerEvent } from 'aws-lambda'
import { controllers } from '@repo/api'
import { type StringMap } from '@repo/common'
import getFullName from './getFullName'
import { getAwsClientConfig } from '@repo/common-aws'
import { debug } from '@repo/common'

const { createUser, getUser, updateUser } = controllers

const cognitoIdpClient = new CognitoIdentityProviderClient(getAwsClientConfig())

interface Identity {
  providerType: 'Google' | 'Facebook' | 'SAML' | 'OIDC' | string
}

export async function handler(event: PreTokenGenerationTriggerEvent, context: Context) {
  const {
    userPoolId,
    userName,
    request: { userAttributes },
  } = event
  debug('cognito.preTokenGeneration.handler', { userName, userAttributes })

  // Don't await here so that we can run the Dynamo and Cognito operations in parallel
  const syncUserToDynamoPromise = syncUserToDynamo({ userName, userAttributes, userPoolId })
  let setUserEmailVerifiedTruePromise

  const { identities, email } = userAttributes

  if (email && identities) {
    const identitiesArray: Identity[] = JSON.parse(identities)
    const hasExternalIdentity = identitiesArray.some((identity) => ['Google', 'Facebook', 'SAML', 'OIDC'].includes(identity.providerType))

    if (hasExternalIdentity) {
      // Cognito has a "feature" that sets all attributes to their default values when not present on the external identity provider.
      // This results in the email_verified being set to false on each login, which causes features like forgot password to not work.
      // Force it back to email_verified=true.
      setUserEmailVerifiedTruePromise = setUserEmailVerifiedTrue({ userPoolId, username: userName })
    }
  }

  const [user] = await Promise.all([syncUserToDynamoPromise, setUserEmailVerifiedTruePromise])

  debug('cognito.preTokenGeneration.handler.user', user)

  event.response.claimsOverrideDetails = {
    claimsToAddOrOverride: {
      userId: user.data.userId,
    },
  }

  return event
}

async function setUserEmailVerifiedTrue({ userPoolId, username }: { userPoolId: string; username: string }) {
  return cognitoIdpClient.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: userPoolId,
      Username: username,
      UserAttributes: [{ Name: 'email_verified', Value: 'true' }],
    })
  )
}

async function syncUserToDynamo({
  userName,
  userAttributes,
  userPoolId,
}: {
  userName: string
  userAttributes: StringMap
  userPoolId: string
}) {
  const { email, given_name: givenName, family_name: familyName, name, picture } = userAttributes
  const userId = userAttributes['custom:userId']
  const fullName = getFullName({ name, givenName, familyName })

  debug('cognito.preTokenGeneration.syncUserToDynamo', { userId, email, givenName, familyName, name, fullName, picture })

  if (userId) {
    const existingUser = await getUser({ userId })

    debug('cognito.preTokenGeneration.syncUserToDynamo.existingUser', { existingUser })

    if (existingUser) {
      // If the user doesn't have a profilePicture set and one is available from the external IDP: set it to the user's profilePicture
      if (picture && !existingUser.data.profilePicture) {
        const base64EncodedProfilePicture = await fetchAndBase64EncodeImage(picture)
        await updateUser({ userId, user: { profilePicture: base64EncodedProfilePicture } })
      }
      return existingUser
    }
  }

  const user: any = {
    name: fullName,
    email,
  }

  if (picture) {
    const base64EncodedProfilePicture = await fetchAndBase64EncodeImage(picture)

    if (base64EncodedProfilePicture) {
      user.profilePicture = base64EncodedProfilePicture
    }
  }

  debug('cognito.preTokenGeneration.syncUserToDynamo.pre-createUser', { userId, user })

  const newUser = await createUser({ userId, user })

  debug('cognito.preTokenGeneration.syncUserToDynamo.post-createUser', newUser)


  await cognitoIdpClient.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: userPoolId,
      Username: userName,
      UserAttributes: [
        {
          Name: 'custom:userId',
          Value: newUser.data.userId,
        },
      ],
    })
  )
  return newUser
}

async function fetchAndBase64EncodeImage(imageUrl) {
  try {
    const image = await axios.get(imageUrl, { responseType: 'arraybuffer' })
    const base64 = Buffer.from(image.data).toString('base64')
    return base64 ? `data:image/png;base64, ${base64}` : null
  } catch (error: unknown) {
    // If we encounter an error while fetching/encoding the image, it's better to just log and continue.
    // The user won't have their profile picture, but at least they'll be registered/logged in!
    console.error({
      logName: 'cognito.preTokenGeneration.syncUserToDynamo.fetchAndBase64EncodeImage.error',
      errorName: (error as Error).name,
      errorMessage: (error as Error).message,
    })
  }
}
