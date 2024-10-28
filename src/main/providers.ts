import { Context } from 'koishi'
import { SourceProvider } from '../utils/type'
import { LoliconSourceProvider } from './providers/lolicon'
import { LolisukiSourceProvider } from './providers/lolisuki'
import { PixivDiscoverySourceProvider } from './providers/pixiv-discovery'
import { PixivFollowingSourceProvider } from './providers/pixiv-following'
import type { Config } from '../config'
import { shuffleArray } from '../utils/shuffle'

export type ProviderTypes =
    | 'lolicon'
    | 'lolisuki'
    | 'pixiv-discovery'
    | 'pixiv-following'

export const Providers: {
    [K in ProviderTypes]: new (ctx: Context, config: Config) => SourceProvider
} = {
    'lolicon': LoliconSourceProvider,
    'lolisuki': LolisukiSourceProvider,
    'pixiv-discovery': PixivDiscoverySourceProvider,
    'pixiv-following': PixivFollowingSourceProvider
}

export function getProvider(
    ctx: Context,
    config: Config,
    specificProvider?: string
): SourceProvider {
    if (specificProvider) {
        const ProviderClass = Providers[specificProvider]
        if (ProviderClass) {
            return new ProviderClass(ctx, config)
        }
        throw new Error(`未找到提供程序：${specificProvider}`)
    }

    if (!config.defaultSourceProvider?.length) {
        throw new Error('未配置任何图片来源')
    }

    const shuffledProviders = shuffleArray(config.defaultSourceProvider)
    const selectedProvider = shuffledProviders[0]
    const ProviderClass = Providers[selectedProvider]

    if (ProviderClass) {
        return new ProviderClass(ctx, config)
    }
    throw new Error(`未找到提供程序：${selectedProvider}`)
}
