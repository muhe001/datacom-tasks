import { Aws, CfnOutput, Stack, type StackProps } from 'aws-cdk-lib/core'
import { Construct } from 'constructs'
import { TableV2 } from 'aws-cdk-lib/aws-dynamodb'
import Auth from '../constructs/Auth'
import Budget from '../constructs/Budget'
import Monitoring from '../constructs/Monitoring'
import WebApp from '../constructs/WebApp'
import ExpressApi from '../constructs/ExpressApi'
import { getEnvironmentName } from '../environment-config'

interface MonitoringStackProps extends StackProps {
  auth: Auth
  webApp?: WebApp
  api: ExpressApi
  taskItemTable: TableV2
  userTable: TableV2
}

export default class MonitoringStack extends Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props)

    new Budget(this, 'Budget')

    const envName = getEnvironmentName(this.node)
    new Monitoring(this, `Tasks-${envName}-Monitoring`, {
      userPoolId: props.auth.userPool.userPoolId,
      userPoolClientId: props.auth.userPoolClient.userPoolClientId,
      amplifyApp: props.webApp?.amplifyApp,
      api: props.api.api,
      apiLogGroup: props.api.apiLogGroup,
      functions: [
        props.api.lambdaFunction,
        props.auth.cognitoPreSignupFunction,
        props.auth.cognitoPreTokenGenerationFunction,
        props.auth.cognitoCustomMessageFunction,
      ],
      tables: [
        props.taskItemTable,
        props.userTable,
      ],
    })
    new CfnOutput(this, 'Region', { key: 'Region', value: Aws.REGION })
  }
}
