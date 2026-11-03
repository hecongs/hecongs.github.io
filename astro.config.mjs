import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// ── 部署前只改这两行 ───────────────────────────────────────────
// 1) 仓库名不是 <用户名>.github.io 时，base 必须写成 '/仓库名'
// 2) 配了自定义域名就删掉 base，并把 site 改成你的域名
export default defineConfig({
  site: 'https://example.github.io',
  // base: '/notebook',

  // Windows 上 Node 默认只把 dev server 绑到 IPv6 回环 [::1]，
  // 浏览器走 127.0.0.1 会连不上。显式绑 IPv4 回环，本机三种写法都能访问。
  server: {
    host: '127.0.0.1',
    port: 4321,
  },

  integrations: [mdx()],

  // 鼠标移到站内链接上就预取下一页。配了 ClientRouter 后，换页不再整页刷新。
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },

  markdown: {
    shikiConfig: {
      themes: { light: 'one-light', dark: 'one-dark-pro' },
      defaultColor: false,
      wrap: true,
    },
  },
});
