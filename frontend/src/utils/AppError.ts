/**
 * Custom error class for this application. It can be used for logical errors that can be returned to the client safely.
 */
export class AppError extends Error {
  code: string
  statusCode: number
  meta: any
  time: number

  /**
   *
   * @param message text message
   * @param code
   * @param statusCode
   * @param meta
   */
  constructor (message: string, code: string, statusCode?: number, meta?: any) {
    super(message)
    this.code = code ?? 'APP_ERROR'
    this.statusCode = statusCode ?? 400
    this.meta = meta
    this.time = Date.now()
  }
}
