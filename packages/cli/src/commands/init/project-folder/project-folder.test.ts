import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
// --------------------------------------------------------
import type { Ask }       from '../../command'
import { SUGGESTED_NAME } from './project-folder'
import { projectFolder }  from './project-folder'

function answering(answer: string, questions: string[] = []): Ask {
  return async (question, suggested) => {
    questions.push(`${question} (${suggested})`)
    return answer
  }
}

describe('projectFolder', () => {
  test('a new folder with the name given, without asking', async () => {
    const questions: string[] = []
    expect(await projectFolder(['shop'], '/work', answering('other', questions))).toEqual({ folder: 'shop', name: 'shop' })
    expect(questions).toEqual([])
  })

  test('asks for the name when there is someone to ask', async () => {
    const questions: string[] = []
    expect(await projectFolder([], '/work', answering('shop', questions))).toEqual({ folder: 'shop', name: 'shop' })
    expect(questions).toEqual([`What is your project named? (${SUGGESTED_NAME})`])
  })

  test('without a name nor someone to ask, says how to give it', async () => {
    await expect(projectFolder([], '/work', null)).rejects.toThrow("newt init needs the project's name: newt init <name>, or newt init . for this folder")
  })

  test('. is this folder, named after it', async () => {
    expect(await projectFolder(['.'], '/work/Mi Tienda', null)).toEqual({ folder: '.', name: 'mi-tienda' })
  })

  test('refuses a name that cannot name a folder and a package', async () => {
    await expect(projectFolder(['Mi Tienda'], '/work', null)).rejects.toThrow("'Mi Tienda' cannot name a folder and a package")
    await expect(projectFolder([], '/work', answering('@acme/shop'))).rejects.toThrow("'@acme/shop' cannot name a folder and a package")
  })

  test('takes one name only', async () => {
    await expect(projectFolder(['a', 'b'], '/work', null)).rejects.toThrow('newt init takes one name, and was given a b')
  })
})
