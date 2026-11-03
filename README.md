# 何聪（个人记录站）

Astro 7 + 纯静态。内容分三层：学习专栏、文章、素材。
没有评论、没有订阅、没有后台。写作入口是 `src/content/` 下的 Markdown。日常写作规范见本地文件 `写作要求.md`（不随仓库发布）。

## 环境要求

- **Node >= 22.23.4**（Astro 7 的硬要求，低版本直接拒绝启动）
- npm 自带即可，不需要额外全局包

```bash
node -v          # 先确认版本，低于 22.23.4 先升级
npm install
npm run dev      # http://localhost:4321
```

## 命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 本地开发，**所有草稿都会显示**（带「草稿」标记） |
| `npm run build` | 构建到 `dist/`，只包含 `draft: false` 的条目，随后生成 Pagefind 索引 |
| `npm run preview` | 预览构建产物，**搜索功能只能在这里验证** |
| `npm run search:index` | 只重建搜索索引 |

## 目录结构

```
src/
├── content/
│   ├── log/      学习专栏，一条一个 .md。同一套笔记用 series 收成一组
│   ├── posts/    成篇复盘，一个问题一篇。要嵌组件再用 .mdx
│   └── refs/     代码片段、命令、寄存器配置
├── components/   TimingDiagram / Bitfield / Callout / EntryRow / TagList
├── data/         profile.ts（个人资料）/ experience.ts（工作经历、教育、技能）
├── layouts/      BaseLayout（页头页脚）/ EntryLayout（正文页）
├── lib/          content.ts（查询与格式化）/ timing.ts（时序图渲染）/ url.ts
├── pages/        路由
├── site.config.ts  站名、导航、简介 —— 改这里
└── content.config.ts  三个集合的字段定义
```

## 页面

| 路径 | 作用 | 内容来源 |
| --- | --- | --- |
| `/` | 首页：一句话介绍 + 统一时间线（三类混合、按日期倒序）+ 分类入口 | 三个集合 |
| `/log/` | 学习专栏。同一 `series` 收成一条，点开是目录 | `content/log` |
| `/posts/` | 文章归档，按年分组 | `content/posts` |
| `/refs/` | 素材库，按 category 分组 | `content/refs` |
| `/tags/` | 全部标签 | 三个集合聚合 |
| `/about/` | 个人介绍：简介、关注方向、最近在做、资料卡 | `data/profile.ts` |
| `/experience/` | 工作经历：时间线 + 教育 + 技术栈 | `data/experience.ts` |
| `/search/` | 全文搜索（构建后可用） | Pagefind 索引 |

个人介绍页和工作经历页**不写 Markdown**，改的是 `src/data/` 下的两个 TS 文件，字段带注释，改完 `npm run build` 即可。

个人介绍页和工作经历页不写 Markdown，改 `src/data/profile.ts` 和 `src/data/experience.ts`。

## 怎么写一条

文件名、文首字段、正文和不要写的东西，以本地 `写作要求.md` 为准（该文件不随仓库发布）。这里只留会让构建失败的三条：

- `date` 写成 `"2026-11-03"`，带引号。
- 要出现在构建结果里，写 `draft: false`。不写就是草稿，`npm run dev` 仍能看到。
- 标签里像 `802.11` 这种会被 YAML 当成数字，写成 `"802.11"`。

正文不要再写一级标题。页面标题用文首的 `title`。

## 三个内置组件（只在 .mdx 里可用）

```mdx
import TimingDiagram from '../../components/TimingDiagram.astro';
import Bitfield from '../../components/Bitfield.astro';
import Callout from '../../components/Callout.astro';
```

**时序图**——WaveDrom 子集，构建期渲染成 SVG，零 JS：

```mdx
<TimingDiagram
  caption="SPI Mode 0"
  signals={[
    { name: 'CS_n', wave: '10......1' },
    { name: 'SCLK', wave: '0.p.p.p.0' },
    { name: 'MOSI', wave: 'x.=.=.=.x', data: ['0xA5', '0x3C', '0x01'] },
  ]}
/>
```

波形字符：`0` 低 / `1` 高 / `.` 保持 / `p` 上升沿时钟 / `n` 下降沿时钟 / `x` 无效 / `z` 高阻 / `=` 或 `2`-`9` 数据（依次取 `data`）/ `|` 断开。

**寄存器位域**：

```mdx
<Bitfield
  name="SPI_CR2"
  fields={[
    { bits: '13:0', name: 'TSIZE', access: 'rw', note: 'DMA 传输总字节数' },
    { bits: '15', name: 'RXDMAEN', access: 'rw' },
  ]}
/>
```

**提示块**：

```mdx
<Callout type="warn" label="注意">正文</Callout>
```

## 部署到 GitHub Pages

线上地址 `https://hecongs.github.io/`，走 GitHub Actions 自动构建。

三步：公开仓库 → 改 `astro.config.mjs` 的 `site`（用户主页仓库不设 `base`）→ push 到 `main`，再到 `Settings → Pages` 把 Source 选为 **GitHub Actions**。

完整的排错手册、自定义域名流程是本机文件 `DEPLOY.md`，不随仓库发布。

> ⚠️ 免费账号的 Pages 只支持公开仓库，**私有仓库需要 GitHub Pro**。公开仓库 = 源码公开，`draft: true` 的草稿不会进构建产物，但 `.md` 原文件在仓库里能被看到。真正不想让人读的内容，别提交进这个仓库。

## 首次使用清单

- [ ] 改 `src/site.config.ts` 里的站名、简介、导航
- [x] `src/data/profile.ts` 已按「何聪」的资料填好，改这里即可更新关于页
- [x] `src/data/experience.ts` 已填入 4 段经历（含项目与技术栈），公司名与时间可直接编辑
- [ ] 改 `astro.config.mjs` 的 `site`（和 `base`）
- [ ] 删掉 `src/content/posts/spi-slave-dma-lost-byte.mdx` 等 5 个示例文件
- [ ] `npm run build && npm run preview`，确认搜索能出结果

## 已知的坑

- **搜索索引只存在于构建产物里**，`npm run dev` 下搜索页会提示索引不存在，这是正常的。
- Pagefind 的中文分词在索引期和查询期不一致，`src/pages/search.astro` 里已经加了单字 + 二元组对齐补丁；如果以后改了分词逻辑，记得两边一起改。
- Shiki 内置语言里有 `c`、`cpp`、`asm`、`mipsasm`、`riscv`、`make`、`cmake`，**没有 `armasm`**，ARM 汇编请用 `asm`（高亮不完全准）。链接脚本 `.ld` 同样没有语法，用 `text` 或 `c` 兜底。
- 不要把 `genhtml` 的完整覆盖率报告直接塞进仓库，它带源码且体积大；放 `public/reports/` 前先脱敏。

## 设计

版式是单栏、暖色卡片、胶囊导航。主栏宽 1040px。

- 首页：名字、三行范围、三个计数。下面是目录，一次展开一节。关于我只留入口，工作经历点开才是整段，最近记录默认开着。
- 学习专栏：带同一个 `series` 的笔记合成一条。阅读页 `/log/series/<id>/` 按 `order` 排，默认每节收起。
- 文章页和素材页用文首 `title` 做标题。素材按 `category` 分组。

关于页用 `AboutContent`，经历页和首页的「工作经历」用 `ExperienceContent`。首页的「关于我」不再展开整页介绍。改介绍和经历，改 `src/data/` 里对应的 TS 文件。

## 首页背景（WebGL，默认关闭）
