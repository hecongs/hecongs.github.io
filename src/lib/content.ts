import { getCollection, type CollectionEntry } from 'astro:content';
import type { Kind } from '../site.config';
import { url } from './url';

const DEV = import.meta.env.DEV;

/** 生产构建只放行 draft: false；本地 dev 全部可见，方便边写边看 */
export async function getVisible<K extends Kind>(kind: K): Promise<CollectionEntry<K>[]> {
  const all = await getCollection(kind);
  return all
    .filter((entry) => DEV || entry.data.draft === false)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function getLatest(kind: Kind, count: number) {
  const items = await getVisible(kind);
  return items.slice(0, count);
}

export function entryUrl(kind: Kind, id: string): string {
  return url(`${kind}/${id}/`);
}

export function entryPath(kind: Kind, id: string): string {
  return `${kind}/${id}/`;
}

/** 组件里用的宽松条目类型，三个集合都能传进来 */
export interface EntryLike {
  id: string;
  body?: string;
  data: {
    date: Date;
    tags: string[];
    draft: boolean;
    title?: string;
    summary?: string;
    chip?: string;
    project?: string;
    category?: string;
    updated?: Date;
    lang?: string;
  };
}

/** 日志可能没写标题，退化成正文首行（去掉行内 Markdown 记号） */
export function displayTitle(entry: EntryLike): string {
  const title = entry.data.title;
  if (title && title.trim()) return title.trim();
  const firstLine = (entry.body ?? '')
    .split('\n')
    .map((line) => line.replace(/^[#>\-*\s]+/, '').trim())
    .find((line) => line.length > 0);
  if (!firstLine) return '（无标题）';
  const plain = firstLine
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  return plain.length > 60 ? `${plain.slice(0, 60)}…` : plain;
}

export function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function yearOf(date: Date): string {
  return iso(date).slice(0, 4);
}

export function monthOf(date: Date): string {
  return iso(date).slice(0, 7);
}

export function fmtDate(date: Date): string {
  const [y, m, d] = iso(date).split('-');
  return `${y}-${m}-${d}`;
}

export function fmtMonth(date: Date): string {
  const [y, m] = iso(date).split('-');
  return `${y} 年 ${Number(m)} 月`;
}

/** 按年分组，用于归档 */
export function groupByYear<T extends { data: { date: Date } }>(items: T[]) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = yearOf(item.data.date);
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return [...map.entries()].sort((a, b) => Number(b[0]) - Number(a[0]));
}

/** 日志按「年 月」分组 */
export function groupByMonth<T extends { data: { date: Date } }>(items: T[]) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = monthOf(item.data.date);
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

export type TagCount = { tag: string; count: number };

export function countTags(items: { data: { tags: string[] } }[]): TagCount[] {
  const map = new Map<string, number>();
  for (const item of items) {
    for (const tag of item.data.tags) map.set(tag, (map.get(tag) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** 所有集合合并，用于首页时间线和标签页 */
export async function getAllVisible() {
  const [posts, log, refs] = await Promise.all([
    getVisible('posts'),
    getVisible('log').then((items) => items.slice(0, 200)),
    getVisible('refs'),
  ]);
  return { posts, log, refs };
}

/** 去掉 Markdown 记号，取一段纯文本 */
export function stripMarkdown(source: string): string {
  return source
    .replace(/```[a-z]*\n([\s\S]*?)```/g, ' $1 ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_>~]/g, '')
    .replace(/^\s*[-+]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 列表里的一句话摘要：优先用 frontmatter 的 summary，否则从正文首段截 */
export function excerptOf(entry: EntryLike, max = 76): string {
  const raw = entry.data.summary ?? stripMarkdown(entry.body ?? '');
  if (!raw) return '';
  const plain = raw.replace(/\s+/g, ' ').trim();
  return plain.length > max ? `${plain.slice(0, max)}…` : plain;
}

/** 中文按 350 字/分钟估算 */
export function readingTime(entry: EntryLike): number {
  const chars = stripMarkdown(entry.body ?? '').length;
  return Math.max(1, Math.round(chars / 350));
}
