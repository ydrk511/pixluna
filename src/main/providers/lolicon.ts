import { Context } from 'koishi'
import type { Config } from '../../config'
import type {
    CommonSourceRequest,
    ImageMetaData,
    GeneralImageData,
    SourceResponse
} from '../../utils/type'
import { SourceProvider } from '../../utils/type'
import { PixlunaLogger, createLogger } from '../../utils/logger'

export interface LoliconSourceRequest {
    r18?: number
    num?: number
    uid?: number[]
    keyword?: string
    tag?: string[]
    size?: string[]
    proxy?: string
    excludeAI?: boolean
}

interface LoliconResponse {
    error: string
    data: Array<{
        pid: number
        p: number
        uid: number
        title: string
        author: string
        r18: boolean
        tags: string[]
        ext: string
        aiType: number
        uploadDate: number
        urls: {
            original: string
            regular?: string
        }
    }>
}

export class LoliconSourceProvider extends SourceProvider {
    static RANDOM_IMAGE_URL = 'https://api.lolicon.app/setu/v2'

    private logger: PixlunaLogger

    constructor(ctx: Context, config: Config) {
        super(ctx, config)
        this.logger = createLogger(ctx, config)
    }

    async getMetaData(
        { context }: { context: Context },
        props: CommonSourceRequest
    ): Promise<SourceResponse<ImageMetaData>> {
        this.logger.info('开始获取 Lolicon 元数据')
        const requestParams: LoliconSourceRequest = {
            r18: props.r18 ? 1 : 0,
            num: 1,
            size: props.size,
            keyword: props.tag,
            excludeAI: props.excludeAI,
            proxy: props.proxy
        }

        const res = await context.http.post<LoliconResponse>(
            LoliconSourceProvider.RANDOM_IMAGE_URL,
            requestParams,
            {
                proxyAgent: this.config.isProxy
                    ? this.config.proxyHost
                    : undefined
            }
        )

        if (res.error || !res.data || res.data.length === 0) {
            return {
                status: 'error',
                data: new Error(res.error || 'No image data returned')
            }
        }

        const imageData = res.data[0]
        const url = this.config.compress
            ? imageData.urls.original
            : imageData.urls.regular || imageData.urls.original

        const generalImageData: GeneralImageData = {
            id: imageData.pid,
            title: imageData.title,
            author: imageData.author,
            r18: imageData.r18,
            tags: imageData.tags,
            extension: imageData.ext,
            aiType: imageData.aiType,
            uploadDate: imageData.uploadDate,
            urls: imageData.urls
        }

        this.logger.info('成功获取图片元数据', JSON.stringify(generalImageData, null, 2))

        return {
            status: 'success',
            data: {
                url: url,
                urls: {
                    regular: imageData.urls.regular,
                    original: imageData.urls.original
                },
                raw: generalImageData
            }
        }
    }

    setConfig(config: Config) {
        this.config = config
        this.logger = createLogger(this.ctx, config)
    }
}
