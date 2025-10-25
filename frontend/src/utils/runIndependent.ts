import { logger } from './logger'

export function runIndependent(fn: () => Promise<any>) {
  fn().catch((err) => {
    logger.info('Error occurred while running independent function: ' + JSON.stringify({
      ...err,
      message: err.message,
      stack: err.stack
    }))
  })
}
