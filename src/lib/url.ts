const BASE = import.meta.env.BASE_URL;

/**
 * 带 base 的内部链接，避免部署到子路径后 404。
 *
 * 注意：`BASE_URL` 只有在 base 为空时才是 '/'，设了 base（如 '/notebook'）
 * 的时候它**不带尾斜杠**，直接拼 'log/' 会得到 '/notebooklog/'。
 * 这里统一补一次尾斜杠，两种形态都能用。
 */
export function url(path = ''): string {
  const base = BASE.endsWith('/') ? BASE : `${BASE}/`;
  return base + path.replace(/^\//, '');
}
