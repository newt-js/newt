import { Entity }                      from '@newt-js/core'
import type { EntityInput }            from '@newt-js/core'
// --------------------------------------------------------
import { OauthSigningKey_Created }     from './events/oauth-signing-key-created'
import type { OauthSigningKeyFields }  from './oauth-signing-key.schema'
import { OauthSigningKeyPublicSchema } from './oauth-signing-key.schema'
import { OauthSigningKeySchema }       from './oauth-signing-key.schema'
import type { PublicJwk }              from './oauth-signing-key.schema'
import type { OauthSigningKeyId }      from './value-objects/oauth-signing-key-id'

export type OauthSigningKeyGenerateProps = {
  id: OauthSigningKeyId,
  publicJwk: PublicJwk,
  privateKeyEncrypted: string,
}

export class OauthSigningKey extends Entity<typeof OauthSigningKeySchema, typeof OauthSigningKeyPublicSchema> {

  private constructor(input: EntityInput<OauthSigningKeyFields>, isNew: boolean) {
    super(OauthSigningKeySchema, input, isNew, OauthSigningKeyPublicSchema)
  }

  static fromDTO(row: OauthSigningKeyFields & { version: number }): OauthSigningKey {
    return new OauthSigningKey(row, false)
  }

  /** A new key, made by the module: its private half comes already encrypted. */
  static generate(props: OauthSigningKeyGenerateProps): OauthSigningKey {
    const key = new OauthSigningKey({ ...props, retiredAt: null }, true)
    key.trackEvent(new OauthSigningKey_Created(key.toDTO()))
    return key
  }

  /** The private half, encrypted: only the module that signs reads it. */
  get privateKeyEncrypted(): string {
    return this.data.privateKeyEncrypted
  }

}
