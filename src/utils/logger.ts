import { Context, Logger } from 'koishi'
import type { Config } from '../config'

export class PixlunaLogger {
    private logger: Logger
    private config: Config

    constructor(ctx: Context, config: Config) {
        this.logger = ctx.logger('pixluna')
        this.config = config
    }

    error(message: string, ...args: any[]) {
        this.logger.error(message, ...args)
    }

    success(message: string, ...args: any[]) {
        this.logger.success(message, ...args)
    }

    warn(message: string, ...args: any[]) {
        this.logger.warn(message, ...args)
    }

    info(message: string, ...args: any[]) {
        this.logger.info(message, ...args)
    }

    debug(message: string, ...args: any[]) {
        if (this.config.isLog) {
            this.logger.debug(message, ...args)
        }
    }
}

export function createLogger(ctx: Context, config: Config): PixlunaLogger {
    return new PixlunaLogger(ctx, config)
}
