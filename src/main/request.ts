import { Context, h } from "koishi";
import Config from "../config";
import { Lolicon, SourceProvider } from "../utils/type";
import { getImageMimeType } from "../utils/getImageMimeType";
import { taskTime } from "../utils/data";
import { qualityImage, mixImage } from "../utils/imageProcessing";
import { fetchImageBuffer } from "../utils/imageFetcher";
import { getProvider } from "./providers";

const RANDOM_IMAGE_URL = "https://api.lolicon.app/setu/v2";

export async function getRemoteImage(ctx: Context, tag: string, config: Config): Promise<Lolicon & {
  data: string | h;
  raw: Lolicon;
}> {
  const provider = getProvider(config);
  if (!provider) {
    throw new Error("未选择有效的图片来源，请检查配置");
  }

  let sharp;
  try {
    sharp = (await import("sharp"))?.default;
  } catch {}

  if ((config.imageConfusion || config.compress) && !sharp) {
    ctx.logger.warn(
      "启用了图片混淆或者图片压缩选项，但是没有检查到安装 sharp 服务，这些配置将无效。请安装 sharp 服务。",
    );
  }

  const params = {
    size: ["original", "regular"],
    r18: config.isR18 ? (Math.random() < config.r18P ? 1 : 0) : 0,
    excludeAI: config.excludeAI,
    tag: tag ? tag.split(" ").join("|") : void 0,
    proxy: config.baseUrl ? config.baseUrl : void 0,
  };

  const srcProvider = provider.getInstance();
  const metadata = await srcProvider.getMetaData({
    context: ctx,
  }, params);

  if (metadata.status === "error") {
    return null;
  }

  const response = metadata.data;
  const { url, urls } = response;

  const data = await taskTime(ctx, "mixImage", async () => {
    const imageBufferArray = await fetchImageBuffer(ctx, config, url);

    if (config.imageConfusion && sharp) {
      const processedImageBuffer = await mixImage(
        ctx,
        imageBufferArray,
        config.compress && !urls.regular,
      );
      return h.image(processedImageBuffer, getImageMimeType(imageBufferArray[1]));
    }

    if (config.compress && !urls.regular && sharp) {
      const compressedImageBuffer = await qualityImage(ctx, imageBufferArray[0], imageBufferArray[1]);
      return h.image(compressedImageBuffer, getImageMimeType(imageBufferArray[1]));
    }

    return h.image(imageBufferArray[0], getImageMimeType(imageBufferArray[1]));
  });

  return {
    ...metadata.data.raw,
    data,
    raw: metadata.data.raw,
  };
}
