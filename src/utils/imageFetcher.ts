import { Context } from 'koishi'
import { Config } from '../config'
import { taskTime } from './data'
import type {} from '@koishijs/plugin-proxy-agent'
import { logger } from '../index'

// 添加一个新的函数来检测MIME类型
function detectMimeType(buffer: ArrayBuffer): string {
    const arr = new Uint8Array(buffer).subarray(0, 4)
    let header = ''
    for (let i = 0; i < arr.length; i++) {
        header += arr[i].toString(16)
    }

    switch (header) {
        case '89504e47':
            return 'image/png'
        case 'ffd8ffe0':
        case 'ffd8ffe1':
        case 'ffd8ffe2':
            return 'image/jpeg'
        case '47494638':
            return 'image/gif'
        default:
            return 'application/octet-stream'
    }
}

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

        // 使用新的detectMimeType函数来获取MIME类型
        const mimeType = detectMimeType(response)

        // 使用logger打印获取到的MIME类型
        logger.debug('检测到MIME类型', { mimeType })

        return [response, mimeType]
    })
}
