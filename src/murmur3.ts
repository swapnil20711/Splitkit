export function murmur3_32(key: string, seed: number = 0): number {
    let h1 = seed >>> 0;
    const c1 = 0xcc9e2d51;
    const c2 = 0x1b873593;
    const remainder = key.length & 3;
    const bytes = key.length - remainder;

    for (let i = 0; i < bytes; i += 4) {
        let k1 =
            (key.charCodeAt(i) & 0xff) |
            ((key.charCodeAt(i + 1) & 0xff) << 8) |
            ((key.charCodeAt(i + 2) & 0xff) << 16) |
            ((key.charCodeAt(i + 3) & 0xff) << 24);

        k1 = Math.imul(k1, c1);
        k1 = (k1 << 15) | (k1 >>> 17);
        k1 = Math.imul(k1, c2);

        h1 ^= k1;
        h1 = (h1 << 13) | (h1 >>> 19);
        h1 = Math.imul(h1, 5) + 0xe6546b64;
    }

    if (remainder > 0) {
        let k1 = 0;
        if (remainder >= 3) k1 ^= (key.charCodeAt(bytes + 2) & 0xff) << 16;
        if (remainder >= 2) k1 ^= (key.charCodeAt(bytes + 1) & 0xff) << 8;
        k1 ^= key.charCodeAt(bytes) & 0xff;

        k1 = Math.imul(k1, c1);
        k1 = (k1 << 15) | (k1 >>> 17);
        k1 = Math.imul(k1, c2);
        h1 ^= k1;
    }

    h1 ^= key.length;
    h1 ^= h1 >>> 16;
    h1 = Math.imul(h1, 0x85ebca6b);
    h1 ^= h1 >>> 13;
    h1 = Math.imul(h1, 0xc2b2ae35);
    h1 ^= h1 >>> 16;

    return h1 >>> 0;
}

export function getBucketScore(userId: string, experimentKey: string): number {
    return murmur3_32(`${userId}:${experimentKey}`) / 0xffffffff;
}