<p align="center">
  <img src="./windpress.svg" alt="WindPress Logo" width="100">
</p>

<h1 align="center">WindPress</h1>

<p align="center">
  <i>WindPress is a platform-agnostic plugin for integrating Tailwind CSS into WordPress, allowing you to harness the full power of Tailwind CSS within the WordPress ecosystem.</i>
</p>

<p align="center">
  <a href="https://downloads.wordpress.org/plugin/windpress.zip">
    <picture>
    <img src="https://img.shields.io/wordpress/plugin/v/windpress.svg?logo=wordpress&label=version" alt="WordPress plugin version" />
    </picture>
  </a>
  <a href="https://wordpress.org/plugins/windpress/advanced/">
    <picture>
    <img src="https://img.shields.io/wordpress/plugin/dt/windpress.svg?logo=wordpress" alt="WordPress plugin downloads" />
    </picture>
  </a>
  <a href="https://wordpress.org/plugins/windpress/">
    <picture>
    <img src="https://img.shields.io/wordpress/plugin/installs/windpress.svg?logo=wordpress" alt="WordPress plugin active installs" />
    </picture>
  </a>
  <a href="https://wordpress.org/support/plugin/windpress/reviews/?filter=5/#new-post">
    <picture>
    <img src="https://img.shields.io/wordpress/plugin/stars/windpress.svg?logo=wordpress" alt="WordPress plugin rating" />
    </picture>
  </a>
  <br />
  <a href="https://github.com/jooosi-project/windpress/releases">
    <picture>
    <img src="https://img.shields.io/github/v/release/jooosi-project/windpress.svg?logo=github" alt="GitHub Release" />
    </picture>
  </a>
  <a href="https://github.com/jooosi-project/windpress/blob/master/LICENSE">
    <picture>
    <img src="https://img.shields.io/github/license/jooosi-project/windpress.svg" alt="MIT License" />
    </picture>
  </a>
  <a href="https://github.com/jooosi-project/windpress/actions">
    <picture>
    <img src="https://img.shields.io/github/actions/workflow/status/jooosi-project/windpress/deploy.yaml" alt="Build Status" />
    </picture>
  </a>
  <br />
  <a aria-label="GitHub Sponsors" href="https://github.com/sponsors/suasgn">
    <picture>
      <img alt="GitHub Sponsors button" src="https://img.shields.io/github/sponsors/suasgn?logo=github">
    </picture>
  </a>
  <a aria-label="Support me on Ko-fi" href="https://ko-fi.com/Q5Q75XSF7">
    <picture>
      <img alt="ko-fi button" src="https://img.shields.io/badge/Buy_me_a_Coffee-ff5e5b?logo=ko-fi&label=Ko-fi">
    </picture>
  </a>
  <a aria-label="Join Our Facebook community" href="https://windpress.jooo.si/go/facebook">
    <picture>
      <img alt="facebook group button" src="https://img.shields.io/badge/Join_us-0866ff?logo=facebook&label=Community">
    </picture>
  </a>
</p>

> [!NOTE]
>
> You are looking at the WordPress plugin for integrating Tailwind CSS `v3` and `v4`.

## Intro

Use Tailwind CSS within the block editor, page builders, plugins, and themes — no build step is required.

### Features

- ✅ **Easy to use**: Simplified and intuitive settings to get you up and running quickly.
- 🥰 **Customizable Configuration**: Comes with a default Tailwind CSS configuration, which can be customized to fit your needs.
- ⚡️ **Lightweight and blazingly fast**: Built on top of WordPress REST API. It has a small footprint and won't slow down your site.
- 📦 **Compile on the browser. No server is required**: Generate the final CSS file in the browser without server-side tools. None of your data is transferred over the network.

### Integrations

Seamless integration with the most popular visual/page builders:

- [Gutenberg](https://wordpress.org/gutenberg/?ref=windpress) / Block Editor
- [GreenShift](https://shop.greenshiftwp.com/?from=3679)
- [Kadence WP](https://kadencewp.com/?ref=windpress)
- [LiveCanvas](https://livecanvas.com/?ref=4008)
- [Timber](https://upstatement.com/timber/?ref=windpress)
- [Blockstudio](https://blockstudio.dev/?ref=7) — **Pro**
- [Breakdance](https://breakdance.com/ref/165/) — **Pro**
- [Bricks](https://bricksbuilder.io/?ref=windpress) — **Pro**
- [Builderius](https://builderius.io/?referral=afdfca82c8) — **Pro**
- [Etch](https://etchwp.com?aff=bce0d1ab) — **Pro**
- [Meta Box Views](https://metabox.sjv.io/OeOeZr) — **Pro**
- [Oxygen 6 / Classic](https://oxygenbuilder.com/ref/12/) — **Pro**
- [WPCodeBox 2](https://wpcodebox.com/?ref=185) — **Pro**

#### Planned / In Progress

- [Elementor](https://be.elementor.com/visit/?bta=209150&brand=elementor)
- [Divi](https://www.elegantthemes.com/affiliates/idevaffiliate.php?id=47622)
- [Pinegrow](https://pinegrow.com/wordpress?ref=windpress)
- [Zion Builder](https://zionbuilder.io/?ref=windpress)

## 🛠 Development

### Requirements

- [Node.js](https://nodejs.org/)
- [pnpm](https://pnpm.io)
- [Composer](https://getcomposer.org/)
- [Docker](https://www.docker.com/) with Buildx

### Getting Started

1. Clone the repository to your `wp-content/plugins` directory:

   ```bash
   git clone https://github.com/jooosi-project/windpress.git windpress-dev
   cd windpress-dev
   ```

2. Install the PHP dependencies:

   ```bash
   composer install
   ```

3. Install the JavaScript dependencies:

   ```bash
   pnpm install
   ```

4. Generate the local Tailwind Oxide WASM bindings:

   ```bash
   pnpm build:oxide
   ```

   Run this command again whenever you want to refresh the bindings from Tailwind's current default
   branch. `pnpm build` runs it automatically before creating production assets.

5. Start the development server:

   ```bash
   pnpm run dev
   ```

6. Activate the plugin.

## Community

- 💬 Join the community on [Facebook Group](https://windpress.jooo.si/go/facebook) and [Discord](https://windpress.jooo.si/go/discord)

## Sponsors

If you like this project, please consider supporting us by becoming a sponsor through the following platforms:

- [GitHub Sponsors](https://github.com/sponsors/suasgn)
- [Ko-fi](https://ko-fi.com/Q5Q75XSF7)

Thank you to all our Sponsors! 🥰🫰🫶

This project is tested with BrowserStack

## Repo Activity

![Repo Activity](https://repobeats.axiom.co/api/embed/0769f849ed16dfa78931203ea4e2a6291fd8be04.svg "Repobeats analytics image")

<a href="https://star-history.com/#jooosi-project/windpress&Date"> <picture> <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=jooosi-project/windpress&type=Date&theme=dark" /> <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=jooosi-project/windpress&type=Date" /> <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=jooosi-project/windpress&type=Date" /> </picture> </a>
