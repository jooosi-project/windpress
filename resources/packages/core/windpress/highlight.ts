import { codeToHtml as codeToHtmlBytes } from '@pierre/highlights';
import type { Lang } from '@pierre/highlights';
import darkPlus from '@pierre/highlights/themes/dark-plus';
import lightPlus from '@pierre/highlights/themes/light-plus';

const htmlDecoder = new TextDecoder();
const themes = {
  dark: darkPlus,
  light: lightPlus,
} as const;

export function highlightCode(
  code: string,
  lang: Lang,
  appearance: 'dark' | 'light' = 'dark',
): string {
  return htmlDecoder.decode(codeToHtmlBytes(code, { lang, theme: themes[appearance] }));
}
