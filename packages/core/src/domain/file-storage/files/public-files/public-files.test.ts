import { describe }            from 'bun:test'
import { expect }              from 'bun:test'
import { test }                from 'bun:test'
// --------------------------------------------------------
import { MemoryPublicStorage } from '../../../../adapters/files/memory/memory-public-storage/memory-public-storage'
import { PublicFiles }         from './public-files'

describe('PublicFiles', () => {
  test('gives each file its address for good, under its prefix', () => {
    const files = new PublicFiles(new MemoryPublicStorage(), 'avatars').in('u1')

    expect(files.url('face.png')).toBe('memory://public/avatars/u1/face.png')
  })
})
