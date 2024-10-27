import { Context, h } from 'koishi'
import Config from '../config'
import { getRemoteImage } from './request'
import { GeneralImageData } from '../utils/type'

function renderImageMessage(image: GeneralImageData & { data: Buffer, mimeType: string }): h {
    return h('message', [
        h.image(image.data, image.mimeType),
        h('text', { content: `\ntitle：${image.title}\n` }),
        h('text', { content: `id：${image.id}\n` }),
        h('text', {
            content: `tags：${image.tags.map((item: string) => '#' + item).join(' ')}\n`
        })
    ])
}

export async function render(ctx: Context, config: Config, tag: string) {
    try {
        const image = await getRemoteImage(ctx, tag, config)

        if (!image) {
            return h('message', [h('text', { content: '没有获取到喵\n' })])
        }

        ctx.logger.info('image ' + JSON.stringify(image))

        return renderImageMessage(image)
    } catch (e) {
        ctx.logger.error(e)

        return h('message', [h('text', { content: `图片获取失败了喵~，${e}` })])
    }
}
