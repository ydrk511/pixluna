import { Context, h } from 'koishi'
import type Config from './config'
import { ParallelPool } from './utils/data'
import { render } from './main/renderer'
import { taskTime } from './utils/data'
import { getProvider, Providers } from './main/providers'
import { createLogger } from './utils/logger'

export function apply(ctx: Context, config: Config) {
    const logger = createLogger(ctx, config)

    ctx.command('pixluna [tag:text]', '来张色图')
        .alias('色图')
        .option('n', '-n <value:number>', {
            fallback: 1
        })
        .option('source', '-s <source:string>', { fallback: '' })
        .action(async ({ session, options }, tag) => {
            logger.debug('Command executed with options:', options, 'and tag:', tag)

            await session.send('不可以涩涩哦~')

            // 修改这里,优先使用命令行参数
            const sourceProvider = options.source
                ? Providers[options.source as keyof typeof Providers]
                : getProvider(config)
            if (!sourceProvider) {
                return h('', [
                    h('at', { id: session.userId }),
                    h('text', {
                        content: ' 未选择有效的图片来源，请检查配置或命令参数'
                    })
                ])
            }

            logger.debug('Source provider selected:', sourceProvider)

            const provider = sourceProvider.getInstance()

            // 创建一个新的配置对象,合并命令行参数和默认配置
            const mergedConfig: Config = {
                ...config,
                defaultSourceProvider: (options.source as Config['defaultSourceProvider']) || config.defaultSourceProvider,
                // 可以在这里添加其他需要从命令行参数覆盖的配置项
            }

            provider.setConfig(mergedConfig)

            const messages: h[] = []
            const pool = new ParallelPool<void>(config.maxConcurrency)

            for (let i = 0; i < Math.min(10, options.n); i++) {
                pool.add(
                    taskTime(ctx, `${i + 1} image`, async () => {
                        logger.debug(`Processing image ${i + 1}`)
                        const message = await render(ctx, mergedConfig, tag)
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
                logger.error(`消息发送失败，账号可能被风控`)

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
