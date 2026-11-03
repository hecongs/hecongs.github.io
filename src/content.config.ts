import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * 三个集合共用的一套字段。draft 默认 true —— 新写的条目默认不进构建产物，
 * 想发布时显式写 draft: false。这样写公司项目时不会手滑泄漏。
 * 本地 npm run dev 时所有条目的可见（带草稿标记），方便预览。
 */
const base = {
  date: z.coerce.date(),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(true),
  summary: z.string().optional(),
};

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    ...base,
    title: z.string(),
    updated: z.coerce.date().optional(),
    /** 芯片 / 平台，用来做检索维度 */
    chip: z.string().optional(),
    project: z.string().optional(),
  }),
});

const log = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/log' }),
  schema: z.object({
    ...base,
    /** 短记录可以不写标题，列表里用正文首行代替 */
    title: z.string().optional(),
    chip: z.string().optional(),
    /** 同一套学习笔记收成一组，列表里只出现一次 */
    series: z.string().optional(),
    /** 组内阅读顺序，从小到大 */
    order: z.number().optional(),
  }),
});

const refs = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/refs' }),
  schema: z.object({
    ...base,
    title: z.string(),
    /** 分组用：如 测试框架 / 命令 / 寄存器 / 链接脚本 */
    category: z.string().default('未分类'),
    lang: z.string().optional(),
  }),
});

export const collections = { posts, log, refs };

