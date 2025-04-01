import serverlessExpress from '@codegenie/serverless-express'
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda'
import { debug } from '@repo/common'
import app from './src/app'


async function getServerlessExpressInstance() {
  const server = await app();

  const _serverlessExpressInstance = serverlessExpress({
    app: server
  })

  return _serverlessExpressInstance
}




export async function handler(event: APIGatewayProxyEventV2, context: Context): Promise<APIGatewayProxyResultV2> {
  debug('api.lambda.handler', { path: event.rawPath, method: event.requestContext.http.method })
  
  const serverlessExpressInstance = await getServerlessExpressInstance()
  
  return serverlessExpressInstance(event, context, () => null)
}
