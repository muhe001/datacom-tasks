import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import type { Entity } from 'dynamodb-toolbox'
import type { Filter } from '@repo/common'
import type { ScanOptions } from '../../node_modules/dynamodb-toolbox/dist/esm/classes/Table/types'
import { getAwsClientConfig } from '@repo/common-aws'

const dynamodbClient = new DynamoDBClient(getAwsClientConfig())
export const dynamoDbDocumentClient = DynamoDBDocumentClient.from(dynamodbClient)

interface DynamoCreateItemParams {
  entity: Entity
  attributes: any
}

// tslint:disable-next-line
export function dynamoCreateItem({ entity, attributes }: DynamoCreateItemParams): Promise<any> {
  return entity.put(attributes, {
    conditions: [
      {
        attr: entity.schema.keys.partitionKey,
        exists: false,
      },
    ],
  })
}

interface ScanAllParams {
  entity: Entity
  scanOptions?: ScanOptions
  maxPages?: number
  maxItems?: number
  filter?: Filter
}

export async function scanAll({ entity, scanOptions, maxPages = Infinity, maxItems = Infinity, filter }: ScanAllParams) {
  let scanPromise = entity.scan({
    limit: maxItems,
    ...scanOptions,
  })
  let latestScanResult
  let pageIndex = 0
  const items: any[] = []

  do {
    latestScanResult = await scanPromise

    if (latestScanResult.next && latestScanResult.LastEvaluatedKey) {
      scanPromise = latestScanResult.next()
    }

    let data = latestScanResult.Items

    if (data && filter) {
      const filterOperator = filter.operator ?? 'OR'
      const filterMethod = filterOperator === 'AND' ? 'every' : 'some'
      data = data.filter((datum) => {
        return filter.filters[filterMethod]((f) => `${datum[f.property]}`.toLowerCase().includes(`${f.value}`.toLowerCase()))
      })
    }

    if (data?.length) {
      items.push(...data)
    }

    ++pageIndex
  } while (latestScanResult.LastEvaluatedKey && pageIndex < maxPages && items.length < maxItems)

  const itemsLimited = items.slice(0, maxItems)

  return {
    Items: itemsLimited,
    LastEvaluatedKey: latestScanResult.LastEvaluatedKey,
    latestScanResult,
  }
}

export function getAttributesWithout({ attributes, without = [] }: { attributes: {[key: string]: any}; without: string[] }): any {
  if (!without.length) return attributes
  const attributesWithout: { [key: string]: any} = {}

  Object.entries(attributes).forEach(([k, v]) => {
    if (!without.includes(k)) {
      attributesWithout[k] = v
    }
  })

  return attributesWithout
}
