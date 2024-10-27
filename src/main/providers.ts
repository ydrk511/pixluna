import { Context } from 'koishi'
import { SourceProvider } from '../utils/type'
import { LoliconSourceProvider } from './providers/lolicon'
import { LolisukiSourceProvider } from './providers/lolisuki'
import { PixivDiscoverySourceProvider } from './providers/pixiv-discovery'
import { PixivFollowingSourceProvider } from './providers/pixiv-following'
import type { Config } from '../config'

export type ProviderTypes =
    | 'lolicon'
    | 'lolisuki'
    | 'pixiv-discovery'
    | 'pixiv-following'

export const Providers: {
    [K in ProviderTypes]: new (ctx: Context, config: Config) => SourceProvider
} = {
    lolicon: LoliconSourceProvider,
    lolisuki: LolisukiSourceProvider,
    'pixiv-discovery': PixivDiscoverySourceProvider,
    'pixiv-following': PixivFollowingSourceProvider
}

export function getProvider(ctx: Context, config: Config): SourceProvider {
    const ProviderClass = Providers[config.defaultSourceProvider]
    if (ProviderClass) {
        return new ProviderClass(ctx, config)
    }
    throw new Error(`未找到提供程序：${config.defaultSourceProvider}`)
}
