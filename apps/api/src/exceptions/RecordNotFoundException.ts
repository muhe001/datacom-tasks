import { exceptions } from '@repo/common'

export class RecordNotFoundException extends exceptions.ClientException {
  constructor({ recordType, recordId }: { recordType: string; recordId: string }) {
    super({
      name: 'RecordNotFoundException',
      message: `The requested record couldn't be found. Record Type: ${recordType}; Record ID: ${recordId}`,
    })
  }
}
