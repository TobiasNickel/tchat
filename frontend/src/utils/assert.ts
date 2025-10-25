import { AppError } from './AppError'

/**
 * throw an error with code 404
 * @param entity the object to test
 * @param name the name within the error message
 */
export function found<T> (entity: T, name: string): asserts entity is NonNullable<T> {
  if (!entity) {
    throw new AppError(`${name} not found`, 'NOT_FOUND', 404, { name })
  }
}

export function assert<T> (condition: T, text: string, statusCode?: number, meta: any = {}): asserts condition is NonNullable<T> {
  if (!statusCode) {
    statusCode = 400
  }
  if (!condition) {
    throw new AppError('Assertion failed: ' + text, text, statusCode, { condition, ...(meta || {}) })
  }
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function isUUID (uuid?: string): boolean {
  if (!uuid) return false
  return uuidRegex.test(uuid)
}

export function assertUUIDv4 (uuid: string | undefined, name: string, meta: any = {}): asserts uuid is string {
  if (!isUUID(uuid)) {
    throw new AppError(`${name} is not a valid UUIDv4`, 'INVALID_UUID', 400, { name, ...(meta || {}) })
  }
}

export function assertStringList (s: string, entityName: string) {
  assert(typeof s === 'string', entityName + ' is required', 400)
  if (!s.length) {
    assert(s.startsWith(',') && s.endsWith(','), entityName + ' should start and end with a comma', 400)
  }
}

/**
 * throw an error with code 400
 * to do a number of validations and throw a single combined error.
 */
export class MultiAsserter {
  private readonly errors: AppError[] = []
  public addError (asserter: MultiAsserter | AppError) {
    if (asserter instanceof MultiAsserter) {
      this.errors.push(...asserter.errors)
      return
    }
    if (asserter instanceof AppError) {
      this.errors.push(asserter)
    }
  }

  public assert<T> (condition: T, text: string, CODE?: string, meta?: any): asserts condition is NonNullable<T> {
    if (!condition) {
      this.errors.push(new AppError(text, CODE || 'ERROR', meta))
    }
  }

  public throwIfAny () {
    if (this.errors.length > 0) {
      throw new AppError('There are a few errors.', 'MULTI_ERROR', 400, { errors: this.errors })
    }
  }
}
