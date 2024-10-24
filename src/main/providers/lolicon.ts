import { Context } from "koishi";
import type { Config } from "../../config";
import type { CommonSourceRequest, ImageMetaData, LoliconRequest, SourceResponse } from "../../utils/type";
import { SourceProvider } from "../../utils/type";

export class LoliconSourceProvider extends SourceProvider {
  static RANDOM_IMAGE_URL = "https://api.lolicon.app/setu/v2";

  private _config: Config;

  get config(): Config {
    if (!this._config) {
      throw new Error('Config not set. Please call setConfig before using the provider.');
    }
    return this._config;
  }

  async getMetaData({ context }: { context: Context }, props: CommonSourceRequest): Promise<SourceResponse<ImageMetaData>> {
    const res = await context.http
      .post<LoliconRequest>(LoliconSourceProvider.RANDOM_IMAGE_URL, props, {
        proxyAgent: this.config.isProxy ? this.config.proxyHost : undefined,
      })
      .then(async (res) => {
        return res.data?.[0];
      });

    if (!res || (!res?.urls?.regular && !res.urls.original)) {
      return {
        status: "error",
        data: null
      };
    }

    const url = this.config.compress ? res.urls.original : (res.urls.regular || res.urls.original);

    return {
      status: "success",
      data: {
        url: url,
        urls: {
          regular: res?.urls?.regular
        },
        raw: res,
      }
    };
  }

  setConfig(config: Config) {
    this._config = config;
  }
}
