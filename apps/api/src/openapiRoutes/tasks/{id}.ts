// import { debug } from '@repo/common';
import { OperationFunction } from "express-openapi"
import { RecordNotFoundException } from '../../exceptions/RecordNotFoundException'
import { getTaskItem, updateTaskItem, deleteTaskItem } from "../../controllers"

const get: OperationFunction = async function get(req, res) {
  const itemId  = req.params.id
    const taskItem = await getTaskItem({
      userId: req.cognitoUser.userId,
      itemId
    })
  
    if (!taskItem) {
      throw new RecordNotFoundException({ recordType: 'Task Item', recordId: itemId })
    }
  
    return res.json(taskItem)
}

get.apiDoc = {
  summary: "Get a specific task",
  operationId: "getTask",
  parameters: [{
    name: "id",
    in: "path",
    required: true,
    description: "ID of the task to retrieve",
    schema: {
        type: "string"
    }
  }],
  responses: {
      200: {
          description: "Successful retrieval of the task",
          content: {
              "application/json": {
                  schema: {
                      $ref: "#/components/schemas/TaskResource"
                  }
              }
          }
      },
      404: {
          description: "Task not found"
      }
  }
}

const put: OperationFunction = async function get(req, res) {
  const itemId = req.params.id
    const taskItem  = req.body
    const taskItemItem = await updateTaskItem({
      taskItem,
      userId: req.cognitoUser.userId,
      itemId,
    })
  
    res.json({ data: taskItemItem })
}

put.apiDoc = {
  summary: "Update a task",
  operationId: "updateTask",
  parameters: [{
      name: "id",
      in: "path",
      required: true,
      description: "ID of the task to update",
      schema: {
          type: "string"
      }
  }],
  requestBody: {
      required: true,
      content: {
          "application/json": {
              schema: {
                  $ref: "#/components/schemas/TaskResource"
              }
          }
      }
  },
  responses: {
      200: {
          description: "Task updated successfully",
          content: {
              "application/json": {
                  schema: {
                      $ref: "#/components/schemas/TaskResource"
                  }
              }
          }
      },
      404: {
          description: "Task not found"
      }
  }
}

const del: OperationFunction = async function get(req, res) {
  const itemId = req.params.id
    const result = await deleteTaskItem({
      userId: req.cognitoUser.userId,
      itemId,
    })

    if (!result) {
      throw new RecordNotFoundException({ recordType: 'Task Item', recordId: itemId })
    }

    return res.json({})
}

del.apiDoc = {
  summary: "Delete a task",
  operationId: "deleteTask",
  parameters: [{
    name: "id",
    in: "path",
    required: true,
    description: "ID of the task to retrieve",
    schema: {
        type: "string"
    }
  }], 
  responses: {
      204: {
          description: "Task deleted successfully"
      },
      404: {
          description: "Task not found"
      }
  }
}


const _routes = {
  get,
  put,
  del
};

export default _routes;