import { UploadAddressOptions } from '../adapter/upload-address-options'

export type UploadUrlOptions = UploadAddressOptions & {
  maxBytes?: number | undefined
}
