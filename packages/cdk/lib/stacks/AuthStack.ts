import { Aws, CfnOutput, Stack, type StackProps } from 'aws-cdk-lib/core'
import { Construct } from 'constructs'
import { TableV2 } from 'aws-cdk-lib/aws-dynamodb'
import Auth from '../constructs/Auth'

interface AuthStackProps extends StackProps {
  webAppUrl?: string
  userTable: TableV2,
  tasksTable: TableV2
}

export default class AuthStack extends Stack {
  public readonly auth: Auth
  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props)
    this.auth = new Auth(this, 'Auth', {
      webAppUrl: props.webAppUrl,
      userTable: props.userTable,
      tasksTable: props.tasksTable,
    })
    new CfnOutput(this, 'Region', { key: 'Region', value: Aws.REGION })
  }
}
