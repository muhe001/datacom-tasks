import { ConfigurationSet, ConfigurationSetTlsPolicy, EmailIdentity, Identity, SuppressionReasons } from 'aws-cdk-lib/aws-ses'
import { Construct } from 'constructs'

interface EmailProps {
  verifyUserEmail: string
  sandboxApprovedToEmails?: string[]
}

export default class Email extends Construct {
  readonly configurationSet: ConfigurationSet
  readonly verifyUserEmailIdentity: EmailIdentity
  constructor(scope: Construct, id: string, props: EmailProps) {
    super(scope, id)
    this.configurationSet = new ConfigurationSet(this, 'ConfigurationSet', {
      suppressionReasons: SuppressionReasons.COMPLAINTS_ONLY,
      tlsPolicy: ConfigurationSetTlsPolicy.REQUIRE,
    })
    this.verifyUserEmailIdentity = new EmailIdentity(this, 'VerifyUserEmail', {
      identity: Identity.email(props.verifyUserEmail),
    })

    props.sandboxApprovedToEmails?.map(email => {
      new EmailIdentity(this, `SandboxApprovedEmail_${email.replace(/[^a-zA-Z0-9]/g, '')}`, {
        identity: Identity.email(email),
      })
    })
  }
}