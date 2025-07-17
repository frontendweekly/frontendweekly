import fs from 'node:fs/promises';
import path from 'node:path';
import postcss from 'postcss';

/**
 * PostCSS processor for Eleventy that compiles PCSS files to CSS
 */
export default class {
  /**
   * Returns configuration data for the PostCSS processor
   * @returns {Promise<Object>} Configuration object with file paths, content, and PostCSS options
   */
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

  /**
   * Processes CSS using PostCSS with configured plugins
   * @param {Object} params - Parameters from data() method
   * @param {Buffer} params.rawCss - Raw CSS content to process
   * @param {string} params.rawFilepath - Path to the source file
   * @param {Array} params.plugins - PostCSS plugins to apply
   * @param {Object} params.options - PostCSS options
   * @returns {Promise<string>} Processed CSS string
   */
  async render({ rawCss, rawFilepath, plugins, options }) {
    return postcss(plugins)
      .process(rawCss, {
        ...options,
        from: rawFilepath,
      })
      .then((result) => result.css);
  }
}
