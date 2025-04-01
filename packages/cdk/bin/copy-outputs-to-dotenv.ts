/* eslint @typescript-eslint/no-var-requires: 0 */
import { writeFileSync } from 'fs'
import path from 'path'

const { ENVIRONMENT } = process.env

if (!ENVIRONMENT) {
  throw new Error('No ENVIRONMENT environment variable defined')
}

main()

async function main() {
  const nodeEnv = ENVIRONMENT === 'development' ? 'development' : 'production'
  const outputs = await import(`../cdk-outputs.${ENVIRONMENT}.json`) as any

  if (!outputs) {
    const envShort = ENVIRONMENT === 'development' ? 'dev' : ENVIRONMENT === 'production' ? 'prod' : ENVIRONMENT
    throw new Error(`No cdk-outputs.${ENVIRONMENT}.json. Try running \`npm run pull-stack-outputs:${envShort}\``)
  }

  const cdkJson: any = await import('../cdk.json')
  const cdkJsonEnvironmentConfig = cdkJson.context.environmentConfig[ENVIRONMENT]
  const databaseStackOutputs = outputs[`Tasks-${ENVIRONMENT}-Database`]
  const apiStackOutputs = outputs[`Tasks-${ENVIRONMENT}-Api`]
  const authStackOutputs = outputs[`Tasks-${ENVIRONMENT}-Auth`]
  const webAppStackOutputs = outputs[`Tasks-${ENVIRONMENT}-WebApp`]
  const SECRET_WARNING = `# WARNING: This file is committed to source control. Store secrets in .env.${ENVIRONMENT}.local instead of here.`
  const apiDotEnv = `${SECRET_WARNING}
  NODE_ENV=${nodeEnv}
  COGNITO_USER_POOL_ID="${authStackOutputs.UserPoolId}"
  COGNITO_USER_POOL_CLIENT_ID="${authStackOutputs.UserPoolClientId}"
  TASK_ITEM_TABLE="${databaseStackOutputs.TaskItemTable}"
  USER_TABLE="${databaseStackOutputs.UserTable}"`

  writeFileSync(path.resolve(import.meta.dirname, `../../../apps/api/.env.${ENVIRONMENT}`), apiDotEnv)

  let uiDotEnv = `NEXT_PUBLIC_ApiEndpoint="${apiStackOutputs.ApiEndpoint}"
  NEXT_PUBLIC_CognitoUserPoolId="${authStackOutputs.UserPoolId}"
  NEXT_PUBLIC_CognitoUserPoolClientId="${authStackOutputs.UserPoolClientId}"
  NEXT_PUBLIC_UserPoolAuthUrl="${authStackOutputs.UserPoolAuthUrl}"
  NEXT_PUBLIC_Region="${authStackOutputs.Region}"
  AMPLIFY_URL="${webAppStackOutputs.AmplifyUrl}"`

  if (cdkJsonEnvironmentConfig.auth?.autoVerifyUsers) {
    uiDotEnv = `NEXT_PUBLIC_AUTO_VERIFY_USERS=1
  ${uiDotEnv}`
  }

  uiDotEnv = `${SECRET_WARNING}
  ${uiDotEnv}`

  writeFileSync(path.resolve(import.meta.dirname, `../../../apps/ui/.env/.env.${ENVIRONMENT}`), uiDotEnv)
}
