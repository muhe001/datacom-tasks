import { Aws, CfnOutput, Stack, type StackProps } from 'aws-cdk-lib/core'
import { Construct } from 'constructs'
import ExpressApi from '../constructs/ExpressApi'
import { TableV2 } from 'aws-cdk-lib/aws-dynamodb'
import Auth from '../constructs/Auth'

interface ApiStackProps extends StackProps {
  auth: Auth
  taskItemTable: TableV2
  userTable: TableV2
}

export default class ApiStack extends Stack {
  public readonly api: ExpressApi
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props)
    this.api = new ExpressApi(this, 'ExpressApi', {
      auth: props.auth,
      taskItemTable: props.taskItemTable,
      userTable: props.userTable,
    })
    new CfnOutput(this, 'Region', { key: 'Region', value: Aws.REGION })
  }
}
