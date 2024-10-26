import { Context } from 'koishi'
import type { Config } from '../../config'
import type {
    CommonSourceRequest,
    ImageMetaData,
    GeneralImageData,
    SourceResponse
} from '../../utils/type'
import { SourceProvider } from '../../utils/type'

interface PixivFollowingResponse {
    error: boolean
    message: string
    body: {
        users: {
            userId: string
            userName: string
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
        }[]
    }
}

interface PixivIllustPagesResponse {
    error: boolean
    message: string
    body: {
        urls: {
            original: string
        }
    }[]
}

export interface PixivFollowingSourceRequest {
    userId: string
    offset: number
    limit: number
}

export class PixivFollowingSourceProvider extends SourceProvider {
    static FOLLOWING_URL = 'https://www.pixiv.net/ajax/user/{USER_ID}/following?offset={OFFSET_COUNT}&limit={LIMIT_COUNT}&rest=show'
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
    ): Promise<SourceResponse<ImageMetaData>> {
        if (!this.config.pixivPHPSESSID) {
            return {
                status: 'error',
                data: new Error('未设置 Pixiv PHPSESSID')
            }
        }

        const requestParams: PixivFollowingSourceRequest = {
            userId: this.config.pixivFollowingUserId,
            offset: this.config.pixivFollowingOffset,
            limit: this.config.pixivFollowingLimit
        }

        const url = PixivFollowingSourceProvider.FOLLOWING_URL
            .replace('{USER_ID}', requestParams.userId)
            .replace('{OFFSET_COUNT}', requestParams.offset.toString())
            .replace('{LIMIT_COUNT}', requestParams.limit.toString())

        const headers = {
            Referer: 'https://www.pixiv.net/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            Cookie: `PHPSESSID=${this.config.pixivPHPSESSID}`
        }

        try {
            const followingRes = await context.http.get<PixivFollowingResponse>(url, {
                headers,
                proxyAgent: this.config.isProxy ? this.config.proxyHost : undefined
            })

            if (followingRes.error || !followingRes.body.users.length) {
                return {
                    status: 'error',
                    data: new Error(followingRes.message || '未找到关注的用户')
                }
            }

            // 从所有关注用户的插画中随机选择一张
            const allIllusts = followingRes.body.users.flatMap(user => user.illusts)
            const selectedIllust = this.shuffleArray(allIllusts)[0]

            if (!selectedIllust) {
                return {
                    status: 'error',
                    data: new Error('未找到插画')
                }
            }

            const illustPagesUrl = PixivFollowingSourceProvider.ILLUST_PAGES_URL.replace(
                '{ARTWORK_ID}',
                selectedIllust.id
            )
            const illustPagesRes = await context.http.get<PixivIllustPagesResponse>(illustPagesUrl, {
                headers,
                proxyAgent: this.config.isProxy ? this.config.proxyHost : undefined
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
                id: parseInt(selectedIllust.id),
                title: selectedIllust.title,
                author: selectedIllust.userName,
                r18: selectedIllust.xRestrict > 0,
                tags: selectedIllust.tags,
                extension: originalUrl.split('.').pop(),
                aiType: 0,
                uploadDate: new Date(selectedIllust.createDate).getTime(),
                urls: {
                    original: constructedUrl,
                    regular: selectedIllust.url.replace('i.pximg.net', baseUrl)
                }
            }

            return {
                status: 'success',
                data: {
                    url: constructedUrl,
                    urls: {
                        regular: selectedIllust.url.replace('i.pximg.net', baseUrl),
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

    private shuffleArray<T>(array: T[]): T[] {
        const shuffled = [...array]
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        return shuffled
    }

    setConfig(config: Config) {
        this._config = config
    }
}
