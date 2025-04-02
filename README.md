# Tasks
## Pre-requisites
- [AWS Account + CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-quickstart.html)
- Node.js
- pnpm
- truborepo installed

## Getting started

1. Run `turbo build` 
2. Run `pnpm run init:dev`to deploy a dev instance to your AWS account
Run `pnpm run init:dev` . This command does the following:

This will create a new entry in `~/.aws/credentials` called `datacom-test` using credentials copied from the `default` profile. It then bootstraps CDK in the AWS account, deploys to AWS, then copies CloudFormation/CDK outputs to local `.env` files

## Demo
*Live Example:* https://development.d1u3347j7c5r17.amplifyapp.com/
- Use existing user, or register new - email verification is turned off, so fake email can be used

*OpenAPI Docs:* https://lgblb7xaeb.execute-api.ap-southeast-2.amazonaws.com/api-docs
