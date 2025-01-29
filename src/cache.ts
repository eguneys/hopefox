export class LRUCache<T> {

    cache: Map<string, T>

    constructor(readonly capacity: number) {
        this.capacity = capacity;
        this.cache = new Map();
    }

    get(key: string) {
        if (!this.cache.has(key)) return undefined;
        const value = this.cache.get(key)!;
        this.cache.delete(key); // Move to the end (most recently used)
        this.cache.set(key, value);
        return value;
    }

    put(key: string, value: T) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.capacity) {
            // Evict the least recently used (first entry in the Map)
            const firstKey = this.cache.keys().next().value!;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }
}

export const str_hash = (str: string) => {
  var hash = 0,
    i, chr;
  if (str.length === 0) return hash;
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}