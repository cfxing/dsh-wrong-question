import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import type { SkillRegistration } from '@deepseek-ai/dsh-skill'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SKILLS_DIR = join(__dirname, '..', 'skills')

interface WrongQuestionSkill {
  name: string
  description: string
  whenToUse?: string
  content: string
  modelInvocable?: boolean
  userInvocable?: boolean
}

function parseSkill(file: string, fallbackName: string): WrongQuestionSkill {
  const raw = readFileSync(file, 'utf8')
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw)
  if (!match) return { name: fallbackName, description: `Skill ${fallbackName}`, content: raw }
  const meta: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':')
    if (idx <= 0) continue
    const key = line.slice(0, idx).trim()
    meta[key] = line.slice(idx + 1).trim().replace(/^[\"']|[\"']$/g, '')
  }
  return {
    name: meta.name ?? fallbackName,
    description: meta.description ?? `Skill ${fallbackName}`,
    whenToUse: meta.whenToUse || undefined,
    content: match[2].trim(),
    modelInvocable: meta['disable-model-invocation'] === 'true' ? false : true,
    userInvocable: meta['user-invocable'] === 'false' ? false : true,
  }
}

export function registerWrongQuestionSkills(ctx: Context): void {
  const file = join(SKILLS_DIR, 'learning-variant', 'SKILL.md')
  if (!existsSync(file)) return
  const skill = parseSkill(file, 'learning-variant')
  const registration: SkillRegistration = {
    ...skill,
    source: 'runtime',
    provider: 'wrong-question',
    invocation: {
      modelInvocable: skill.modelInvocable ?? true,
      userInvocable: skill.userInvocable ?? true,
    },
  }
  ctx.skills.register(registration)
}

export const skillsDirectory = SKILLS_DIR
