import { OpenAPIV3 } from "openapi-types";

const doc: OpenAPIV3.Document = {
  openapi: "3.0.0",
  info: {
    title: "Task API",
    version: "1.0.0"
  },
  paths: {},
  components: {
    schemas: {
      Resource: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Unique identifier of the resource"
          }
        }
      },
      Task: {
        type: "object",
        // required: [
        //   "title",
        //   "description",
        //   "status"s
        // ],
        properties: {
          // title: {
          //   type: "string",
          //   description: "Title of the task"
          // },
          // description: {
          //   type: "string",
          //   description: "Description of the task"
          // },
          // status: {
          //   type: "string",
          //   enum: [
          //     "ToDo",
          //     "InProgress",
          //     "Completed"
          //   ],
          //   description: "Current status of the task"
        }
      },
      TaskResource: {
        allOf: [
          {
            $ref: "#/components/schemas/Resource"
          },
          {
            $ref: "#/components/schemas/Task"
          }
        ]
      },
      List: {
        type: "object",
        required: [
          "data",
          "lastEvaluatedKey"
        ],
        properties: {
          data: {
            type: "array",
            items: {
              oneOf: [{
                $ref: "#/components/schemas/TaskResource",
              }]
            }
          },
          lastEvaluatedKey: {
            type: "string"
          }
        }
      },
      TaskList: {
        allOf: [
          {
            $ref: "#/components/schemas/List"
          },
          {
            properties: {
              data: {
                type: "array",
                items: {
                  $ref: "#/components/schemas/TaskResource"
                }
              }
            }
          }
        ]
      }
    }
  }
}

export default doc;