import { Context } from 'koishi'
import type { Config } from '../../config'
import type {
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

interface PixivUserProfileResponse {
    error: boolean
    message: string
    body: {
        illusts: { [key: string]: null }
        // ... 其他字段 ...
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
    static USER_PROFILE_URL =
        'https://www.pixiv.net/ajax/user/{USER_ID}/profile/all'

    private logger: PixlunaLogger

    constructor(ctx: Context, config: Config) {
        super(ctx, config)
        this.logger = createLogger(ctx, config)
    }

    async getMetaData(
        { context }: { context: Context },
    ): Promise<SourceResponse<ImageMetaData>> {
        this.logger.debug('开始获取 Pixiv Following 元数据')
        if (!this.config.pixiv.phpSESSID) {
            this.logger.error('未设置 Pixiv PHPSESSID')
            return {
                status: 'error',
                data: new Error('未设置 Pixiv PHPSESSID')
            }
        }

        try {
            // 获取关注列表
            const followingRes = await this.getFollowingUsers(context)

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

            // 随机选择一个关注的用户
            const randomUser = shuffleArray(followingRes.body.users)[0]
            this.logger.debug(
                `随机选择用户: ${randomUser.userName} (ID: ${randomUser.userId})`
            )

            // 获取该用户的所有作品
            const userProfileRes = await this.getUserProfile(
                context,
                randomUser.userId
            )

            if (userProfileRes.error || !userProfileRes.body.illusts) {
                this.logger.error('获取用户作品列表失败', userProfileRes.error)
                return {
                    status: 'error',
                    data: new Error('无法获取用户作品列表')
                }
            }

            // 从作品列表中随机选择一个
            const illustIds = Object.keys(userProfileRes.body.illusts)
            const randomIllustId = shuffleArray(illustIds)[0]

            // 获取插画详情
            const illustDetail = await this.getIllustDetail(
                context,
                randomIllustId
            )

            if (!illustDetail) {
                return {
                    status: 'error',
                    data: new Error('无法获取插画详情')
                }
            }

            // 获取插画页面信息（包含原始URL）
            const illustPages = await this.getIllustPages(
                context,
                randomIllustId
            )

            if (illustPages.error || !illustPages.body.length) {
                return {
                    status: 'error',
                    data: new Error('无法获取插画页面信息')
                }
            }

            const originalUrl = illustPages.body[0].urls.original

            // 构造返回数据
            const generalImageData: GeneralImageData = {
                id: parseInt(randomIllustId),
                title: illustDetail.title,
                author: illustDetail.userName,
                r18: illustDetail.xRestrict > 0,
                tags: illustDetail.tags,
                extension: originalUrl.split('.').pop(),
                aiType: 0,
                uploadDate: new Date(illustDetail.createDate).getTime(),
                urls: {
                    original: this.constructImageUrl(originalUrl)
                }
            }

            this.logger.debug(
                '成功获取图片元数据',
                JSON.stringify(generalImageData, null, 2)
            )

            return {
                status: 'success',
                data: {
                    url: generalImageData.urls.original,
                    urls: generalImageData.urls,
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

    private async getFollowingUsers(
        context: Context
    ): Promise<PixivFollowingResponse> {
        const url = PixivFollowingSourceProvider.FOLLOWING_URL.replace(
            '{USER_ID}',
            this.config.pixiv.following.userId
        )
            .replace(
                '{OFFSET_COUNT}',
                this.config.pixiv.following.offset.toString()
            )
            .replace(
                '{LIMIT_COUNT}',
                this.config.pixiv.following.limit.toString()
            )

        return await context.http.get<PixivFollowingResponse>(url, {
            headers: this.getHeaders(),
            proxyAgent: this.getProxyAgent()
        })
    }

    private async getUserProfile(
        context: Context,
        userId: string
    ): Promise<PixivUserProfileResponse> {
        const url = PixivFollowingSourceProvider.USER_PROFILE_URL.replace(
            '{USER_ID}',
            userId
        )
        return await context.http.get<PixivUserProfileResponse>(url, {
            headers: this.getHeaders(),
            proxyAgent: this.getProxyAgent()
        })
    }

    private async getIllustDetail(
        context: Context,
        illustId: string
    ): Promise<any> {
        const url = `https://www.pixiv.net/ajax/illust/${illustId}`
        const response = await context.http.get<any>(url, {
            headers: this.getHeaders(),
            proxyAgent: this.getProxyAgent()
        })
        return response.body
    }

    private async getIllustPages(
        context: Context,
        illustId: string
    ): Promise<PixivIllustPagesResponse> {
        const url = PixivFollowingSourceProvider.ILLUST_PAGES_URL.replace(
            '{ARTWORK_ID}',
            illustId
        )
        return await context.http.get<PixivIllustPagesResponse>(url, {
            headers: this.getHeaders(),
            proxyAgent: this.getProxyAgent()
        })
    }

    private getHeaders() {
        return {
            Referer: 'https://www.pixiv.net/',
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            Cookie: `PHPSESSID=${this.config.pixiv.phpSESSID}`
        }
    }

    private getProxyAgent() {
        return this.config.isProxy ? this.config.proxyHost : undefined
    }

    private constructImageUrl(originalUrl: string): string {
        const baseUrl = this.config.baseUrl || 'i.pximg.net'
        return originalUrl.replace('i.pximg.net', baseUrl)
    }

    setConfig(config: Config) {
        this.config = config
        this.logger = createLogger(this.ctx, config)
    }
}
