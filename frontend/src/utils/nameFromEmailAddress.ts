export function nameFromEmailAddress(emailAddress: string) {
  const emailName = emailAddress.split('@')[0]
  const emailNameWithoutNumbers = emailName.replace(/\d/g, '')
  return emailNameWithoutNumbers.split(/[.+_-]/g).map(part => part[0].toUpperCase() + part.slice(1)).join(' ')
}
