import { storage } from 'wxt/utils/storage';

export const clickCount = storage.defineItem<number>('local:clickCount', { fallback: 0 });
