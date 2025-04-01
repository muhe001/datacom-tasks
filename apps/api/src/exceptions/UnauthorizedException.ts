import { exceptions } from '@repo/common'

export class UnauthorizedException extends exceptions.ClientException {
  constructor({ message = 'Unauthorized' }: { message?: string } = {}) {
    super({
      name: 'UnauthorizedException',
      message,
    })
  }
}
