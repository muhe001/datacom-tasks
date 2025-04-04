import { Aws, CfnOutput, Duration, Fn } from 'aws-cdk-lib'
import {
  ClientAttributes,
  ProviderAttribute,
  StringAttribute,
  UserPool,
  UserPoolClient,
  UserPoolClientIdentityProvider,
  UserPoolEmail,
  UserPoolIdentityProviderGoogle,
  UserPoolOperation,
} from 'aws-cdk-lib/aws-cognito'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Construct } from 'constructs'
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam'
import type { ITable } from 'aws-cdk-lib/aws-dynamodb'
import { getEnvironmentConfig, getEnvironmentName, getIsDeletionProtectionEnabled, getRemovalPolicy } from '../environment-config'
import CustomNodejsFunction from './CustomNodejsFunction'
import type { StringMap } from '@repo/common'
import path from 'node:path'

const cognitoPackageDir = path.resolve(import.meta.dirname, '../../../cognito')

interface AuthProps {
  userTable: ITable,
  tasksTable: ITable,
  webAppUrl?: string
}

export default class Auth extends Construct {
  readonly userPool: UserPool
  readonly userPoolClient: UserPoolClient
  readonly cognitoPreSignupFunction: NodejsFunction
  readonly cognitoPreTokenGenerationFunction: NodejsFunction
  readonly cognitoCustomMessageFunction: NodejsFunction
  constructor(scope: Construct, id: string, props: AuthProps) {
    super(scope, id)

    this.userPool = this.createUserPool()
    this.userPoolClient = this.createUserPoolClient({ webAppUrl: props.webAppUrl })
    const { cognitoPreSignupFunction, cognitoPreTokenGenerationFunction, cognitoCustomMessageFunction } = this.addTriggers({
      userTable: props.userTable,
      tasksTable: props.tasksTable
    })
    this.addDomainName()
    this.cognitoPreSignupFunction = cognitoPreSignupFunction
    this.cognitoPreTokenGenerationFunction = cognitoPreTokenGenerationFunction
    this.cognitoCustomMessageFunction = cognitoCustomMessageFunction
  }

  createUserPool() {
    const environmentConfig = getEnvironmentConfig(this.node)

    // NOTE: If `verifyUserEmail` isn't set, use the built-in Cognito emailer. This is especially convenient for dev environments.
    const userPoolWithSesEmail =
      environmentConfig.email?.verifiedDomain && environmentConfig.email.verifyUserEmail
        ? UserPoolEmail.withSES({
            sesVerifiedDomain: environmentConfig.email.verifiedDomain,
            fromEmail: environmentConfig.email.verifyUserEmail,
            fromName: 'tasks',
          })
        : undefined

    const userPool = new UserPool(this, 'UserPool', {
      signInCaseSensitive: false,
      deletionProtection: getIsDeletionProtectionEnabled({ node: this.node }),
      removalPolicy: getRemovalPolicy({ node: this.node }),
      passwordPolicy: {
        minLength: 8,
      },
      selfSignUpEnabled: true,
      signInAliases: {
        username: false,
        email: true,
      },
      email: userPoolWithSesEmail,
      customAttributes: {
        userId: new StringAttribute({
          mutable: true,
        }),
      },
    })

    new CfnOutput(this, 'UserPoolId', { key: 'UserPoolId', value: userPool.userPoolId })

    return userPool
  }

  createUserPoolClient({ webAppUrl }: { webAppUrl?: string }) {
    const googleIdentityProvider = this.createGoogleIdentityProvider()
    const supportedIdentityProviders: { name: string }[] = [UserPoolClientIdentityProvider.COGNITO]

    if (googleIdentityProvider) {
      supportedIdentityProviders.push({ name: googleIdentityProvider.providerName })
    }

    const callbackUrls = ['http://localhost:3001/']

    if (webAppUrl) {
      callbackUrls.push(webAppUrl)
    }

    // NOTE: Cognito grants read and write permission to all attributes by default,
    // enabling users to update potentially restricted data such as their userId.
    // Restrict to only necessary attributes, including those required by IDP mappings.
    const readAttributes = new ClientAttributes().withStandardAttributes({
      email: true,
      fullname: true,
      familyName: true,
      givenName: true,
      profilePicture: true,
    })
    const writeAttributes = new ClientAttributes().withStandardAttributes({
      email: true,
      fullname: true,
      familyName: true,
      givenName: true,
      profilePicture: true,
    })

    const userPoolClient = this.userPool.addClient('UserPoolClient', {
      idTokenValidity: Duration.days(1),
      refreshTokenValidity: Duration.days(90),
      supportedIdentityProviders,
      oAuth: {
        callbackUrls: callbackUrls,
        logoutUrls: callbackUrls,
      },
      readAttributes,
      writeAttributes,
    })

    if (googleIdentityProvider) {
      userPoolClient.node.addDependency(googleIdentityProvider)
    }

    new CfnOutput(this, 'UserPoolClientId', { key: 'UserPoolClientId', value: userPoolClient.userPoolClientId })

    return userPoolClient
  }

  createGoogleIdentityProvider() {
    const { auth } = getEnvironmentConfig(this.node)

    if (!auth.googleClientId || !auth.googleClientId) return

    const googleIdentityProvider = new UserPoolIdentityProviderGoogle(this, 'GoogleIdp', {
      userPool: this.userPool,
      clientId: auth.googleClientId,
      clientSecret: auth.googleClientSecret,
      scopes: ['profile', 'email', 'openid'],
      attributeMapping: {
        email: ProviderAttribute.GOOGLE_EMAIL,
        fullname: ProviderAttribute.GOOGLE_NAME,
        familyName: ProviderAttribute.GOOGLE_FAMILY_NAME,
        givenName: ProviderAttribute.GOOGLE_GIVEN_NAME,
        profilePicture: ProviderAttribute.GOOGLE_PICTURE,
      },
    })
    new CfnOutput(this, 'GoogleIdpName', { key: 'GoogleIdpName', value: googleIdentityProvider.providerName })

    return googleIdentityProvider
  }

