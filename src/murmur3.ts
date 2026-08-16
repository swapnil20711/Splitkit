/**
 * Encodes a string to UTF-8 bytes, matching `TextEncoder.encode` (unpaired
 * surrogates become U+FFFD). Implemented inline rather than relying on a global
 * `TextEncoder`, which is not guaranteed on every React Native runtime.
 */
function utf8Bytes(str: string): Uint8Array {
    // Worst case is 3 bytes per code unit: a BMP character encodes to 3 bytes,
    // and a surrogate pair encodes to 4 bytes across 2 units.
    const out = new Uint8Array(str.length * 3);
    let n = 0;

    for (let i = 0; i < str.length; i++) {
        let cp = str.charCodeAt(i);

        if (cp >= 0xd800 && cp <= 0xdbff) {
            const low = i + 1 < str.length ? str.charCodeAt(i + 1) : 0;
            if (low >= 0xdc00 && low <= 0xdfff) {
                cp = 0x10000 + ((cp - 0xd800) << 10) + (low - 0xdc00);
                i++;
            } else {
                cp = 0xfffd; // unpaired high surrogate
            }
        } else if (cp >= 0xdc00 && cp <= 0xdfff) {
            cp = 0xfffd; // unpaired low surrogate
        }

        if (cp < 0x80) {
            out[n++] = cp;
        } else if (cp < 0x800) {
            out[n++] = 0xc0 | (cp >> 6);
            out[n++] = 0x80 | (cp & 0x3f);
        } else if (cp < 0x10000) {
            out[n++] = 0xe0 | (cp >> 12);
            out[n++] = 0x80 | ((cp >> 6) & 0x3f);
            out[n++] = 0x80 | (cp & 0x3f);
        } else {
            out[n++] = 0xf0 | (cp >> 18);
            out[n++] = 0x80 | ((cp >> 12) & 0x3f);
            out[n++] = 0x80 | ((cp >> 6) & 0x3f);
            out[n++] = 0x80 | (cp & 0x3f);
        }
    }

    return out.subarray(0, n);
}

/**
 * MurmurHash3, x86 32-bit variant (Austin Appleby). Non-cryptographic: it is
 * chosen for speed and uniform bit distribution, not for resistance to attack.
 *
 * Strings are hashed as UTF-8 bytes, so results match a byte-oriented murmur3
 * in any other language — a backend can recompute the same bucket independently.
 */
export function murmur3_32(key: string | Uint8Array, seed: number = 0): number {
    const data = typeof key === 'string' ? utf8Bytes(key) : key;

    let h1 = seed >>> 0;
    const c1 = 0xcc9e2d51;
    const c2 = 0x1b873593;
    const remainder = data.length & 3;
    const blockBytes = data.length - remainder;

    // Body: consume the input four bytes at a time, little-endian.
    for (let i = 0; i < blockBytes; i += 4) {
        let k1 = data[i] | (data[i + 1] << 8) | (data[i + 2] << 16) | (data[i + 3] << 24);

        k1 = Math.imul(k1, c1);
        k1 = (k1 << 15) | (k1 >>> 17);
        k1 = Math.imul(k1, c2);

        h1 ^= k1;
        h1 = (h1 << 13) | (h1 >>> 19);
        h1 = Math.imul(h1, 5) + 0xe6546b64;
    }

    // Tail: the 1-3 bytes that do not fill a block.
    if (remainder > 0) {
        let k1 = 0;
        if (remainder >= 3) k1 ^= data[blockBytes + 2] << 16;
        if (remainder >= 2) k1 ^= data[blockBytes + 1] << 8;
        k1 ^= data[blockBytes];

        k1 = Math.imul(k1, c1);
        k1 = (k1 << 15) | (k1 >>> 17);
        k1 = Math.imul(k1, c2);
        h1 ^= k1;
    }

    // Finalization (fmix32): avalanche the bytes mixed in last.
    h1 ^= data.length;
    h1 ^= h1 >>> 16;
    h1 = Math.imul(h1, 0x85ebca6b);
    h1 ^= h1 >>> 13;
    h1 = Math.imul(h1, 0xc2b2ae35);
    h1 ^= h1 >>> 16;

    return h1 >>> 0;
}

/**
 * Maps a user and experiment onto a uniformly distributed score in [0, 1).
 *
 * The experiment key is part of the hash input so that a user's position is
 * re-randomized per experiment: without it, a user near 0 would land in the
 * first variant of every concurrent experiment, correlating their results.
 */
export function getBucketScore(userId: string, experimentKey: string): number {
    // Divided by 2^32 (not 2^32-1) so the range is a half-open [0, 1): a score
    // of exactly 1.0 would fall past every variant's cumulative upper bound.
    return murmur3_32(`${userId}:${experimentKey}`) / 0x100000000;
}
