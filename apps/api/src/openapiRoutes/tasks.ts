// import { debug } from '@repo/common'
import { OperationFunction } from "express-openapi"
import { listTaskItems, createTaskItem } from "../controllers"
import { debug } from '@repo/common'

const get: OperationFunction = async function get(req, res) {
  const lastEvaluatedKey = req.query['lastEvaluatedKey']
  
    const taskItems = await listTaskItems({
      lastEvaluatedKey: lastEvaluatedKey ? lastEvaluatedKey as string : undefined,
      userId: req.cognitoUser.userId
    })
  
    res.json(taskItems)
}

get.apiDoc = {
  summary: "Get all tasks",
  operationId: 'getTasks',
  parameters: [{
    name: "lastEvaluatedKey",
    in: "query",
    required: false,
    description: "Last evaluated key from the previous request",
    schema: {
        "type": "string"
    }
  }],
  responses: {
      200: {
          description: "Successful retrieval of tasks",
          content: {
              "application/json": {
                  schema: {
                      type: "array",
                      items: {
                          "$ref": "#/components/schemas/TaskList"
                      }
                  }
              }
          }
      }
  }
};

const post: OperationFunction = async function post(req, res) {
  debug('api.controller.taskItem.create', { body: req.body })
  const taskItem = req.body
  const createdTaskItem = await createTaskItem({
    userId: req.cognitoUser.userId as string,
    taskItem,
  })

  res.json(createdTaskItem)
}

post.apiDoc = {
  summary: "Create a new task",
  operationId: 'createNewTask',
  requestBody: {
    description: "Task object to create",
    required: true,
    content: {
      "application/json": {
        schema: {
          $ref: "#/components/schemas/Task"
        }
      }
    }
  },
  responses: {
      200: {
          description: "Successful creation of task",
          content: {
              "application/json": {
                  schema: {
                      $ref: "#/components/schemas/Task"
                  }
              }
          }
      }
  }
}

const _routes = {
  get,
  post
};

export default _routes;
