import { join, resolve } from 'node:path'
import { Construct } from 'constructs'
import { CfnOutput, Duration, Fn, Stack } from 'aws-cdk-lib/core'
import type { ITable } from 'aws-cdk-lib/aws-dynamodb'
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam'
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import { HttpUserPoolAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers'
import { HttpApi, HttpMethod, CfnStage, DomainName } from 'aws-cdk-lib/aws-apigatewayv2'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { LogGroup } from 'aws-cdk-lib/aws-logs'
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager'
import Auth from './Auth'
import { getEnvironmentConfig, getEnvironmentName, getIsProd } from '../environment-config'
import CustomNodejsFunction from './CustomNodejsFunction'

interface ExpressApiProps {
  auth: Auth
  taskItemTable: ITable
  userTable: ITable
}

export default class ExpressApi extends Construct {
  public readonly api: HttpApi
  public readonly apiLogGroup?: LogGroup
  public readonly lambdaFunction: NodejsFunction
  constructor(scope: Construct, id: string, props: ExpressApiProps) {
    super(scope, id)

    this.lambdaFunction = this.createLambdaFunction({ props })

    const { api, logGroup } = this.createApi({ auth: props.auth })
    this.api = api
    this.apiLogGroup = logGroup
  }

  createLambdaFunction({ props }: { props: ExpressApiProps }) {
    const environmentConfig = getEnvironmentConfig(this.node)
    const apiPackageDir = resolve(import.meta.dirname, '../../../../apps/api')
    const lambdaFunction = new CustomNodejsFunction(this, 'LambdaFunction', {
      function: {
        entry: join(apiPackageDir, 'lambda.ts'),
        timeout: Duration.seconds(28),
        environment: {
          TASK_ITEM_TABLE: props.taskItemTable.tableName,
          USER_TABLE: props.userTable.tableName,
          COGNITO_USER_POOL_ID: props.auth.userPool.userPoolId,
          COGNITO_USER_POOL_CLIENT_ID: props.auth.userPoolClient.userPoolClientId,
        },
      }
    }).function

    this.grantLambdaFunctionDynamoDbReadWritePermissions({ lambdaFunction, props })

    return lambdaFunction
  }

  grantLambdaFunctionDynamoDbReadWritePermissions({ lambdaFunction, props }: { lambdaFunction: NodejsFunction; props: ExpressApiProps }) {
    // Grant the Lambda function permission to read and write to DynamoDB
    const dynamoDBReadWritePolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'dynamodb:BatchGetItem',
        'dynamodb:BatchWriteItem',
        'dynamodb:DeleteItem',
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:Query',
        'dynamodb:Scan',
        'dynamodb:UpdateItem',
      ],
      resources: [
        props.taskItemTable.tableArn,
        Fn.join('', [props.taskItemTable.tableArn, '/index/*']),
        props.userTable.tableArn,
        Fn.join('', [props.userTable.tableArn, '/index/*']),
      ],
    })
    lambdaFunction.addToRolePolicy(dynamoDBReadWritePolicy)
  }

  createApi({ auth }: { auth: Auth }) {
    const authorizer = new HttpUserPoolAuthorizer('Authorizer', auth.userPool, {
      userPoolClients: [auth.userPoolClient],
    })
    const integration = new HttpLambdaIntegration('LambdaIntegration', this.lambdaFunction)
    const environmentConfig = getEnvironmentConfig(this.node)
    const domainName = environmentConfig.api?.domainName
    let domainResource

    if (domainName) {
      const certificate = new Certificate(this, 'Certificate', {
        domainName,
      })
      domainResource = new DomainName(this, 'DomainName', {
        domainName,
        certificate,
      })
    }

    const api = new HttpApi(this, 'HttpApi', {
      apiName: `Tasks-${getEnvironmentName(this.node)}`,
      defaultDomainMapping:
        domainResource ?
          {
            domainName: domainResource,
          }
        : undefined,
    })
    api.addRoutes({
      path: '/api-docs',
      integration,
      methods: [HttpMethod.ANY],
    })
    api.addRoutes({
      path: '/{proxy+}',
      integration,
      authorizer,
      methods: [HttpMethod.ANY],
    })
    // Override OPTIONS method with no authorizer
    api.addRoutes({
      path: '/{proxy+}',
      integration,
      methods: [HttpMethod.OPTIONS],
    })

    let logGroup
    if (getIsProd({ node: this.node })) {
      logGroup = this.enableApiAccessLogs({ api })
    }

    new CfnOutput(this, 'ApiEndpoint', { key: 'ApiEndpoint', value: domainResource ? api.defaultStage!.domainUrl : api.apiEndpoint })

    if (domainResource) {
      new CfnOutput(this, 'RegionalDomainName', {
        key: 'RegionalDomainName',
        value: domainResource.regionalDomainName,
        description: `You must create a CNAME record in your DNS using ${domainName} and this value`,
      })
    }

    return {
      api,
      logGroup: logGroup,
    }
  }

  enableApiAccessLogs({ api }: { api: HttpApi }) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const stage = api.defaultStage!.node.defaultChild as CfnStage
    const logGroup = new LogGroup(this, 'AccessLogs', {
      retention: getEnvironmentConfig(this.node).logRetentionInDays,
    })

    stage.accessLogSettings = {
      destinationArn: logGroup.logGroupArn,
      format: JSON.stringify({
        requestTime: '$context.requestTime',
        requestId: '$context.requestId',
        httpMethod: '$context.httpMethod',
        path: '$context.path',
        resourcePath: '$context.resourcePath',
        status: '$context.status',
        responseLatency: '$context.responseLatency',
        integrationRequestId: '$context.integration.requestId',
        functionResponseStatus: '$context.integration.status',
        integrationLatency: '$context.integration.latency',
        integrationServiceStatus: '$context.integration.integrationStatus',
        ip: '$context.identity.sourceIp',
        userAgent: '$context.identity.userAgent',
        principalId: '$context.authorizer.principalId',
        responseLength: '$context.responseLength',
      }),
    }

    logGroup.grantWrite(new ServicePrincipal('apigateway.amazonaws.com'))

    return logGroup
  }
}
