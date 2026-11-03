export interface TimingSignal {
  /** 信号名，显示在左侧 */
  name: string;
  /**
   *波浪字符串，每个字符一格：
   * 0 低电平 / 1 高电平 / . 保持 / p 上升沿时钟 / n 下降沿时钟
   * x 无效 / z 高阻 / = 或 2-9 数据（按顺序取 data）/ | 断开
   */
  wave: string;
  /** 数据格上的文字 */
  data?: string[];
}

export interface TimingOptions {
  step?: number;
  rowHeight?: number;
  labelWidth?: number;
  caption?: string;
}

const esc = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const isBus = (char: string): boolean => char === '=' || (char >= '2' && char <= '9');

/**
 * 把 WaveDrom 风格的波形描述渲染成零 JS 的内联 SVG。
 * 只覆盖数字信号常用子集，够画 SPI/I2C/UART/中断时序，不引任何运行时依赖。
 */
export function renderTiming(signals: TimingSignal[], options: TimingOptions = {}): string {
  // 数据格里的文字不能超出格子，按最长标签把步长撑开
  const longestLabel = Math.max(
    0,
    ...signals.flatMap((signal) => (signal.data ?? []).map((label) => [...label].length)),
  );
  const step = options.step ?? Math.max(24, Math.round(longestLabel * 6.5) + 12);
  const rowHeight = options.rowHeight ?? 28;
  const labelWidth = options.labelWidth ?? 108;
  const rowGap = 12;
  const padTop = 8;
  const padBottom = 6;
  const maxSteps = Math.max(1, ...signals.map((signal) => [...signal.wave].length));
  const width = labelWidth + maxSteps * step + 12;
  const height =
    padTop + signals.length * rowHeight + Math.max(0, signals.length - 1) * rowGap + padBottom;

  const rows: string[] = [];

  for (const [index, signal] of signals.entries()) {
    const y0 = padTop + index * (rowHeight + rowGap);
    const top = y0 + 5;
    const bottom = y0 + rowHeight - 5;
    const mid = (top + bottom) / 2;
    const parts: string[] = [];
    const chars = [...signal.wave];

    let line = '';
    let current: number | null = null;
    let dataIndex = 0;
    let i = 0;

    const flush = () => {
      if (line) {
        parts.push(`<path class="td-line" d="${line}"/>`);
        line = '';
      }
    };

    while (i < chars.length) {
      const char = chars[i]!;
      const x1 = labelWidth + i * step;
      const x2 = x1 + step;

      if (char === '|') {
        flush();
        current = null;
        i += 1;
        continue;
      }

      if (char === '0' || char === '1' || char === '.') {
        const y: number = char === '0' ? bottom : char === '1' ? top : (current ?? mid);
        if (!line) line = `M${x1} ${y}`;
        else if (current !== null && Math.abs(y - current) > 0.01) line += ` V${y}`;
        line += ` H${x2}`;
        current = y;
        i += 1;
        continue;
      }

      if (char === 'p' || char === 'n') {
        flush();
        const half = x1 + step / 2;
        if (char === 'p') {
          parts.push(`<path class="td-line" d="M${x1} ${bottom} V${top} H${half} V${bottom} H${x2}"/>`);
          current = bottom;
        } else {
          parts.push(`<path class="td-line" d="M${x1} ${top} V${bottom} H${half} V${top} H${x2}"/>`);
          current = top;
        }
        i += 1;
        continue;
      }

      if (char === 'x' || char === 'z') {
        flush();
        if (char === 'x') {
          parts.push(
            `<rect class="td-unknown" x="${x1}" y="${top}" width="${step}" height="${bottom - top}"/>`,
          );
          parts.push(`<path class="td-hair" d="M${x1} ${mid} H${x2}"/>`);
        } else {
          parts.push(`<path class="td-hair" d="M${x1} ${mid} H${x2}"/>`);
        }
        current = mid;
        i += 1;
        continue;
      }

      if (isBus(char)) {
        flush();
        const start = i;
        const labels: string[] = [];
        while (i < chars.length && isBus(chars[i]!)) {
          labels.push(signal.data?.[dataIndex] ?? '');
          dataIndex += 1;
          i += 1;
        }
        const runStart = labelWidth + start * step;
        const runEnd = labelWidth + i * step;
        const inset = Math.min(6, step / 3);
        const points = [
          `${runStart + inset},${top}`,
          `${runEnd - inset},${top}`,
          `${runEnd},${mid}`,
          `${runEnd - inset},${bottom}`,
          `${runStart + inset},${bottom}`,
          `${runStart},${mid}`,
        ].join(' ');
        parts.push(`<polygon class="td-bus" points="${points}"/>`);
        labels.forEach((label, offset) => {
          if (!label) return;
          const cx = labelWidth + (start + offset) * step + step / 2;
          parts.push(
            `<text class="td-bus-label" x="${cx}" y="${mid}" text-anchor="middle" dominant-baseline="central">${esc(label)}</text>`,
          );
          if (offset > 0) {
            const divider = labelWidth + (start + offset) * step;
            parts.push(`<path class="td-hair" d="M${divider} ${top + 2} V${bottom - 2}"/>`);
          }
        });
        current = mid;
        continue;
      }

      i += 1;
    }

    flush();

    rows.push(
      `<g><text class="td-label" x="${labelWidth - 10}" y="${mid}" text-anchor="end" dominant-baseline="central">${esc(signal.name)}</text>${parts.join('')}</g>`,
    );
  }

  const caption = options.caption ?? '时序图';
  return `<svg class="timing" viewBox="0 0 ${width} ${height}" width="100%" role="img" xmlns="http://www.w3.org/2000/svg"><title>${esc(caption)}</title>${rows.join('')}</svg>`;
}
