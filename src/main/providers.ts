import { SourceProvider } from '../utils/type'
import { LoliconSourceProvider } from './providers/lolicon'
import { LolisukiSourceProvider } from './providers/lolisuki'
import { PixivSourceProvider } from './providers/pixiv'
import { PixivFollowingSourceProvider } from './providers/pixiv-following'
import type { Config } from '../config'

export type ProviderTypes = 'lolicon' | 'lolisuki' | 'pixiv' | 'pixiv-following'

export const Providers: {
    [K in ProviderTypes]: typeof SourceProvider
} = {
    'lolicon': LoliconSourceProvider,
    'lolisuki': LolisukiSourceProvider,
    'pixiv': PixivSourceProvider,
    'pixiv-following': PixivFollowingSourceProvider
}

export function getProvider(config: Config): typeof SourceProvider {
    const Provider = Providers[config.defaultSourceProvider]
    if (Provider) {
        const instance = Provider.getInstance()
        instance.setConfig(config)
    }
    return Provider
}
