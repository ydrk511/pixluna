import { Context } from 'koishi'
import { Config } from '../config'
import { fileTypeFromBuffer } from 'file-type'
import { taskTime } from './data'
import type {} from '@koishijs/plugin-proxy-agent'
import { createLogger } from './logger'

export async function fetchImageBuffer(
    ctx: Context,
    config: Config,
    url: string
): Promise<[ArrayBuffer, string]> {
    const logger = createLogger(ctx, config)

    return taskTime(ctx, 'fetchImage', async () => {
        const response = await ctx.http.get(url, {
            responseType: 'arraybuffer',
            proxyAgent: config.isProxy ? config.proxyHost : undefined
        })

        const fileType = await fileTypeFromBuffer(response)
        const mimeType = fileType?.mime || 'application/octet-stream'

        logger.debug(`获取到的图片 MIME type: ${mimeType}`)

        return [response, mimeType]
    })
}
