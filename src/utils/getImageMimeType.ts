const IMAGE_MIME_TYPE_MAP = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif'
}

export type IMAGE_MINE_TYPE = keyof typeof IMAGE_MIME_TYPE_MAP

export function getImageMimeType(
    extension: string
): keyof typeof IMAGE_MIME_TYPE_MAP {
    return IMAGE_MIME_TYPE_MAP[extension] || 'application/octet-stream'
}
