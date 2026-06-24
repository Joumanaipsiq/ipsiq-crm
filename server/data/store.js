import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const FILES = {
  users: path.join(__dirname, 'users.json'),
  crm:   path.join(__dirname, 'crm-data.json'),
}

async function readJSON(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf-8'))
  } catch {
    return fallback
  }
}

async function writeJSON(file, data) {
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf-8')
}

export async function initData() {
  // Seed admin user on first run
  const users = await readJSON(FILES.users, [])
  if (users.length === 0) {
    const tempPassword = crypto.randomBytes(8).toString('hex')
    const hash = await bcrypt.hash(tempPassword, 12)
    await writeJSON(FILES.users, [{
      id: '1',
      username: 'admin',
      passwordHash: hash,
      role: 'admin',
      createdAt: new Date().toISOString(),
    }])
    console.log('\n========================================')
    console.log('  IPSIQ CRM — First Run Setup')
    console.log('  Default admin credentials:')
    console.log('    Username : admin')
    console.log(`    Password : ${tempPassword}`)
    console.log('  Change this password after first login!')
    console.log('========================================\n')
  }

  // Seed empty CRM data
  const crm = await readJSON(FILES.crm, null)
  if (!crm) {
    await writeJSON(FILES.crm, {
      leads: [],
      settings: {
        types:     ['IFA', 'SO/Association', 'Bank', 'Insurer', 'Pension Fund', 'Employer'],
        languages: ['DE', 'FR', 'IT', 'EN'],
        stages:    ['Identified', 'Contacted', 'Follow-up', 'Responded', 'Meeting', 'Closed'],
      },
    })
  }
}

export const usersStore = {
  getAll: ()      => readJSON(FILES.users, []),
  save:   (users) => writeJSON(FILES.users, users),
}

export const crmStore = {
  get:  ()     => readJSON(FILES.crm, { leads: [], settings: {} }),
  save: (data) => writeJSON(FILES.crm, data),
}
