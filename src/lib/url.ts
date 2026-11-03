const BASE = import.meta.env.BASE_URL; // 以 '/' 结尾

/** 带 base 的内部链接，避免部署到子路径后 404 */
export function url(path = ''): string {
  return BASE + path.replace(/^\//, '');
}
