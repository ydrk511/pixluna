import { Context } from 'koishi'
import { Config } from '../config'
import { fileTypeFromBuffer } from 'file-type'
import { taskTime } from './data'
import type {} from '@koishijs/plugin-proxy-agent'

export async function fetchImageBuffer(
    ctx: Context,
    config: Config,
    url: string
): Promise<[ArrayBuffer, string]> {
    return taskTime(ctx, 'fetchImage', async () => {
        const response = await ctx.http.get(url, {
            responseType: 'arraybuffer',
            proxyAgent: config.isProxy ? config.proxyHost : undefined
        })

        const fileType = await fileTypeFromBuffer(response)
        const mimeType = fileType?.mime || 'application/octet-stream'

        return [response, mimeType]
    })
}
