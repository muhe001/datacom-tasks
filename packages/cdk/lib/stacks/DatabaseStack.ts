import { Aws, CfnOutput, Stack, type StackProps} from 'aws-cdk-lib/core'
import { Construct } from 'constructs'
import { TableV2 } from 'aws-cdk-lib/aws-dynamodb'
import TaskItemTable from '../constructs/tables/TaskItemTable'
import UserTable from '../constructs/tables/UserTable'

export default class DatabaseStack extends Stack {
  public readonly taskItemTable: TableV2
  public readonly userTable: TableV2

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)
    
    this.taskItemTable = new TaskItemTable(this, 'TaskItemTable').table
    this.userTable = new UserTable(this, 'UserTable').table
    
    new CfnOutput(this, 'Region', { key: 'Region', value: Aws.REGION })
  }
}