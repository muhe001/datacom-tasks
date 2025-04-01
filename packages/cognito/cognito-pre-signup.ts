import { randomBytes } from 'node:crypto'
import {
  AdminCreateUserCommand,
  AdminLinkProviderForUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
  MessageActionType,
} from '@aws-sdk/client-cognito-identity-provider'
import type { Context, PreSignUpTriggerEvent } from 'aws-lambda'
import UnsupportedIdentityProviderNameException from './exceptions/UnsupportedIdentityProviderNameException'
import getFullName from './getFullName'
import { getAwsClientConfig } from '@repo/common-aws'
import { debug } from '@repo/common'

// NOTE: Cognito's adminLinkProviderForUser API requires the provider name to have the correct capitalization (e.g. Google, Facebook, MySamlIdp),
// however, the providerName received in the event from Cognito is lowercased, e.g. google_1234.
const providerNamesLowerCaseLookup = {
  google: 'Google',
}

const { AUTO_VERIFY_USERS } = process.env

const cognitoIdpClient = new CognitoIdentityProviderClient(getAwsClientConfig())

export async function handler(event: PreSignUpTriggerEvent, context: Context) {
  debug('cognito.preSignup.handler', { triggerSource: event.triggerSource })

  switch (event.triggerSource) {
    case 'PreSignUp_ExternalProvider':
      await handleExternalProvider({ event })
      break
    case 'PreSignUp_SignUp':
    case 'PreSignUp_AdminCreateUser':
      if (AUTO_VERIFY_USERS) {
        event.response.autoConfirmUser = true
        event.response.autoVerifyEmail = true
      }
  }

  return event
}

async function handleExternalProvider({ event }: { event: PreSignUpTriggerEvent }) {
  const {
    userName,
    userPoolId,
    request: { userAttributes },
  } = event

  const { email, name, given_name: givenName, family_name: familyName } = userAttributes
  const [providerName, providerUserId] = userName.split('_')
  const providerNameWithCorrectCapitalization = providerNamesLowerCaseLookup[providerName.toLowerCase()]

  debug('cognito.preSignup.handleExternalProvider', {
    userName,
    providerName,
    providerUserId,
    providerNameWithCorrectCapitalization,
    userAttributes,
  })

  if (!providerNameWithCorrectCapitalization) {
    throw new UnsupportedIdentityProviderNameException({ providerName, validIdentityProviderNamesMap: providerNamesLowerCaseLookup })
  }

  const cognitoUsersWithEmail = await listCognitoUsersWithEmail({ userPoolId, email })

  if (cognitoUsersWithEmail.Users?.length) {
    const cognitoUsername = cognitoUsersWithEmail.Users[0].Username || 'username-not-found'

    await linkCognitoUserAccounts({
      cognitoUsername,
      userPoolId,
      providerName: providerNameWithCorrectCapitalization,
      providerUserId,
    })
  } else {
    // No existing native Cognito user. Create one now in case they want to login with their email address in the future.
    // Cognito doesn't support linking a new native Cognito User to an existing Federated User, so it must be done now.
    // This approach allows users to use the Forgot Password flow to reset their password and sign in with email + password.
    const newNativeCognitoUser = await createCognitoUser({
      userPoolId,
      email,
      givenName,
      familyName,
      name,
    })

    const newNativeCognitoUserUsername = newNativeCognitoUser.User?.Username || 'username-not-found'

    await linkCognitoUserAccounts({
      cognitoUsername: newNativeCognitoUserUsername,
      userPoolId,
      providerName: providerNameWithCorrectCapitalization,
      providerUserId,
    })
  }

  return event
}

function listCognitoUsersWithEmail({ userPoolId, email }: { userPoolId: string; email: string }) {
  return cognitoIdpClient.send(
    new ListUsersCommand({
      UserPoolId: userPoolId,
      Filter: `email = '${email}'`,
    })
  )
}

function linkCognitoUserAccounts({
  cognitoUsername,
  userPoolId,
  providerName,
  providerUserId,
}: {
  cognitoUsername: string
  userPoolId: string
  providerName: string
  providerUserId: string
}) {
  debug('cognito.preSignup.linkCognitoUserAccounts', {
    cognitoUsername,
    userPoolId,
    providerName,
    providerUserId,
  })
  return cognitoIdpClient.send(
    new AdminLinkProviderForUserCommand({
      SourceUser: {
        ProviderName: providerName,
        ProviderAttributeName: 'Cognito_Subject',
        ProviderAttributeValue: providerUserId,
      },
      DestinationUser: {
        ProviderName: 'Cognito',
        ProviderAttributeValue: cognitoUsername,
      },
      UserPoolId: userPoolId,
    })
  )
}

async function createCognitoUser({
  userPoolId,
  email,
  givenName,
  familyName,
  name,
}: {
  userPoolId: string
  email: string
  givenName: string
  familyName: string
  name: string
}) {
  const fullName = getFullName({ name, givenName, familyName })

  debug('cognito.preSignup.createCognitoUser', { userPoolId, email, givenName, familyName, name, fullName })

  const createdCognitoUser = await cognitoIdpClient.send(
    new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      // Don't send an email with the temporary password
      MessageAction: MessageActionType.SUPPRESS,
      Username: email,
      UserAttributes: [
        {
          Name: 'name',
          Value: fullName,
        },
        {
          Name: 'email',
          Value: email,
        },
        {
          Name: 'email_verified',
          Value: 'true',
        },
      ],
    })
  )

  // Set password to confirm user; AdminConfirmSignUp doesn't work on manually created users
  await setCognitoUserPassword({ userPoolId, email })

  return createdCognitoUser
}

function setCognitoUserPassword({ userPoolId, email }: { userPoolId: string; email: string }) {
  const password = randomBytes(16).toString('hex')

  return cognitoIdpClient.send(
    new AdminSetUserPasswordCommand({
      Password: password,
      UserPoolId: userPoolId,
      Username: email,
      Permanent: true,
    })
  )
}
