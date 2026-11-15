export const isMissing = (error: unknown) => (error as { code?: string }).code === 'NoSuchKey'
