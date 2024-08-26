import { Context, Random, Schema } from 'koishi';
import { HttpUtil } from "./util/HttpUtil";
import { AxiosRequestConfig, Method } from "axios";

export const name = '@rinkuto/pixiv';

import { Lolicon, Pixivic, Vilipix } from "./util/Interface";

let date = new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

import Config from "./config";

export * from './config';

const pixivUrl = {
  url: 'https://api.lolicon.app/setu/v2'
};

let _config: Config;

export function apply(ctx: Context, config: Config) {
  const logger = ctx.logger('pixiv');
  _config = config;
  ctx.command('来张色图 [tag:text]', '随机一张色图')
    .option('n', '-n <value:number>', {
      fallback: 1,
    })
    .alias('色图')
    .action(async ({ session, options }, tag) => {
      let image: Lolicon;
      await session.send('不可以涩涩哦~');
      const messages = [];
      for (let i = 0; i < Math.min(10, options.n); i++) {
        try {
          image = await getPixivImage(ctx, tag);
          if (image.urls === undefined) {
            messages.push(
              <message>
                <text content={'没有获取到喵\n'}></text>
              </message>
            );
          } else {
            messages.push(
              <message>
                <image url={image.urls.original}></image>
                <text content={`\ntitle：${image.title}\n`}></text>
                <text content={`id：${image.pid}\n`}></text>
                <text content={`tags：${image.tags.map((item) => {
                  return '#' + item;
                }).join(' ')}\n`}></text>
              </message>
            );
          }
        } catch (e) {
          messages.push(
            <message>
              <text content={`图片获取失败了喵~，code:${e.code}`}></text>
            </message>
          );
        }
      }
      session.send(
        <>
          <message forward={true}>
            {messages}
          </message>
        </>
      ).then(res => {
        if (res.length === 0) {
          logger.error(`消息发送失败，账号可能被风控`);
          session.send(
            <>
              <at id={session.userId}></at>
              <text content={'消息发送失败了喵，账号可能被风控\n'}></text>
            </>
          );
        }
      });
    });
}

async function getPixivImage(ctx: Context, tag: string) {
  const params: Record<string, any> = {};
  if (_config.isR18) {
    params['r18'] = Random.bool(_config.r18P) ? 1 : 0;
  } else {
    params['r18'] = 0;
  }

  if (tag !== undefined) {
    params['tag'] = tag.split(' ').join('|');
  }

  const res = await ctx.http.get(HttpUtil.setParams(pixivUrl.url, params), getAxiosConfig());
  return res.data[0];
}

const getAxiosConfig = (): AxiosRequestConfig | undefined => {
  if (!_config.isProxy) {
    return undefined;
  }
  
  const proxyUrl = new URL(_config.proxyHost);
  return {
    proxy: {
      host: proxyUrl.hostname,
      port: Number(proxyUrl.port),
      protocol: proxyUrl.protocol.replace(':', '') as 'http' | 'https',
    },
    method: 'GET' as Method,  // 这里明确指定 method 的类型
  };
};
