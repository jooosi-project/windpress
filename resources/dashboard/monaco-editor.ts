import { __ } from '@wordpress/i18n';
import {
  loadModernMonaco,
  type ModernMonacoLoadOptions,
} from '@/packages/core/windpress/modern-monaco';

const dashboardMonacoOptions: ModernMonacoLoadOptions = {
  useBuiltinLSP: true,
  lsp: {
    css: {
      useDefaultDataProvider: true,
      dataProviders: {
        tailwindcss: {
          version: 1.1,
          atDirectives: [
            {
              name: '@theme',
              description: __(
                'Theme variables are special CSS variables defined using the `@theme` directive that influence which utility classes exist in your project.',
                'windpress',
              ),
              references: [
                {
                  name: __('Docs: Theme variables', 'windpress'),
                  url: 'https://tailwindcss.com/docs/theme',
                },
              ],
            },
            {
              name: '@plugin',
              description: __(
                'Use the `@plugin` directive to load a legacy JavaScript-based plugin.',
                'windpress',
              ),
              references: [
                {
                  name: __('Docs: Functions & Directives', 'windpress'),
                  url: 'https://tailwindcss.com/docs/functions-and-directives#plugin-directive',
                },
                {
                  name: __('Docs: Tailwind CSS plugins', 'windpress'),
                  url: 'https://jooo.si/docs/windpress/configuration/file-main-css#tailwind-css-plugins',
                },
              ],
            },
            {
              name: '@config',
              description: __(
                'Use the `@config` directive to load a legacy JavaScript-based configuration file.',
                'windpress',
              ),
              references: [
                {
                  name: __('Docs: Functions & Directives', 'windpress'),
                  url: 'https://tailwindcss.com/docs/functions-and-directives#config-directive',
                },
                {
                  name: __('Docs: Tailwind CSS configuration', 'windpress'),
                  url: 'https://jooo.si/docs/windpress/configuration/file-main-css#tailwind-css-configuration',
                },
              ],
            },
            {
              name: '@tailwind',
              description: __(
                "Use the `@tailwind` directive to insert Tailwind's `base`, `components`, `utilities` and `variants` styles into your CSS.",
                'windpress',
              ),
              references: [
                {
                  name: __('Docs: Tailwind CSS functions & directives', 'windpress'),
                  url: 'https://v3.tailwindcss.com/docs/functions-and-directives#tailwind',
                },
              ],
            },
            {
              name: '@apply',
              description: __(
                'Use the `@apply` directive to inline any existing utility classes into your own custom CSS.',
                'windpress',
              ),
              references: [
                {
                  name: __('Docs: Tailwind CSS functions & directives', 'windpress'),
                  url: 'https://tailwindcss.com/docs/functions-and-directives#apply-directive',
                },
              ],
            },
            {
              name: '@utility',
              description: __(
                'Use the `@utility` directive to add custom utilities to your project that work with variants like `hover`, `focus` and `lg`.',
                'windpress',
              ),
              references: [
                {
                  name: __('Docs: Functions & Directives', 'windpress'),
                  url: 'https://tailwindcss.com/docs/functions-and-directives#utility-directive',
                },
              ],
            },
            {
              name: '@custom-variant',
              description: __(
                'Use the `@custom-variant` directive to add a custom variant in your project.',
                'windpress',
              ),
              references: [
                {
                  name: __('Docs: Functions & Directives', 'windpress'),
                  url: 'https://tailwindcss.com/docs/functions-and-directives#custom-variant-directive',
                },
              ],
            },
            {
              name: '@variant',
              description: __(
                'Use the `@variant` directive to apply a Tailwind variant to styles in your CSS.',
                'windpress',
              ),
              references: [
                {
                  name: __('Docs: Tailwind CSS functions & directives', 'windpress'),
                  url: 'https://tailwindcss.com/docs/functions-and-directives#variant-directive',
                },
              ],
            },
            {
              name: '@source',
              description: __('Use the `@source` directive to scan additional source files.', 'windpress'),
              references: [
                {
                  name: __('Docs: Scanning additional Sources', 'windpress'),
                  url: 'https://jooo.si/docs/windpress/configuration/file-main-css#scanning-additional-sources',
                },
              ],
            },
            {
              name: '@layer',
              description: __(
                'Use the `@layer` directive to tell Tailwind which “bucket” a set of custom styles belong to. Valid layers are `base`, `components`, and `utilities`.',
                'windpress',
              ),
              references: [
                {
                  name: __('Docs: Functions & Directives', 'windpress'),
                  url: 'https://v3.tailwindcss.com/docs/functions-and-directives#layer',
                },
              ],
            },
          ],
        },
      },
    },
  },
};

type ModernMonaco = typeof import('modern-monaco/editor-core');

let dashboardMonacoPromise: Promise<ModernMonaco> | null = null;

export function loadDashboardMonaco(): Promise<ModernMonaco> {
  if (!dashboardMonacoPromise) {
    dashboardMonacoPromise = loadModernMonaco(undefined, dashboardMonacoOptions).catch(
      (error: unknown) => {
        dashboardMonacoPromise = null;
        throw error;
      },
    );
  }

  return dashboardMonacoPromise;
}
