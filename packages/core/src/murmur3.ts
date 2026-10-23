const encoder = new TextEncoder();

const C1 = 0xcc9e2d51;
const C2 = 0x1b873593;

const scramble = (k: number): number => {
  const mixed = Math.imul(k, C1);
  return Math.imul((mixed << 15) | (mixed >>> 17), C2);
};

/** MurmurHash3, x86 32-bit variant, over the UTF-8 bytes of `key`. */
export const murmur3 = (key: string, seed: number): number => {
  const data = encoder.encode(key);
  const blockEnd = data.length & ~3;
  let h = seed >>> 0;

  for (let i = 0; i < blockEnd; i += 4) {
    const k = data[i]! | (data[i + 1]! << 8) | (data[i + 2]! << 16) | (data[i + 3]! << 24);
    h ^= scramble(k);
    h = (h << 13) | (h >>> 19);
    h = (Math.imul(h, 5) + 0xe6546b64) | 0;
  }

  const tail = data.length & 3;
  if (tail > 0) {
    let k = data[blockEnd]!;
    if (tail >= 2) {
      k ^= data[blockEnd + 1]! << 8;
    }
    if (tail === 3) {
      k ^= data[blockEnd + 2]! << 16;
    }
    h ^= scramble(k);
  }

  h ^= data.length;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;

  return h >>> 0;
};
