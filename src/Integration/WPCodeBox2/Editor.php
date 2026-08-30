<?php

/*
 * This file is part of the WindPress package.
 *
 * (c) Joshua Gugun Siagian <suabahasa@gmail.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
declare (strict_types=1);
namespace WindPress\WindPress\Integration\WPCodeBox2;

use WIND_PRESS;
use WindPress\WindPress\Core\Runtime;
/**
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 */
class Editor
{
    public function __construct()
    {
        foreach (['toplevel_page_wpcodebox2', 'tools_page_wpcodebox2'] as $hook) {
            add_action('load-' . $hook, function () {
                add_action('admin_head', fn() => $this->editor_assets(), 1000001);
            });
        }
    }
    public function editor_assets()
    {
        Runtime::get_instance()->print_windpress_metadata();
        Runtime::get_instance()->enqueue_play_cdn();
        wp_enqueue_script(WIND_PRESS::WP_OPTION . ':autocomplete');
        wp_dequeue_script(WIND_PRESS::WP_OPTION . ':observer');
        echo <<<HTML
    <script>
        document.addEventListener('DOMContentLoaded', async function () {
            while (!window.monaco) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // create an hidden iframe and mount it
            let iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);

            // filter the script elements. Search for the script with the id prefixed with 'windpress:' except 'windpress:integration-'
            let scriptElements = document.querySelectorAll('script');
            scriptElements = Array.from(scriptElements).filter(scriptElement => {
                let id = scriptElement.getAttribute('id');
                return id && (id.startsWith('windpress:') || id.startsWith('vite-client')) && !id.startsWith('windpress:integration-');
            });

            // move all the script elements to the iframe
            scriptElements.forEach(scriptElement => {
                iframe.contentDocument.head.appendChild(document.createRange().createContextualFragment(scriptElement.outerHTML));

                // remove the script element from the parent document
                scriptElement.remove();
            });

            // Register completion provider for HTML and PHP
            ['html', 'php'].forEach(language => {
                monaco.languages.registerCompletionItemProvider(language, {
                    triggerCharacters: [' '],  // Trigger on space for multiple classes
                    provideCompletionItems: async (model, position) => {
                        const textUntilPosition = model.getValueInRange({
                            startLineNumber: position.lineNumber,
                            startColumn: 1,
                            endLineNumber: position.lineNumber,
                            endColumn: position.column,
                        });

                        if (!/class=["|'][^"']*\$/i.test(textUntilPosition)) {
                            return { suggestions: [] };
                        }

                        // Check if we are inside a class attribute
                        const match = textUntilPosition.match(/class=["']([^"']*)\$/);
                        if (!match) return { suggestions: [] };
                        let userInput = match[1].split(' ').pop(); // Get the current class input

                        if (!userInput) return { suggestions: [] };

                        const windpress_suggestions = await iframe.contentWindow.windpress.module.autocomplete.query(userInput);

                        return {
                            suggestions: windpress_suggestions.map(entry => ({
                                kind: entry.color 
                                    ? 19 //monaco.languages.CompletionItemKind.Color 
                                    : 14, //monaco.languages.CompletionItemKind.Constant,
                                label: entry.value,
                                insertText: entry.value,
                                detail: entry.value,
                                range: {
                                    startLineNumber: position.lineNumber,
                                    endLineNumber: position.lineNumber,
                                    startColumn: textUntilPosition.length - (userInput.length - 1),
                                    endColumn: position.column
                                }
                            }))
                        };

                        return { suggestions: [] };
                    }
                });
            });
        });
    </script>
HTML;
    }
}
