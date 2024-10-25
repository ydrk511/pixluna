import { Context, h } from 'koishi'
import type Config from './config'
import { ParallelPool } from './utils/data'
import { render } from './main/renderer'
import { taskTime } from './utils/data'
import { getProvider, Providers } from './main/providers'

export function apply(ctx: Context, config: Config) {
    ctx.command('pixluna [tag:text]', '来张色图')
        .alias('色图')
        .option('n', '-n <value:number>', {
            fallback: 1
        })
        .option('source', '-s <source:string>', { fallback: '' })
        .action(async ({ session, options }, tag) => {
            await session.send('不可以涩涩哦~')

            const sourceProvider = options.source
                ? Providers[options.source]
                : getProvider(config)
            if (!sourceProvider) {
                return h('', [
                    h('at', { id: session.userId }),
                    h('text', {
                        content: ' 未选择有效的图片来源，请检查配置或命令参数'
                    })
                ])
            }

            const provider = sourceProvider.getInstance()
            provider.setConfig(config)

            const messages: h[] = []
            const pool = new ParallelPool<void>(config.maxConcurrency)

            for (let i = 0; i < Math.min(10, options.n); i++) {
                pool.add(
                    taskTime(ctx, `${i + 1} image`, async () => {
                        const message = await render(ctx, config, tag)
                        messages.push(message)
                    })
                )
            }

            await pool.run()

            let id: string[]
            try {
                id = await taskTime(ctx, 'send message', () => {
                    if (config.forwardMessage) {
                        return session.send(
                            h(
                                'message',
                                { forward: config.forwardMessage },
                                messages
                            )
                        )
                    }

                    return session.send(messages)
                })
            } catch (e) {
                ctx.logger.error(e)
            }

            if (id === undefined || id.length === 0) {
                ctx.logger.error(`消息发送失败，账号可能被风控`)

                return h('', [
                    h('at', { id: session.userId }),
                    h('text', {
                        content: ' 消息发送失败了喵，账号可能被风控\n'
                    })
                ])
            }
        })

        .subcommand('.source', '显示可用的图片来源')
        .action(async ({ session }) => {
            const availableSources = Object.keys(Providers)
            const message = h('message', [
                h('text', { content: '可用的图片来源：\n' }),
                ...availableSources.map((source) =>
                    h('text', { content: `- ${source}\n` })
                )
            ])
            await session.send(message)
        })
}

export * from './config'
