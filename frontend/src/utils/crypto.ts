import crypto from 'node:crypto'

export const rsa = {
  createKeyPair () {
    const pair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    })
    return {
      publicKey: Buffer.from(pair.publicKey).toString('base64'),
      privateKey: Buffer.from(pair.privateKey).toString('base64')
    }
  },
  encrypt(data: string, publicKey: string) {
    const base64Key = publicKey 

    const publicKeyPem = Buffer.from(base64Key, 'base64').toString('utf8')
    const encryptedData = crypto.publicEncrypt(
      {
        key: publicKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      Buffer.from(data, 'utf8') as any
    )
    return encryptedData.toString('base64')
  },
  decrypt(data: string, privateKey: string) {
    return crypto.privateDecrypt({
      key: Buffer.from(privateKey, 'base64').toString('utf8'),
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    }, Buffer.from(data, 'base64') as any).toString('utf8')
  }
}

export const sha256 = (data: string) => {
  return crypto.createHash('sha256')
    .update(data)
    .digest('hex')
}

// const keyPair = rsa.createKeyPair()
// console.log('keys', keyPair)
// const encrypted = rsa.encrypt('Hello, World!', keyPair.publicKey)
// console.log('Encrypted:', encrypted)
// const decrypted = rsa.decrypt(encrypted, keyPair.privateKey)
// console.log('Decrypted:', decrypted) // Should print: Hello, World!
