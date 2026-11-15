export type S3StorageOptions = {
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
  region?: string
  endpoint?: string
  virtualHostedStyle?: boolean
}

export type S3PublicStorageOptions = S3StorageOptions & {
  publicUrl: string
}
