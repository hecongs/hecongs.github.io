import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// ── 部署前只改这两行 ───────────────────────────────────────────
// 当前形态：用户主页仓库 hecongs/hecongs.github.io
//   站点地址 = https://hecongs.github.io/
//   仓库名与用户名一致，site 写根域名即可，**不要**设 base
// 换自定义域名时只改 site，base 保持不存在
export default defineConfig({
  site: 'https://hecongs.github.io',

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
