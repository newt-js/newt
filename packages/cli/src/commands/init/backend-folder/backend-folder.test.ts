import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
// --------------------------------------------------------
import { Ask }            from '../../command'
import { SUGGESTED_NAME } from './backend-folder'
import { backendFolder }  from './backend-folder'

function answering(answer: string, questions: string[] = []): Ask {
  return async (question, suggested) => {
    questions.push(`${question} (${suggested})`)
    return answer
  }
}

describe('backendFolder', () => {
  test('a new folder with the name given, without asking', async () => {
    const questions: string[] = []
    expect(await backendFolder(['shop'], '/work', answering('other', questions))).toEqual({ folder: 'shop', name: 'shop' })
    expect(questions).toEqual([])
  })

  test('asks for the name when there is someone to ask', async () => {
    const questions: string[] = []
    expect(await backendFolder([], '/work', answering('shop', questions))).toEqual({ folder: 'shop', name: 'shop' })
    expect(questions).toEqual([`What is your backend named? (${SUGGESTED_NAME})`])
  })

  test('without a name nor someone to ask, says how to give it', async () => {
    await expect(backendFolder([], '/work', null)).rejects.toThrow("newt init needs the backend's name: newt init <name>, or newt init . for this folder")
  })

  test('. is this folder, named after it', async () => {
    expect(await backendFolder(['.'], '/work/Mi Tienda', null)).toEqual({ folder: '.', name: 'mi-tienda' })
  })

  test('refuses a name that cannot name a folder and a package, saying one that would', async () => {
    await expect(backendFolder(['Mi Tienda'], '/work', null)).rejects.toThrow("'Mi Tienda' cannot name a backend: use lowercase letters, digits and - . _ ~, as in 'mi-tienda'")
    await expect(backendFolder([], '/work', answering('@acme/shop'))).rejects.toThrow("'@acme/shop' cannot name a backend")
  })

  test('takes one name only', async () => {
    await expect(backendFolder(['a', 'b'], '/work', null)).rejects.toThrow('newt init takes one name, and was given a b')
  })
})
