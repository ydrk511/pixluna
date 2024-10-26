import { Context } from 'koishi'
import type { Config } from '../../config'
import type {
    CommonSourceRequest,
    ImageMetaData,
    GeneralImageData,
    SourceResponse
} from '../../utils/type'
import { SourceProvider } from '../../utils/type'
import { shuffleArray } from '../../utils/shuffle'
import { PixlunaLogger, createLogger } from '../../utils/logger'

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
    static FOLLOWING_URL =
        'https://www.pixiv.net/ajax/user/{USER_ID}/following?offset={OFFSET_COUNT}&limit={LIMIT_COUNT}&rest=show'
    static ILLUST_PAGES_URL =
        'https://www.pixiv.net/ajax/illust/{ARTWORK_ID}/pages'

    private logger: PixlunaLogger

    constructor(ctx: Context, config: Config) {
        super(ctx, config)
        this.logger = createLogger(ctx, config)
    }

    async getMetaData(
        { context }: { context: Context },
        props: CommonSourceRequest
    ): Promise<SourceResponse<ImageMetaData>> {
        this.logger.debug('开始获取 Pixiv Following 元数据')
        if (!this.config.pixiv.phpSESSID) {
            this.logger.error('未设置 Pixiv PHPSESSID')
            return {
                status: 'error',
                data: new Error('未设置 Pixiv PHPSESSID')
            }
        }

        const requestParams: PixivFollowingSourceRequest = {
            userId: this.config.pixiv.following.userId,
            offset: this.config.pixiv.following.offset,
            limit: this.config.pixiv.following.limit
        }

        const url = PixivFollowingSourceProvider.FOLLOWING_URL.replace(
            '{USER_ID}',
            requestParams.userId
        )
            .replace('{OFFSET_COUNT}', requestParams.offset.toString())
            .replace('{LIMIT_COUNT}', requestParams.limit.toString())

        this.logger.debug(`请求 URL: ${url}`)

        const headers = {
            Referer: 'https://www.pixiv.net/',
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            Cookie: `PHPSESSID=${this.config.pixiv.phpSESSID}`
        }

        try {
            const followingRes = await context.http.get<PixivFollowingResponse>(
                url,
                {
                    headers,
                    proxyAgent: this.config.isProxy
                        ? this.config.proxyHost
                        : undefined
                }
            )

            if (followingRes.error || !followingRes.body.users.length) {
                this.logger.error(
                    'Pixiv Following API 返回错误或无关注用户',
                    followingRes.error
                )
                return {
                    status: 'error',
                    data: new Error(followingRes.message || '未找到关注的用户')
                }
            }

            this.logger.debug(
                `成功获取 ${followingRes.body.users.length} 个关注用户`
            )
            const allIllusts = followingRes.body.users.flatMap(
                (user) => user.illusts
            )
            const selectedIllust = shuffleArray(allIllusts)[0]

            if (!selectedIllust) {
                this.logger.error('未找到插画')
                return {
                    status: 'error',
                    data: new Error('未找到插画')
                }
            }

            this.logger.debug(`随机选择插画 ID: ${selectedIllust.id}`)

            const illustPagesUrl =
                PixivFollowingSourceProvider.ILLUST_PAGES_URL.replace(
                    '{ARTWORK_ID}',
                    selectedIllust.id
                )
            const illustPagesRes =
                await context.http.get<PixivIllustPagesResponse>(
                    illustPagesUrl,
                    {
                        headers,
                        proxyAgent: this.config.isProxy
                            ? this.config.proxyHost
                            : undefined
                    }
                )

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

            this.logger.debug('成功获取图片元数据', JSON.stringify(generalImageData, null, 2))

            return {
                status: 'success',
                data: {
                    url: constructedUrl,
                    urls: {
                        regular: selectedIllust.url.replace(
                            'i.pximg.net',
                            baseUrl
                        ),
                        original: constructedUrl
                    },
                    raw: generalImageData
                }
            }
        } catch (error) {
            this.logger.error('获取 Pixiv Following 元数据时发生错误', error)
            return {
                status: 'error',
                data: error
            }
        }
    }

    setConfig(config: Config) {
        this.config = config
        this.logger = createLogger(this.ctx, config)
    }
}
