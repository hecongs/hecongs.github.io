import type { CollectionEntry } from 'astro:content';
import { monthOf, type EntryLike } from './content';
import { url } from './url';

/** 一套笔记在列表和阅读页上的名字。正文仍在各自的 Markdown 里。 */
export const SERIES: Record<string, { title: string; summary: string }> = {
  'switch-nos': {
    title: '交换机操作系统',
    summary: '从控制面和 VLAN 读到路由、ACL，再看设备、测试方法和选配方向。',
  },
};

export type StudyItem =
  | { type: 'note'; date: Date; entry: CollectionEntry<'log'> }
  | { type: 'series'; date: Date; id: string; entries: CollectionEntry<'log'>[] };

export function seriesInfo(id: string) {
  return SERIES[id] ?? { title: id, summary: '' };
}

export function seriesUrl(id: string) {
  return url(`log/series/${id}/`);
}

function byOrder(a: CollectionEntry<'log'>, b: CollectionEntry<'log'>) {
  return (a.data.order ?? 0) - (b.data.order ?? 0) || a.id.localeCompare(b.id);
}

/** 同一 series 收成一条，其余笔记保持原样。按日期从新到旧。 */
export function groupStudy(entries: CollectionEntry<'log'>[]): StudyItem[] {
  const grouped = new Map<string, CollectionEntry<'log'>[]>();
  const notes: CollectionEntry<'log'>[] = [];

  for (const entry of entries) {
    const id = entry.data.series;
    if (!id) {
      notes.push(entry);
      continue;
    }
    const bucket = grouped.get(id);
    if (bucket) bucket.push(entry);
    else grouped.set(id, [entry]);
  }

  const items: StudyItem[] = [
    ...notes.map((entry) => ({ type: 'note' as const, date: entry.data.date, entry })),
    ...[...grouped.entries()].map(([id, chapters]) => {
      const sorted = [...chapters].sort(byOrder);
      const date = sorted.reduce(
        (latest, item) => (item.data.date > latest ? item.data.date : latest),
        sorted[0]!.data.date,
      );
      return { type: 'series' as const, date, id, entries: sorted };
    }),
  ];

  return items.sort((a, b) => b.date.valueOf() - a.date.valueOf());
}

/** 首页计数和最近记录用：一套笔记只占一条。 */
export function studyUnits(entries: CollectionEntry<'log'>[]): EntryLike[] {
  return groupStudy(entries).map((item) => {
    if (item.type === 'note') return item.entry;
    const info = seriesInfo(item.id);
    return {
      id: `series/${item.id}`,
      data: {
        date: item.date,
        tags: [],
        draft: false,
        title: info.title,
        summary: info.summary,
      },
    };
  });
}

export function groupStudyByMonth(items: StudyItem[]) {
  const map = new Map<string, StudyItem[]>();
  for (const item of items) {
    const key = monthOf(item.date);
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

/** 同一套笔记里，上一节是顺序更小的，下一节是顺序更大的。 */
export function seriesNeighbors(entries: CollectionEntry<'log'>[], current: CollectionEntry<'log'>) {
  const id = current.data.series;
  if (!id) {
    const index = entries.findIndex((item) => item.id === current.id);
    return {
      prev: entries[index + 1] ?? null,
      next: entries[index - 1] ?? null,
      series: null as { href: string; title: string } | null,
    };
  }

  const chapters = entries.filter((item) => item.data.series === id).sort(byOrder);
  const index = chapters.findIndex((item) => item.id === current.id);
  return {
    prev: chapters[index - 1] ?? null,
    next: chapters[index + 1] ?? null,
    series: { href: `${seriesUrl(id)}#${current.id}`, title: seriesInfo(id).title },
  };
}
