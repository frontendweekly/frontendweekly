import fs from 'node:fs/promises';
import path from 'node:path';
import postcss from 'postcss';

export default class {
  async data() {
    const fileName = {
      postcss: 'main.pcss',
      css: 'main.css',
    };
    const rawFilepath = path.join(
      path.dirname(new URL(import.meta.url).pathname),
      `./${fileName.postcss}`
    );
    // Dynamically import postcss-load-config for ESM compatibility
    const postcssrc = await import('postcss-load-config');
    const { plugins, options } = await postcssrc.default();
    return {
      permalink: `assets/styles/${fileName.css}`,
      eleventyExcludeFromCollections: true,
      rawFilepath,
      rawCss: await fs.readFile(rawFilepath),
      plugins,
      options,
    };
  }

  async render({ rawCss, rawFilepath, plugins, options }) {
    return postcss(plugins)
      .process(rawCss, {
        ...options,
        from: rawFilepath,
      })
      .then((result) => result.css);
  }
}
