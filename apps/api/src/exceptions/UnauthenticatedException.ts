import { exceptions } from '@repo/common'

export class UnauthenticatedException extends exceptions.ClientException {
  constructor({ message = 'Unauthenticated' }: { message?: string } = {}) {
    super({
      name: 'UnauthenticatedException',
      message,
    })
  }
}
