# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- [Wizard] Wizard settings now stay synchronized with direct edits to `wizard.css`.

## [3.3.87] - 2026-08-29

### Added

- File tree drag-and-drop support.
- Folder actions for creating files and folders.

### Fixed

- Drag preview scrollbar flicker.
- File editor hotkeys not working correctly on MacOS.
- [Gutenberg] Canvas compatibility issue on the latest WordPress 7.1
- [Wizard] Reported volume save failures instead of displaying a false success message [#81](https://github.com/jooosi-project/windpress/issues/81)

## [3.3.86] - 2026-07-17

### Added

- Updated bundled Tailwind CSS v4 to 4.3.3.

### Fixed

- [TW3] Browser compiler throws "Unable to determine current node version" [#78](https://github.com/jooosi-project/windpress/issues/78)
- [Gutenberg] Fixed saving issues when WPML is enabled.

## [3.3.85] - 2026-06-18

### Added

- Updated bundled Tailwind CSS v4 to 4.3.1

## [3.3.84] - 2026-06-04

### Changed

- Tested compatibility with WordPress 7.0.
- [Gutenberg] Marked the Common Block content attribute for WordPress 7.0 pattern content editing.

## [3.3.83] - 2026-05-16

### Added

- Updated bundled Tailwind CSS v4 to 4.3.0

## [3.3.82] - 2026-05-10

### Fixed

- [Oxygen 6] Failed to load the integration's script files in the Oxygen 6 editor.
- [Internal] Improved WordPress Abilities API validation and error handling.

## [3.3.81] - 2026-05-07

### Added

- [Oxygen 6](https://oxygenbuilder.com/ref/12/) integration **[Pro]**

## [3.3.80] - 2026-05-01

### Added

- Updated bundled Tailwind CSS v4 to 4.2.4

### Fixed

- [Bricks] Fixed Variable Picker not opening in localized Bricks editor environments, including Japanese.

## [3.3.79] - 2026-04-07

### Fixed

- [Bricks] Prevented cache scans from crashing when `_cssGlobalClasses` is stored as a string [#77](https://github.com/jooosi-project/windpress/issues/77)

## [3.3.78] - 2026-03-27

### Fixed

- [Internal] Prevented no-input Abilities API callbacks from crashing when WordPress omits the input argument [#76](https://github.com/jooosi-project/windpress/issues/76)

## [3.3.77] - 2026-03-27

### Added

- Updated bundled Tailwind CSS v4 to 4.2.2

### Changed
- Migrate the build system to [`@nabasa/vp-wp`](https://github.com/nabasa-dev/vp-wp) for improved performance and better WordPress integration

## [3.3.76] - 2026-02-28

### Changed

- Readme version formatting for better display on WordPress.org

## [3.3.75] - 2026-02-28

### Added

- Updated bundled Tailwind CSS v4 to 4.2.1

## [3.3.74] - 2026-02-20

### Added

- Updated bundled Tailwind CSS v3 to 3.4.19
- Updated bundled Tailwind CSS v4 to 4.2.0

### Fixed

- [Breakdance] Prevented unwanted `margin-top` styles in the editor
- [Bricks] Improved Firefox compatibility for html2bricks copy-paste
- [Internal] Fixed compiler partial scanning cache behavior

### Changed

- Improved backend compile scan performance across integrations
- Improved file editor support for Tailwind CSS v4 features

## [3.3.73] - 2025-12-22

### Added

- Updated bundled Tailwind CSS v4 to 4.1.18

### Fixed

- [Elementor, Bricks, Oxygen, OxygenClassic, Breakdance, Builderius, Timber, Blockstudio] Scanner now properly supports batch system to handle large datasets
- [Internal] JSON string detection in cache fetch_contents method to properly set content type

## [3.3.72] - 2025-12-08

### Changed

- Tested compatibility with WordPress 6.9

## [3.3.71] - 2025-12-08

### Fixed

- [Internal] Plugin's bundle (Zip) file are not generated correctly

## [3.3.70] - 2025-12-08

### Fixed

- [Internal] Plugin's bundle (Zip) file are not generated correctly

## [3.3.69] - 2025-12-08

### Added

- Initial WordPress Abilities API support (experimental)

### Fixed

- [Gutenberg] Generate Cache on Save feature's assets are not loaded correctly
- [Internal] path handling issue on the Windows OS

### Changed

- [Internal] Replace the old scanner's dependency with `@windpress/oxide-parser` package

## [3.3.68] - 2025-11-20

### Added

- [Gutenberg] Added Dark Mode toggle to switch between Light, Dark, and System themes
- [Gutenberg] Generate Cache on Save feature

### Changed

- Fixed color picker on the Wizard page when the initial color is empty
- Redefined how styles are loaded on the front page based on the selected Performance Mode: Hybrid, Cached, or Compiler.

### Removed

- Reverted file version history feature introduced in v3.3.65 due to complexity and performance concerns

## [3.3.67] - 2025-11-04

### Changed

- [Gutenberg] Improved the Common Block's HTML to Blocks conversion process for better handling of complex HTML structures (experimental)

## [3.3.66] - 2025-11-04

### Added

- [Gutenberg] Introduced "Common Block" — a generic and flexible block that lets you build any HTML element, with import/export support (experimental)

## [3.3.65] - 2025-10-24

### Added

- Updated bundled Tailwind CSS v4 to 4.1.16
- Added file version history feature to the Simple File System (experimental)

## [3.3.64] - 2025-10-18

### Added

- Updated bundled Tailwind CSS v4 to 4.1.14
- [TW4] Source Map support for easier debugging in the browser DevTools (experimental)

### Fixed

- Wizard tree doesn't show the children nodes correctly [#66](https://github.com/jooosi-project/windpress/issues/66)
- [Bricks] Paste HTML feature keyboard shortcut not working correctly [#64](https://github.com/jooosi-project/windpress/issues/64) [#67](https://github.com/jooosi-project/windpress/issues/67) [#68](https://github.com/jooosi-project/windpress/issues/68)

## [3.3.63] - 2025-09-27

### Fixed

- [Breakdance] Integration doesn't load on the recent version of Breakdance (v2.5.1)
- [TW4] IntelliSense was failing to correctly clean up `@apply` directives

## [3.3.62] - 2025-09-13

### Changed

- Improved file editor performance by registering IntelliSense only once after initialization

## [3.3.61] - 2025-09-10

### Fixed

- [Bricks] Plain Classes did not work on some Bricks template types like Archive, Search, and Section

## [3.3.60] - 2025-09-09

### Added

- Updated bundled Tailwind CSS v4 to 4.1.13
- [LiveCanvas] Added compatibility with LiveCanvas 4.7
- Added integrations settings page to manage the integrations features

## [3.3.59] - 2025-09-01

### Fixed

- [TW3] Missing `/css/preflight.css` file where the Preflight styles are enabled

## [3.3.58] - 2025-08-19

### Added

- Updated bundled Tailwind CSS v4 to 4.1.12

### Changed

- Restricted the IntelliSense on the Files tab feature to work exclusively with Tailwind CSS v4

### Fixed

- [TW3] Tailwind hover tooltips no longer show px equivalents [#58](https://github.com/jooosi-project/windpress/issues/58)

## [3.3.56] - 2025-08-13

### Fixed

- [TW4] IntelliSense performance issue on the Files tab for the CSS file

## [3.3.55] - 2025-08-13

### Added

- [TW4] IntelliSense on the Files tab for the CSS file
- WP-Rocket exclusion for the WindPress CSS and JavaScript files [#54](https://github.com/jooosi-project/windpress/issues/54)

### Changed

- [TW4] Autocompletion feature searches now is faster

### Fixed

- [Bricks] Plain Classes: Sort Classes glitch on the style

## [3.3.54] - 2025-07-24

### Changed

- [Gutenberg] Compiler: The raw block data is now appended on the scanner data to improve the class name detection [#53](https://github.com/jooosi-project/windpress/issues/53)
- [Wizard] The Wizard's data is now can saved directly without the need to switch the Files tab first

### Fixed

- [Bricks] Plain Classes feature doesn't work correctly with Bricks' templates
- [Bricks] Variables value not registered correctly to the Bricks Global Variables system

## [3.3.53] - 2025-07-16

### Added

- [Bricks] Added compatibility with Bricks 2.0

### Fixed

- [Bricks] Plain Classes feature does not work correctly with the Components feature

## [3.3.51] - 2025-07-10

### Fixed

- The `wizard.css` file is not updated correctly on the syncing process

## [3.3.44] - 2025-07-09

### Added

- Updated bundled Tailwind CSS v4 to 4.1.11
- [TW4] The Wizard feature is now available on the Dashboard page

## [3.3.43] - 2025-06-12

### Added

- Updated bundled Tailwind CSS v4 to 4.1.10

## [3.3.42] - 2025-06-06

### Changed

- [Gutenberg] Ran the Play Observer / Compiler even when the visual editor is not iframed

## [3.3.41] - 2025-06-04

### Fixed

- [Bricks] Variables contain `--` in the value being registered to the Bricks Global Variables system
- Plugin's bundle (Zip) file are not generated correctly

## [3.3.40] - 2025-06-01

### Changed

- [Bricks] The Plain Classes and Variables feature compatibility for version 2.0-beta
- Optimize the bundle (Zip) size of the plugin

## [3.3.39] - 2025-05-29

### Added

- Updated bundled Tailwind CSS v4 to 4.1.8

### Changed

- [TW4] The Play Observer / Compiler performance & stability
- [TW4] Robust `@import` handling

## [3.3.35] - 2025-05-28

### Changed

- [Gutenberg] The Play Observer / Compiler stability

### Fixed

- [TW4] `@import` a CDN stylesheet is not working correctly

## [3.3.34] - 2025-05-24

### Added

- [Etch](https://etchwp.com?aff=bce0d1ab) integration **[Pro]** (experimental)

## [3.3.33] - 2025-05-20

### Added

- Updated bundled Tailwind CSS v4 to 4.1.7
- Added context menu to the Simple File System explorer (right-click on the file explorer)

## [3.3.32] - 2025-05-11

### Added

- Updated bundled Tailwind CSS v4 to 4.1.6

### Fixed

- Unable to add new files to the Simple File System

## [3.3.31] - 2025-05-09

### Added

- Updated bundled Tailwind CSS v4 to 4.1.5

### Changed

- [TW4] The compiler is now logging the candidates it has found to aid in debugging

## [3.3.30] - 2025-04-29

### Changed

- [Gutenberg] Loaded the Play Observer / Compiler in Pattern preview [#40](https://github.com/jooosi-project/windpress/issues/40)
- [Bricks] The Plain Classes feature compatibility for version 2.0-alpha [#42](https://github.com/jooosi-project/windpress/issues/42)

### Fixed

- [Bricks] The Plain Classes field is not synchronized with the history (undo/redo) actions [#44](https://github.com/jooosi-project/windpress/issues/44)

## [3.3.29] - 2025-04-15

### Added

- Updated bundled Tailwind CSS v4 to 4.1.4

## [3.3.28] - 2025-04-08

### Changed

- Safari browser compatibility
- [Metabox Views] Scanner now use the rendered data instead of the raw data

## [3.3.27] - 2025-04-07

### Fixed

- [TW4] `@source` directive with `jsdelivr` CDN is not working correctly

## [3.3.26] - 2025-04-06

### Added

- Updated bundled Tailwind CSS v4 to 4.1.3

### Changed

- [TW4] Autocompletion feature now supports user-defined classes from the Simple File System data
- Excluded WindPress files from processing by the SiteGround Speed Optimizer plugin

### Fixed

- [Gutenberg] Misconfigured integration on the block editor

## [3.3.24] - 2025-04-03

### Fixed

- [TW4] Error on generate cache caused by the `@source` directive change in the Tailwind CSS v4 (4.1.1)

## [3.3.23] - 2025-04-02

### Added

- Updated bundled Tailwind CSS v4 to 4.1.1

### Changed

- Added keyboard shortcuts to Generate Cache on the WindPress dashboard page
- [TW3] The Play Observer / Compiler performance & stability

## [3.3.22] - 2025-03-28

### Fixed

- Storage issue on the Incremental Generate Cache feature [#34](https://github.com/jooosi-project/windpress/issues/34)

## [3.3.21] - 2025-03-28

### Changed

- [Experimental] The plugin is now fully translatable. Help us to translate the plugin into your language on [WordPress.org](https://translate.wordpress.org/projects/wp-plugins/windpress)

## [3.3.12] - 2025-03-27

### Added

- Updated bundled Tailwind CSS v4 to 4.0.17

## [3.3.11] - 2025-03-27

### Added

- Updated bundled Tailwind CSS v4 to 4.0.16

## [3.3.7] - 2025-03-27

### Fixed

- Browser compatibility issue with the latest compiler update.
- File on the editor are marked as read-only on Windows OS

## [3.3.5] - 2025-03-27

### Added

- Updated bundled Tailwind CSS v4 to 4.0.15
- [TW4] The compiler can now generate cache on front-end pages when the "Admin always uses Compiler" setting is enabled.

### Fixed

- [TW4][Breakdance, Bricks, Builderius, LiveCanvas, Oxygen Classic] The "Generate Cache on Save" feature are not available on the previous version

## [3.3.4] - 2025-03-27

### Fixed

- [TW4] The local stylesheet import is not resolved correctly

## [3.3.3] - 2025-03-27

### Added

- [Oxygen 6](https://oxygenbuilder.com/ref/12/) integration **[Pro]** (experimental)

### Changed

- [TW4] The Play Observer / Compiler performance & stability

### Fixed

- [TW4][Breakdance] Styles are now instantly applied in the editor

## [3.3.2] - 2025-03-27

### Added

- Updated bundled Tailwind CSS v4 to 4.0.14
- Refreshed the WindPress dashboard page design and layout for better user experience. Built with the latest [Nuxt UI](https://ui.nuxt.com/pro?aff=GZ5Zd)

### Fixed

- [TW3] The `tailwind.config.js` file is not properly loaded

## [3.2.35] - 2024-12-19

### Added

- Updated bundled Tailwind CSS v4 to 4.0.9

### Changed

- [TW4] Importing additional CSS files with the `@import` directive are now with the following format: `@import "fetch:https://example.com/path/to/the/file.css";`

## [3.2.34] - 2024-12-19

### Fixed

- Generating cache process issue on module resolution in the `main.css` file

## [3.2.33] - 2024-12-19

### Fixed

- Generating cache process issue on `@import` directive in the `main.css` file

## [3.2.32] - 2024-12-19

### Added

- Updated bundled Tailwind CSS v4 to 4.0.8
- [WPCodeBox 2](https://wpcodebox.com/) integration **[Pro]**

### Changed

- Better performance on the generating cache process
- [TW4] Generating the CSS cache will remove unused CSS variables. To always keep it, add them within the `@theme static { }` block in the `main.css` file. Alternatively, you can replace the `@import 'tailwindcss/theme.css' layer(theme);` code to `@import "tailwindcss/theme.css" layer(theme) theme(static);` on your `main.css` file.

## [3.2.31] - 2024-12-19

### Fixed

- Simple File System imported data are not loaded correctly

## [3.2.30] - 2024-12-19

### Added

- Updated bundled Tailwind CSS v4 to 4.0.7

### Fixed

- [TW4] The `@source` directive is causing error when loaded in the page builders' editor

## [3.2.29] - 2024-12-19

### Added

- Updated bundled Tailwind CSS v4 to 4.0.6
- [TW4] The `@source` directive is now supported but differs from the official Tailwind CSS version. Please refer to [our documentation](https://windpress.jooo.si/docs/configuration/file-main-css#scanning-additional-sources) for details.

## [3.2.28] - 2024-12-19

### Added

- Updated bundled Tailwind CSS v4 to 4.0.5

## [3.2.27] - 2024-12-19

### Added

- Simple File System data are now exportable and importable from the WindPress dashboard page

## [3.2.26] - 2024-12-19

### Added

- Updated bundled Tailwind CSS v4 to 4.0.4

## [3.2.25] - 2024-12-19

### Added

- Updated bundled Tailwind CSS v4 to 4.0.3

## [3.2.24] - 2024-12-19

### Added

- Updated bundled Tailwind CSS v4 to 4.0.1

## [3.2.23] - 2024-12-19

### Added

- Updated bundled Tailwind CSS v4 to 4.0.0

## [3.2.22] - 2024-12-19

### Fixed

- [Gutenberg] The CSS class field autofocusing issue on the block editor
- [Gutenberg, Breakdance, Bricks, Builderius, LiveCanvas, Oxygen] The "Generate Cache on Save" feature doesn't use the selected Tailwind CSS version

## [3.2.21] - 2024-12-19

### Added

- Updated bundled Tailwind CSS v4 to 4.0.0-beta.6

### Fixed

- [Breakdance] Editor style is mixed with admin-bar style (margin-top)

## [3.2.20] - 2024-12-19

### Changed

- Decoupled the Gutenberg-based integrations scanner

### Fixed

- [Gutenberg, Breakdance, Bricks, Oxygen] The hover preview feature is too late to disappear when the mouse is moved away from the class name

## [3.2.19] - 2024-12-19

### Added

- [Blockstudio](https://blockstudio.dev/?ref=7) integration **[Pro]**
- Updated bundled Tailwind CSS v3 to 3.4.16
- Updated bundled Tailwind CSS v4 to 4.0.0-beta.5

## [3.2.18] - 2024-12-19

### Added

- Updated bundled Tailwind CSS v4 to 4.0.0-beta.4
- [Meta Box Views](https://metabox.io/plugins/mb-views/) integration **[Pro]**

## [3.2.17] - 2024-12-19

### Added

- The new website and documentation is now live at [windpress.jooo.si](https://windpress.jooo.si)
- Updated bundled Tailwind CSS v4 to 4.0.0-beta.2

### Fixed

- Scanned classes names are not unescaped correctly ([#4](https://github.com/jooosi-project/windpress/issues/4))

## [3.2.16] - 2024-12-19

### Added

- Updated bundled Tailwind CSS v4 to 4.0.0-beta.1

## [3.2.15] - 2024-12-19

### Added

- Updated bundled Tailwind CSS v3 to 3.4.15
- Updated bundled Tailwind CSS v4 to 4.0.0-alpha.34

### Changed

- Tested compatibility with WordPress 6.7
- The [LiveCanvas](https://livecanvas.com/?ref=4008) integration is now available on the Free version
- Tailwind CSS v3 stubs/default content are updated for the upcoming Wizard feature

### Fixed

- [Gutenberg] Missing the WindPress data on the block editor

## [3.2.13] - 2024-12-19

### Fixed

- Settings page doesn't loaded

## [3.2.12] - 2024-12-19

### Added

- Updated bundled Tailwind CSS v4 to 4.0.0-alpha.33

### Changed

- [Breakdance, Bricks, Builderius, Oxygen] Variable Picker feature is now updated to the latest Tailwind CSS v4 variable names
- Tailwind CSS v3 stubs are updated for the upcoming Wizard feature

### Fixed

- [Bricks] The Variable Picker panel is not showing correctly on the Bricks editor

## [3.2.10] - 2024-12-19

### Added

- Updated bundled Tailwind CSS v4 to 4.0.0-alpha.32

## [3.2.9] - 2024-12-19

### Added

- Updated bundled Tailwind CSS v4 to 4.0.0-alpha.30

## [3.2.8] - 2024-12-19

### Added

- Updated bundled Tailwind CSS v4 to 4.0.0-alpha.29

## [3.2.7] - 2024-12-19

### Added

- Updated bundled Tailwind CSS v4 to 4.0.0-alpha.28

## [3.2.6] - 2024-12-19

### Added

- Updated bundled Tailwind CSS v3 to 3.4.14
- Updated bundled Tailwind CSS v4 to 4.0.0-alpha.27
- [Bricks] added settings to enable or disable WindPress' features. Right-click the WindPress icon on the Editor's top bar to access the settings.

## [3.2.5] - 2024-12-19

### Changed

- Reduced the number of Play modules loaded on front-end pages for non-admin users
- The Ubiquitous panel is now automatically hidden when outside of the panel is clicked

## [3.2.4] - 2024-12-19

### Fixed

- Breakdance integration doesn't work on the editor due to fail to load the required JavaScript files

## [3.2.3] - 2024-12-19

### Added

- Updated bundled Tailwind CSS v4 to 4.0.0-alpha.26

### Changed

- Improved handling of local JavaScript modules
- Renamed some action and filter hooks
- Some integrations' features are conditionally loaded based on the supported Tailwind CSS version

## [3.2.1] - 2024-12-19

### Added

- Ported Tailwind CSS v4 integration features to Tailwind CSS v3: Autocompletion, Sort, and Class Name to CSS

### Changed

- The Play Observer regenerates the CSS only if new classes are added to the DOM

## [3.2.0] - 2024-12-19

### Added

- Tailwind CSS v3 support has been added
- Updated bundled Tailwind CSS v3 to 3.4.13

### Changed

- Disabled preflight styles by default on new installations
- The CSS and JavaScript files are now deletable by emptying the content
- The `main.css` and `tailwind.config.js` files are now resettable by emptying the content

## [3.1.17] - 2024-12-19

### Added

- Updated bundled Tailwind CSS v4 to 4.0.0-alpha.25

## [3.1.15] - 2024-12-19

### Changed

- Added the bundled Tailwind CSS version number on the settings page
- Relative path support for the local CSS and JavaScript files

## [3.1.14] - 2024-12-19

### Added

- Updated bundled Tailwind CSS v4 to 4.0.0-alpha.24
- A simple local CSS and JavaScript file support to manage the Tailwind CSS customizations

### Fixed

- The Ubiquitous Panel feature issue on the Bricks editor

## [3.1.11] - 2024-12-19

### Changed

- Temporarily disabled the Ubiquitous Panel feature on the Bricks editor due to integration issues.

## [3.1.10] - 2024-12-19

### Added

- Updated bundled Tailwind CSS v4 to 4.0.0-alpha.23
- Initial support on Tailwind CSS configs loaded from CDN with the `@config` directive

### Changed

- Internationalization (i18n) support on the admin dashboard

### Fixed

- Some style issues on the admin dashboard

## [3.1.9] - 2024-12-19

### Added

- Updated bundled Tailwind CSS v4 to 4.0.0-alpha.21
- Initial support on Tailwind CSS plugins loaded from CDN with the `@plugin` directive

### Changed

- Internationalization (i18n) support on the admin dashboard

## [3.1.8] - 2024-12-19

### Added

- [Gutenberg](https://wordpress.org/gutenberg) integration.
- [GreenShift](https://shop.greenshiftwp.com/?from=3679) integration.
- [Kadence WP](https://kadencewp.com) integration.

## [3.1.6] - 2024-12-19

### Changed

- Internationalization (i18n) support

## [3.1.0] - 2024-12-19

### Added

- Updated bundled Tailwind CSS v4 to 4.0.0-alpha.20
- [Timber](https://upstatement.com/timber/) integration
- [Bricks](https://bricksbuilder.io/) integration **[Pro]**
- [Breakdance](https://breakdance.com/ref/165/) integration **[Pro]**
- [Builderius](https://builderius.io/?referral=afdfca82c8) integration **[Pro]**
- [LiveCanvas](https://livecanvas.com/?ref=4008) integration **[Pro]**
- [Oxygen](https://oxygenbuilder.com/ref/12/) integration **[Pro]**

### Changed

- Tested compatibility with WordPress 6.6

## [1.1.0] - 2024-12-19

### Added

- 🐣 Initial release.

[unreleased]: https://github.com/jooosi-project/windpress/compare/v3.3.87...HEAD
[3.3.87]: https://github.com/jooosi-project/windpress/compare/v3.3.86...v3.3.87
[3.3.86]: https://github.com/jooosi-project/windpress/compare/v3.3.85...v3.3.86
[3.3.85]: https://github.com/jooosi-project/windpress/compare/v3.3.84...v3.3.85
[3.3.84]: https://github.com/jooosi-project/windpress/compare/v3.3.83...v3.3.84
[3.3.83]: https://github.com/jooosi-project/windpress/compare/v3.3.82...v3.3.83
[3.3.82]: https://github.com/jooosi-project/windpress/compare/v3.3.81...v3.3.82
[3.3.81]: https://github.com/jooosi-project/windpress/compare/v3.3.80...v3.3.81
[3.3.80]: https://github.com/jooosi-project/windpress/compare/v3.3.79...v3.3.80
[3.3.79]: https://github.com/jooosi-project/windpress/compare/v3.3.78...v3.3.79
[3.3.78]: https://github.com/jooosi-project/windpress/compare/v3.3.77...v3.3.78
[3.3.77]: https://github.com/jooosi-project/windpress/compare/v3.3.76...v3.3.77
[3.3.76]: https://github.com/jooosi-project/windpress/compare/v3.3.75...v3.3.76
[3.3.75]: https://github.com/jooosi-project/windpress/compare/v3.3.74...v3.3.75
[3.3.74]: https://github.com/jooosi-project/windpress/compare/v3.3.73...v3.3.74
[3.3.73]: https://github.com/jooosi-project/windpress/compare/v3.3.72...v3.3.73
[3.3.72]: https://github.com/jooosi-project/windpress/compare/v3.3.71...v3.3.72
[3.3.71]: https://github.com/jooosi-project/windpress/compare/v3.3.70...v3.3.71
[3.3.70]: https://github.com/jooosi-project/windpress/compare/v3.3.69...v3.3.70
[3.3.69]: https://github.com/jooosi-project/windpress/compare/v3.3.68...v3.3.69
[3.3.68]: https://github.com/jooosi-project/windpress/compare/v3.3.67...v3.3.68
[3.3.67]: https://github.com/jooosi-project/windpress/compare/v3.3.66...v3.3.67
[3.3.66]: https://github.com/jooosi-project/windpress/compare/v3.3.65...v3.3.66
[3.3.65]: https://github.com/jooosi-project/windpress/compare/v3.3.64...v3.3.65
[3.3.64]: https://github.com/jooosi-project/windpress/compare/v3.3.63...v3.3.64
[3.3.63]: https://github.com/jooosi-project/windpress/compare/v3.3.62...v3.3.63
[3.3.62]: https://github.com/jooosi-project/windpress/compare/v3.3.61...v3.3.62
[3.3.61]: https://github.com/jooosi-project/windpress/compare/v3.3.60...v3.3.61
[3.3.60]: https://github.com/jooosi-project/windpress/compare/v3.3.59...v3.3.60
[3.3.59]: https://github.com/jooosi-project/windpress/compare/v3.3.58...v3.3.59
[3.3.58]: https://github.com/jooosi-project/windpress/compare/v3.3.57...v3.3.58
[3.3.57]: https://github.com/jooosi-project/windpress/compare/v3.3.56...v3.3.57
[3.3.56]: https://github.com/jooosi-project/windpress/compare/v3.3.55...v3.3.56
[3.3.55]: https://github.com/jooosi-project/windpress/compare/v3.3.54...v3.3.55
[3.3.54]: https://github.com/jooosi-project/windpress/compare/v3.3.53...v3.3.54
[3.3.53]: https://github.com/jooosi-project/windpress/compare/v3.3.51...v3.3.53
[3.3.51]: https://github.com/jooosi-project/windpress/compare/3.3.44...v3.3.51
[3.3.44]: https://github.com/jooosi-project/windpress/compare/3.3.43...3.3.44
[3.3.43]: https://github.com/jooosi-project/windpress/compare/3.3.42...3.3.43
[3.3.42]: https://github.com/jooosi-project/windpress/compare/3.3.41...3.3.42
[3.3.41]: https://github.com/jooosi-project/windpress/compare/3.3.40...3.3.41
[3.3.40]: https://github.com/jooosi-project/windpress/compare/3.3.39...3.3.40
[3.3.39]: https://github.com/jooosi-project/windpress/compare/3.3.35...3.3.39
[3.3.35]: https://github.com/jooosi-project/windpress/compare/3.3.34...3.3.35
[3.3.34]: https://github.com/jooosi-project/windpress/compare/3.3.33...3.3.34
[3.3.33]: https://github.com/jooosi-project/windpress/compare/3.3.32...3.3.33
[3.3.32]: https://github.com/jooosi-project/windpress/compare/3.3.31...3.3.32
[3.3.31]: https://github.com/jooosi-project/windpress/compare/3.3.30...3.3.31
[3.3.30]: https://github.com/jooosi-project/windpress/compare/3.3.29...3.3.30
[3.3.29]: https://github.com/jooosi-project/windpress/compare/3.3.28...3.3.29
[3.3.28]: https://github.com/jooosi-project/windpress/compare/3.3.27...3.3.28
[3.3.27]: https://github.com/jooosi-project/windpress/compare/3.3.26...3.3.27
[3.3.26]: https://github.com/jooosi-project/windpress/compare/3.3.24...3.3.26
[3.3.24]: https://github.com/jooosi-project/windpress/compare/3.3.23...3.3.24
[3.3.23]: https://github.com/jooosi-project/windpress/compare/3.3.22...3.3.23
[3.3.22]: https://github.com/jooosi-project/windpress/compare/3.3.21...3.3.22
[3.3.21]: https://github.com/jooosi-project/windpress/compare/3.3.12...3.3.21
[3.3.12]: https://github.com/jooosi-project/windpress/compare/3.3.11...3.3.12
[3.3.11]: https://github.com/jooosi-project/windpress/compare/3.3.7...3.3.11
[3.3.7]: https://github.com/jooosi-project/windpress/compare/3.3.5...3.3.7
[3.3.5]: https://github.com/jooosi-project/windpress/compare/3.3.4...3.3.5
[3.3.4]: https://github.com/jooosi-project/windpress/compare/3.3.3...3.3.4
[3.3.3]: https://github.com/jooosi-project/windpress/compare/3.3.2...3.3.3
[3.3.2]: https://github.com/jooosi-project/windpress/compare/3.2.35...3.3.2
[3.2.35]: https://github.com/jooosi-project/windpress/compare/3.2.34...3.2.35
[3.2.34]: https://github.com/jooosi-project/windpress/compare/3.2.33...3.2.34
[3.2.33]: https://github.com/jooosi-project/windpress/compare/3.2.32...3.2.33
[3.2.32]: https://github.com/jooosi-project/windpress/compare/3.2.31...3.2.32
[3.2.31]: https://github.com/jooosi-project/windpress/compare/3.2.30...3.2.31
[3.2.30]: https://github.com/jooosi-project/windpress/compare/3.2.29...3.2.30
[3.2.29]: https://github.com/jooosi-project/windpress/compare/3.2.28...3.2.29
[3.2.28]: https://github.com/jooosi-project/windpress/compare/3.2.27...3.2.28
[3.2.27]: https://github.com/jooosi-project/windpress/compare/3.2.26...3.2.27
[3.2.26]: https://github.com/jooosi-project/windpress/compare/3.2.25...3.2.26
[3.2.25]: https://github.com/jooosi-project/windpress/compare/3.2.24...3.2.25
[3.2.24]: https://github.com/jooosi-project/windpress/compare/3.2.23...3.2.24
[3.2.23]: https://github.com/jooosi-project/windpress/compare/3.2.22...3.2.23
[3.2.22]: https://github.com/jooosi-project/windpress/compare/3.2.21...3.2.22
[3.2.21]: https://github.com/jooosi-project/windpress/compare/3.2.20...3.2.21
[3.2.20]: https://github.com/jooosi-project/windpress/compare/3.2.19...3.2.20
[3.2.19]: https://github.com/jooosi-project/windpress/compare/3.2.18...3.2.19
[3.2.18]: https://github.com/jooosi-project/windpress/compare/3.2.17...3.2.18
[3.2.17]: https://github.com/jooosi-project/windpress/compare/3.2.16...3.2.17
[3.2.16]: https://github.com/jooosi-project/windpress/compare/3.2.15...3.2.16
[3.2.15]: https://github.com/jooosi-project/windpress/compare/3.2.13...3.2.15
[3.2.13]: https://github.com/jooosi-project/windpress/compare/3.2.12...3.2.13
[3.2.12]: https://github.com/jooosi-project/windpress/compare/3.2.10...3.2.12
[3.2.10]: https://github.com/jooosi-project/windpress/compare/3.2.9...3.2.10
[3.2.9]: https://github.com/jooosi-project/windpress/compare/3.2.8...3.2.9
[3.2.8]: https://github.com/jooosi-project/windpress/compare/3.2.7...3.2.8
[3.2.7]: https://github.com/jooosi-project/windpress/compare/3.2.6...3.2.7
[3.2.6]: https://github.com/jooosi-project/windpress/compare/3.2.5...3.2.6
[3.2.5]: https://github.com/jooosi-project/windpress/compare/3.2.4...3.2.5
[3.2.4]: https://github.com/jooosi-project/windpress/compare/3.2.3...3.2.4
[3.2.3]: https://github.com/jooosi-project/windpress/compare/3.2.1...3.2.3
[3.2.1]: https://github.com/jooosi-project/windpress/compare/3.2.0...3.2.1
[3.2.0]: https://github.com/jooosi-project/windpress/compare/3.1.17...3.2.0
[3.1.17]: https://github.com/jooosi-project/windpress/compare/3.1.15...3.1.17
[3.1.15]: https://github.com/jooosi-project/windpress/compare/3.1.14...3.1.15
[3.1.14]: https://github.com/jooosi-project/windpress/compare/3.1.11...3.1.14
[3.1.11]: https://github.com/jooosi-project/windpress/compare/3.1.10...3.1.11
[3.1.10]: https://github.com/jooosi-project/windpress/compare/3.1.9...3.1.10
[3.1.9]: https://github.com/jooosi-project/windpress/compare/3.1.8...3.1.9
[3.1.8]: https://github.com/jooosi-project/windpress/compare/3.1.6...3.1.8
[3.1.6]: https://github.com/jooosi-project/windpress/compare/3.1.0...3.1.6
[3.1.0]: https://github.com/jooosi-project/windpress/compare/1.1.0...3.1.0
[1.1.0]: https://github.com/jooosi-project/windpress/releases/tag/v1.1.0
