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
    static ILLUST_PAGES_URL = 'https://www.pixiv.net/ajax/illust/{ARTWORK_ID}/pages'

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
            mode: props.r18 ? 'r18' : 'all',  // 根据 boolean 值设置 mode
            limit: 1
        }

        const url = `${PixivSourceProvider.DISCOVERY_URL}?mode=${requestParams.mode}&limit=${requestParams.limit}`

        const headers = {
            Referer: 'https://www.pixiv.net/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }

        // 如果配置了 PHPSESSID，则添加到 Cookie 中
        if (this.config.pixivPHPSESSID) {
            headers['Cookie'] = `PHPSESSID=${this.config.pixivPHPSESSID}`
        }

        try {
            const discoveryRes = await context.http.get<PixivResponse>(url, {
                headers,
                proxyAgent: this.config.isProxy
                    ? this.config.proxyHost
                    : undefined
            })

            if (discoveryRes.error || !discoveryRes.body.illusts.length) {
                return {
                    status: 'error',
                    data: new Error(discoveryRes.message || '未找到插画')
                }
            }

            const illust = discoveryRes.body.illusts[0]

            const illustPagesUrl = PixivSourceProvider.ILLUST_PAGES_URL.replace('{ARTWORK_ID}', illust.id)
            const illustPagesRes = await context.http.get(illustPagesUrl, {
                headers: {
                    Referer: 'https://www.pixiv.net/',
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                proxyAgent: this.config.isProxy
                    ? this.config.proxyHost
                    : undefined
            })

            if (illustPagesRes.error || !illustPagesRes.body.length) {
                return {
                    status: 'error',
                    data: new Error('无法获取原图链接')
                }
            }

            const originalUrl = illustPagesRes.body[0].urls.original

            // 使用 base URL 构造图片链接
            const baseUrl = this.config.baseUrl || 'i.pximg.net'
            const constructedUrl = originalUrl.replace('i.pximg.net', baseUrl)

            const generalImageData: GeneralImageData = {
                id: parseInt(illust.id),
                title: illust.title,
                author: illust.userName,
                r18: illust.xRestrict > 0,
                tags: illust.tags,
                extension: originalUrl.split('.').pop(),
                aiType: 0,
                uploadDate: new Date(illust.createDate).getTime(),
                urls: {
                    original: constructedUrl,
                    regular: illust.url.replace('i.pximg.net', baseUrl)
                }
            }

            return {
                status: 'success',
                data: {
                    url: constructedUrl,
                    urls: {
                        regular: illust.url.replace('i.pximg.net', baseUrl),
                        original: constructedUrl
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