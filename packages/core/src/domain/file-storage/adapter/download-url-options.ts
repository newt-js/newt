export type DownloadUrlOptions = {
  expiresIn: number
  contentType: string
  filename?: string
  disposition?: 'attachment' | 'inline'
}
