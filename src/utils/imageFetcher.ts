import { Context } from 'koishi';
import { Config } from '../config';
import { getImageMimeType, IMAGE_MINE_TYPE } from './getImageMimeType';
import { taskTime } from './data';
import type { } from '@koishijs/plugin-proxy-agent';

export async function fetchImageBuffer(
  ctx: Context,
  config: Config,
  url: string,
): Promise<[ArrayBuffer, IMAGE_MINE_TYPE]> {
  return taskTime(ctx, "fetchImage", async () => {
    const response = await ctx.http.get(url, {
      responseType: "arraybuffer",
      proxyAgent: config.isProxy ? config.proxyHost : undefined,
    });
    const extension = url.split(".").pop()?.toLowerCase();

    return [response, getImageMimeType(extension)];
  });
}
