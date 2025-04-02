import fs from 'fs'
import path from 'path'
import express, { json, Express } from 'express'
import cors from 'cors'
import { getCurrentInvoke } from '@codegenie/serverless-express'
import { StatusCodes } from 'http-status-codes'
import asyncify from 'express-asyncify'
import meRouter from './routes/me'
import { IS_PRODUCTION } from './config'
import { idTokenVerifier } from './utils/cognito'
import { RecordNotFoundException } from './exceptions/RecordNotFoundException'
import { UnauthenticatedException } from './exceptions/UnauthenticatedException'
import { UnauthorizedException } from './exceptions/UnauthorizedException'
import { exceptions, debug }  from '@repo/common'
import openapi from "express-openapi";
import { json as jsonParser, urlencoded } from "body-parser";
import apiDoc from "./api-doc.ts";

import tasksRoutes from "./openapiRoutes/tasks";
import taskRoutes from "./openapiRoutes/tasks/{id}";

const { ClientException } = exceptions

// ts-ignore
const app: Express = asyncify(express())
app.use(
  cors({
    maxAge: 86400,
  }),
)

app.use(json())
app.use(async (req, res, next) => {
  // dont req auth for docs
  debug('api.auth', { path: req.path })
  if (req.path === '/api-docs') return next()

  const { event = {} } = getCurrentInvoke()

  // NOTE: APIGW sets event.requestContext.authorizer when using an Authorizer. If one isn't set,
  // then we're likely running locally. Validate the token manually.
  let jwtClaims = event.requestContext?.authorizer?.claims
  if (!jwtClaims) {
    if (!req.headers.authorization) {
      throw new UnauthenticatedException({ message: 'Missing Authorization header.' })
    }
    try {
      const token = req.headers.authorization.replace('Bearer ', '')
      jwtClaims = await idTokenVerifier.verify(token)
    } catch (error) {
      throw new UnauthenticatedException({ message: 'Unable to verify token.' })
    }
  }

  if (!jwtClaims || !jwtClaims.email || !jwtClaims.userId) {
    throw new UnauthenticatedException({ message: 'Missing claims.' })
  }

  const { userId, email } = jwtClaims
  const groups = jwtClaims['cognito:groups']
  req.cognitoUser = {
    userId,
    email,
    groups,
  }
  next()
})

app.use(meRouter)

function getStatusCodeFromError(error: any): number {
  if (typeof error.statusCode === 'number') return error.statusCode
  if (error instanceof UnauthenticatedException) return StatusCodes.UNAUTHORIZED
  if (error instanceof UnauthorizedException) return StatusCodes.FORBIDDEN
  if (error instanceof RecordNotFoundException) return StatusCodes.NOT_FOUND
  if (error instanceof ClientException) return StatusCodes.BAD_REQUEST
  return StatusCodes.INTERNAL_SERVER_ERROR
}

async function createServer(): Promise<Express> {
  await openapi.initialize({
    apiDoc,
    app,
    paths: [{
      path: "/tasks",
      module: tasksRoutes
    }, {
      path: "/tasks/{id}",
      module: taskRoutes
    }],
    consumesMiddleware: {
      "application/json": jsonParser(),
      "application/x-www-form-urlencoded": urlencoded({ extended: true }),
    },
    errorMiddleware: (err, req, res, next) => {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    },

  });

  app.use((req, res, next) => {
    // ts-ignore
    const error: Error & { statusCode?: number } = new Error('Route not found')
    error.statusCode = 404
    next(error)
  })
  
  // TODO: add express types
  app.use((error: any, req: any, res: any, next: any) => {
    const statusCode = getStatusCodeFromError(error)
    console.error({
      logName: 'api.errorResponse',
      method: req.method,
      url: req.originalUrl,
      errorMessage: error.message,
      errorFault: error.fault,
      statusCode,
    })
    const response: { message?: string; stack?: any } = {}
  
    // Return error message and stack trace for non-prod environments
    if (!IS_PRODUCTION) {
      response.stack = error.stack
      response.message = error.message
      // Only return error message for 4xx/client faults in prod environments; Alternative: statusCode >= 400 && statusCode <= 499
    } else if (error.fault === 'client') {
      response.message = error.message
    }
  
    res.status(statusCode).json(response)
  })

  app.use(
    cors({
      maxAge: 86400,
      origin: function (origin, callback) {
        callback(null, true) // TODO: lock this down to locahost (dev) & aws urls
      }
    }),
  )

  return app;
};
export default createServer
