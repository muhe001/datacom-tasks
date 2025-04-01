import { exceptions } from '@repo/common'
import type { StringMap } from '@repo/common'

const { ClientException } = exceptions

export default class UnsupportedIdentityProviderNameException extends ClientException {
  constructor({ providerName, validIdentityProviderNamesMap }: { providerName: string; validIdentityProviderNamesMap: StringMap }) {
    super({
      name: 'UnsupportedIdentityProviderNameException',
      message: `Unsupported Identity Provider: ${providerName}. Valid Identity Providers: ${JSON.stringify(validIdentityProviderNamesMap)}.`,
    })
  }
}
