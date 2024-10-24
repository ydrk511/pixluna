import sharp from 'sharp';
import { Context } from 'koishi';
import { IMAGE_MINE_TYPE } from './getImageMimeType';

export async function qualityImage(
    ctx: Context,
    imageBuffer: ArrayBuffer,
    imageType: IMAGE_MINE_TYPE,
) {
    let image = sharp(imageBuffer);

    let qualifiedImage: Buffer;

    if (imageType === "jpeg" || imageType === "jpg") {
        qualifiedImage = await image.jpeg({ quality: 65 }).toBuffer();
    } else {
        qualifiedImage = await image.png({ quality: 65 }).toBuffer();
    }

    image.destroy();
    image = undefined;

    return qualifiedImage;
}

export async function mixImage(
    ctx: Context,
    [imageBuffer, imageType]: [
        imageBuffer: ArrayBuffer,
        imageType: IMAGE_MINE_TYPE,
    ],
    compress: boolean = false,
) {
    if (compress) {
        imageBuffer = await qualityImage(ctx, imageBuffer, imageType);
    }

    let image = sharp(imageBuffer);

    const { width, height } = await image.metadata();

    const { data, info } = await image
        .raw()
        .toBuffer({ resolveWithObject: true });

    // 随机选择一个点进行修改
    const randomX = Math.floor(Math.random() * width);
    const randomY = Math.floor(Math.random() * height);
    const idx = (randomY * width + randomX) * info.channels;

    // 修改 R 通道
    data[idx] = data[idx] + 1 <= 255 ? data[idx] + 1 : data[idx] - 1;
    // 修改 G 通道
    data[idx + 1] = data[idx + 1] + 1 <= 255 ? data[idx + 1] + 1 : data[idx + 1] - 1;
    // 修改 B 通道
    data[idx + 2] = data[idx + 2] + 1 <= 255 ? data[idx + 2] + 1 : data[idx + 2] - 1;

    // 释放内存
    image.destroy();

    image = sharp(data, {
        raw: {
            width: info.width,
            height: info.height,
            channels: info.channels,
        },
    });

    const processedImageBuffer = await image.png().toBuffer();

    image.destroy();
    image = undefined;

    return processedImageBuffer; // 直接返回处理后的 Buffer
}

