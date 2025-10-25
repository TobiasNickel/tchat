import * as crypto from 'node:crypto'

export const passwordHasher = {
  hash: function hash (password: string): string {
    const salt = crypto.randomBytes(16).toString('hex')
    return salt + '.' + crypto.createHmac('sha256', salt).update(password).digest('hex')
  },

  compare: function compare (password: string, hash: string): boolean {
    const [salt, key] = hash.split('.')
    return key === crypto.createHmac('sha256', salt).update(password).digest('hex')
  }
}
