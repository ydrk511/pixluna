import { Context } from 'koishi'
import type { Config } from '../../config'
import type {
    CommonSourceRequest,
    ImageMetaData,
    GeneralImageData,
    SourceResponse
} from '../../utils/type'
import { SourceProvider } from '../../utils/type'

interface PixivResponse {
    error: boolean
    message: string
    body: {
        illusts: {
            id: string
            title: string
            url: string
            tags: string[]
            userId: string
            userName: string
            width: number
            height: number
            pageCount: number
            xRestrict: number
            createDate: string
        }[]
    }
}

export interface PixivSourceRequest {
    mode: string
    limit: number
}

export class PixivSourceProvider extends SourceProvider {
    static DISCOVERY_URL = 'https://www.pixiv.net/ajax/illust/discovery'

    private _config: Config

    get config(): Config {
        if (!this._config) {
            throw new Error('配置未设置。请在使用提供程序之前调用 setConfig。')
        }
        return this._config
    }

    async getMetaData(
        { context }: { context: Context },
        props: CommonSourceRequest
    ): Promise<SourceResponse<ImageMetaData>> {
        const requestParams: PixivSourceRequest = {
            mode: 'all',
            limit: 1
        }

        const url = `${PixivSourceProvider.DISCOVERY_URL}?mode=${requestParams.mode}&limit=${requestParams.limit}`

        try {
            const res = await context.http.get<PixivResponse>(url, {
                headers: {
                    Referer: 'https://www.pixiv.net/',
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                proxyAgent: this.config.isProxy
                    ? this.config.proxyHost
                    : undefined
            })

            if (res.error || !res.body.illusts.length) {
                return {
                    status: 'error',
                    data: new Error(res.message || '未找到插画')
                }
            }

            // 随机选择一个插画
            const illust =
                res.body.illusts[
                    Math.floor(Math.random() * res.body.illusts.length)
                ]

            // 构建图片URL，使用配置的baseUrl
            const imageUrl = `https://${this.config.baseUrl}/img-original/img/${illust.createDate.slice(0, 10).replace(/-/g, '/')}/${illust.id}_p0.jpg`

            const generalImageData: GeneralImageData = {
                id: parseInt(illust.id),
                title: illust.title,
                author: illust.userName,
                r18: illust.xRestrict > 0,
                tags: illust.tags,
                extension: 'jpg',
                aiType: 0, // Pixiv API 不提供 AI 类型信息，默认为 0
                uploadDate: new Date(illust.createDate).getTime(),
                urls: {
                    original: imageUrl,
                    regular: illust.url
                }
            }

            return {
                status: 'success',
                data: {
                    url: imageUrl,
                    urls: {
                        regular: illust.url,
                        original: imageUrl
                    },
                    raw: generalImageData
                }
            }
        } catch (error) {
            return {
                status: 'error',
                data: error
            }
        }
    }

    setConfig(config: Config) {
        this._config = config
    }
}
