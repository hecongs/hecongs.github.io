/**
 * 站点信息集中在这里，改这一个文件就能换名字、换导航、换简介。
 */
export const SITE = {
  title: '何聪',
  subtitle: '测试开发工程师',
  description:
    '何聪，测试开发工程师，现居成都。工作按无线芯片、驱动验证、自动化台架三条线展开。',
  author: '何聪',
  /** 首页动态背景（WebGL）。内容站默认关闭，想要实验效果再打开 */
  ambient: false,
};

export const NAV = [
  { label: '学习专栏', href: '/log/', key: 'nav.log' },
  { label: '文章', href: '/posts/', key: 'nav.posts' },
  { label: '素材', href: '/refs/', key: 'nav.refs' },
  { label: '关于', href: '/about/', key: 'nav.about' },
  { label: '经历', href: '/experience/', key: 'nav.experience' },
];

/** 三种内容的中文名与描述，页面标题统一从这里取 */
export const KIND = {
  log: { label: '学习专栏', short: '学', desc: '学习过程中的短记录：今天弄清了什么、卡在哪里' },
  posts: { label: '文章', short: '文', desc: '成篇复盘：一个问题一篇，写清来龙去脉' },
  refs: { label: '素材', short: '材', desc: '可复用片段：代码、命令、寄存器配置' },
} as const;

export type Kind = keyof typeof KIND;