  addDomainName() {
    const envName = getEnvironmentName(this.node)
    // NOTE: This is regionally unique like an S3 bucket
    const regionallyUniqueDomainPrefix = envName === 'production' ? 'tasks' : `tasks-${envName}`
    this.userPool.addDomain('CognitoDomain', {
      cognitoDomain: {
        domainPrefix: regionallyUniqueDomainPrefix,
      },
    })
    const userPoolAuthDomain = `${regionallyUniqueDomainPrefix}.auth.${Aws.REGION}.amazoncognito.com`
    new CfnOutput(this, 'UserPoolAuthUrl', { key: 'UserPoolAuthUrl', value: userPoolAuthDomain })
    new CfnOutput(this, 'UserPoolRedirectUrlACS', {
      key: 'UserPoolRedirectUrlACS',
      value: `https://${userPoolAuthDomain}/saml2/idpresponse`,
    })
    new CfnOutput(this, 'UserPoolEntityId', { key: 'UserPoolEntityId', value: `urn:amazon:cognito:sp:${this.userPool.userPoolId}` })
  }

  addTriggers({ userTable, tasksTable }: { userTable: ITable, tasksTable: ITable }) {
    const cognitoPreSignupFunction = this.addPreSignupTrigger()
    const cognitoPreTokenGenerationFunction = this.addPreTokenGenerationTrigger({ userTable, tasksTable })
    const cognitoCustomMessageFunction = this.addCustomMessageTrigger()
    return {
      cognitoPreSignupFunction,
      cognitoPreTokenGenerationFunction,
      cognitoCustomMessageFunction,
    }
  }

  // Pre Signup https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-sign-up.html
  addPreSignupTrigger() {
    const { auth } = getEnvironmentConfig(this.node)
    const environment: StringMap = {}

    if (auth?.autoVerifyUsers) {
      environment.AUTO_VERIFY_USERS = '1'
    }

    const cognitoPreSignupFunction = new CustomNodejsFunction(this, 'PreSignupFunction', {
      function: {
        entry: path.join(cognitoPackageDir, 'cognito-pre-signup.ts'),
        environment,
      },
    }).function
    const updateCognitoUserPoolPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'cognito-idp:AdminUpdateUserAttributes',
        'cognito-idp:AdminLinkProviderForUser',
        'cognito-idp:AdminCreateUser',
        'cognito-idp:AdminSetUserPassword',
        'cognito-idp:ListUsers',
      ],
      resources: [
        `arn:aws:cognito-idp:${Aws.REGION}:${Aws.ACCOUNT_ID}:userpool/*`,
        // TODO: Scoping to this results in CDK complaining about a circular dependency
        // this.userPool.userPoolArn,
      ],
    })
    cognitoPreSignupFunction.addToRolePolicy(updateCognitoUserPoolPolicyStatement)
    this.userPool.addTrigger(UserPoolOperation.PRE_SIGN_UP, cognitoPreSignupFunction)
    return cognitoPreSignupFunction
  }

  addPreTokenGenerationTrigger({ userTable, tasksTable }: { userTable: ITable, tasksTable: ITable }) {
    // Pre Token Generation https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html
    const environment: StringMap = {
      USER_TABLE: userTable.tableName,
      TASK_ITEM_TABLE: tasksTable.tableName // not needed for now - to remove split contollers into separate packages
    }

    const cognitoPreTokenGenerationFunction = new CustomNodejsFunction(this, 'PreTokenGenerationFunction', {
      function: {
        entry: path.join(cognitoPackageDir, 'cognito-pre-token-generation.ts'),
        environment,
      },
    }).function

    // Give the Lambda function permission to read and write to DynamoDB
    const dynamoDBReadWritePolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
      ],
      resources: [
        userTable.tableArn,
      ],
    })
    cognitoPreTokenGenerationFunction.addToRolePolicy(dynamoDBReadWritePolicy)

    // Give the Lambda function permission to update Cognito User Attributes
    const updateCognitoUserPoolPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'cognito-idp:AdminUpdateUserAttributes',
      ],
      resources: [
        `arn:aws:cognito-idp:${Aws.REGION}:${Aws.ACCOUNT_ID}:userpool/*`,
        // TODO: Scoping to this results in CDK complaining about a circular dependency
        // this.userPool.userPoolArn,
      ],
    })
    cognitoPreTokenGenerationFunction.addToRolePolicy(updateCognitoUserPoolPolicyStatement)
    this.userPool.addTrigger(UserPoolOperation.PRE_TOKEN_GENERATION, cognitoPreTokenGenerationFunction)

    return cognitoPreTokenGenerationFunction
  }

  addCustomMessageTrigger() {
    // Custom message https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-custom-message.html
    const cognitoCustomMessageFunction = new CustomNodejsFunction(this, 'CustomMessageFunction', {
      function: {
        entry: path.join(cognitoPackageDir, 'cognito-custom-message.ts'),
      },
    }).function
    this.userPool.addTrigger(UserPoolOperation.CUSTOM_MESSAGE, cognitoCustomMessageFunction)

    return cognitoCustomMessageFunction
  }
}
