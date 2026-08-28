declare module "*?raw" {
  const content: string;
  export default content;
}

declare module "*?url" {
  const url: string;
  export default url;
}

declare module "*.svg" {
  const content: string;
  export default content;
}

interface Window {
  windpress: {
    // The version of WindPress.
    _version: string;

    _wp_version: string;

    // The version of used Tailwind CSS.
    _tailwindcss_version: string;

    // The edition of WindPress. If true, the Free Edition is used.
    _via_wp_org: boolean;

    // Should the WindPress setting panel be displayed in front page?
    is_ubiquitous: boolean;

    assets: {
      url: string;
    };

    user_data: {
      data_dir: {
        url: string;
      };

      cache_dir: string[];
    };

    _wpnonce: string;

    rest_api: {
      // The base URL of the WindPress REST API endpoint.
      url: string;

      // The nonce for authenticating requests to the WindPress REST API.
      nonce: string;
    };

    site_meta: {
      name: string;

      site_url: string;

      // Vue Router base URL.
      web_history: string;
    };

    current_user: {
      name: string;

      avatar: string;

      role: string;
    };

    is_debug: boolean;
  };
}
