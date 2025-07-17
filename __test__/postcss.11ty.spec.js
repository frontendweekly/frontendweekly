import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn(),
  },
}));

vi.mock('node:path', () => ({
  default: {
    join: vi.fn(),
    dirname: vi.fn(),
  },
}));

vi.mock('postcss', () => ({
  default: vi.fn(),
}));

vi.mock('postcss-load-config', () => ({
  default: vi.fn(),
}));

describe('PostCSS 11ty', () => {
  let PostCSS11ty;
  let mockFs;
  let mockPath;
  let mockPostcss;
  let mockPostcssrc;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    
    // Get mocked modules
    mockFs = (await import('node:fs/promises')).default;
    mockPath = (await import('node:path')).default;
    mockPostcss = (await import('postcss')).default;
    mockPostcssrc = (await import('postcss-load-config')).default;
    
    // Setup default mocks
    mockFs.readFile.mockResolvedValue('body { color: red; }');
    mockPath.join.mockReturnValue('/mock/path/main.pcss');
    mockPath.dirname.mockReturnValue('/mock/path');
    
    // Mock URL constructor for import.meta.url
    global.URL = vi.fn().mockImplementation((url) => ({
      pathname: '/mock/path/postcss.11ty.js',
    }));
    
    // Mock postcss-load-config
    mockPostcssrc.mockResolvedValue({
      plugins: ['autoprefixer'],
      options: { from: 'main.pcss' },
    });
    
    // Mock postcss with proper chain
    const mockProcess = vi.fn().mockReturnValue({
      then: vi.fn().mockResolvedValue({ css: 'body { color: red; }' }),
    });
    mockPostcss.mockReturnValue({
      process: mockProcess,
    });
    
          // Import the class
      const module = await import('../11ty/_postcss/postcss.11ty.js');
      PostCSS11ty = module.default;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('data() method', () => {
    test('should return correct data structure', async () => {
      const instance = new PostCSS11ty();
      const result = await instance.data();

      expect(result).toEqual({
        permalink: 'assets/styles/main.css',
        eleventyExcludeFromCollections: true,
        rawFilepath: '/mock/path/main.pcss',
        rawCss: 'body { color: red; }',
        plugins: ['autoprefixer'],
        options: { from: 'main.pcss' },
      });
    });

    test('should read the correct PostCSS file', async () => {
      const instance = new PostCSS11ty();
      await instance.data();

      expect(mockFs.readFile).toHaveBeenCalledWith('/mock/path/main.pcss');
    });

    test('should load PostCSS config', async () => {
      const instance = new PostCSS11ty();
      await instance.data();

      expect(mockPostcssrc).toHaveBeenCalled();
    });

    test('should handle PostCSS config loading errors', async () => {
      mockPostcssrc.mockRejectedValue(new Error('Config error'));
      
      const instance = new PostCSS11ty();
      
      await expect(instance.data()).rejects.toThrow('Config error');
    });

    test('should handle file reading errors', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));
      
      const instance = new PostCSS11ty();
      
      await expect(instance.data()).rejects.toThrow('File not found');
    });

    test('should use correct file paths', async () => {
      const instance = new PostCSS11ty();
      await instance.data();

      expect(mockPath.join).toHaveBeenCalledWith('/mock/path', './main.pcss');
      expect(mockPath.dirname).toHaveBeenCalledWith('/mock/path/postcss.11ty.js');
    });
  });

  describe('render() method', () => {
    test('should process CSS with PostCSS', async () => {
      const instance = new PostCSS11ty();
      const mockData = {
        rawCss: 'body { color: red; }',
        rawFilepath: '/mock/path/main.pcss',
        plugins: ['autoprefixer'],
        options: { from: 'main.pcss' },
      };

      const result = await instance.render(mockData);

      expect(mockPostcss).toHaveBeenCalledWith(['autoprefixer']);
      expect(result.css).toBe('body { color: red; }');
    });

    test('should pass correct options to PostCSS process', async () => {
      const instance = new PostCSS11ty();
      const mockData = {
        rawCss: 'body { color: red; }',
        rawFilepath: '/mock/path/main.pcss',
        plugins: ['autoprefixer'],
        options: { from: 'main.pcss' },
      };

      const mockProcess = vi.fn().mockReturnValue({
        then: vi.fn().mockResolvedValue({ css: 'processed css' }),
      });
      mockPostcss.mockReturnValue({
        process: mockProcess,
      });

      const result = await instance.render(mockData);

      expect(mockProcess).toHaveBeenCalledWith('body { color: red; }', {
        from: 'main.pcss',
        from: '/mock/path/main.pcss',
      });
      expect(result.css).toBe('processed css');
    });

    test('should handle PostCSS processing errors', async () => {
      const instance = new PostCSS11ty();
      const mockData = {
        rawCss: 'body { color: red; }',
        rawFilepath: '/mock/path/main.pcss',
        plugins: ['autoprefixer'],
        options: { from: 'main.pcss' },
      };

      const mockProcess = vi.fn().mockReturnValue({
        then: vi.fn().mockRejectedValue(new Error('Processing error')),
      });
      mockPostcss.mockReturnValue({
        process: mockProcess,
      });

      await expect(instance.render(mockData)).rejects.toThrow('Processing error');
    });

    test('should handle empty CSS input', async () => {
      const instance = new PostCSS11ty();
      const mockData = {
        rawCss: '',
        rawFilepath: '/mock/path/main.pcss',
        plugins: ['autoprefixer'],
        options: { from: 'main.pcss' },
      };

      const mockProcess = vi.fn().mockReturnValue({
        then: vi.fn().mockResolvedValue({ css: '' }),
      });
      mockPostcss.mockReturnValue({
        process: mockProcess,
      });

      const result = await instance.render(mockData);

      expect(result.css).toBe('');
    });

    test('should handle complex CSS with multiple rules', async () => {
      const instance = new PostCSS11ty();
      const complexCss = `
        body { 
          color: red; 
          background: blue; 
        }
        .header { 
          font-size: 16px; 
        }
      `;
      const mockData = {
        rawCss: complexCss,
        rawFilepath: '/mock/path/main.pcss',
        plugins: ['autoprefixer', 'cssnano'],
        options: { from: 'main.pcss' },
      };

      const processedCss = 'body{color:red;background:blue}.header{font-size:16px}';
      const mockProcess = vi.fn().mockReturnValue({
        then: vi.fn().mockResolvedValue({ css: processedCss }),
      });
      mockPostcss.mockReturnValue({
        process: mockProcess,
      });

      const result = await instance.render(mockData);

      expect(mockPostcss).toHaveBeenCalledWith(['autoprefixer', 'cssnano']);
      expect(result.css).toBe(processedCss);
    });

    test('should handle missing plugins', async () => {
      const instance = new PostCSS11ty();
      const mockData = {
        rawCss: 'body { color: red; }',
        rawFilepath: '/mock/path/main.pcss',
        plugins: [],
        options: { from: 'main.pcss' },
      };

      const mockProcess = vi.fn().mockReturnValue({
        then: vi.fn().mockResolvedValue({ css: 'body { color: red; }' }),
      });
      mockPostcss.mockReturnValue({
        process: mockProcess,
      });

      const result = await instance.render(mockData);

      expect(mockPostcss).toHaveBeenCalledWith([]);
      expect(result.css).toBe('body { color: red; }');
    });

    test('should handle missing options', async () => {
      const instance = new PostCSS11ty();
      const mockData = {
        rawCss: 'body { color: red; }',
        rawFilepath: '/mock/path/main.pcss',
        plugins: ['autoprefixer'],
        options: {},
      };

      const mockProcess = vi.fn().mockReturnValue({
        then: vi.fn().mockResolvedValue({ css: 'body { color: red; }' }),
      });
      mockPostcss.mockReturnValue({
        process: mockProcess,
      });

      const result = await instance.render(mockData);

      expect(mockProcess).toHaveBeenCalledWith('body { color: red; }', {
        from: '/mock/path/main.pcss',
      });
      expect(result.css).toBe('body { color: red; }');
    });
  });

  describe('integration', () => {
    test('should work end-to-end with realistic data', async () => {
      const instance = new PostCSS11ty();
      
      // Mock realistic PostCSS config
      mockPostcssrc.mockResolvedValue({
        plugins: ['postcss-import', 'autoprefixer', 'cssnano'],
        options: { from: 'main.pcss', to: 'main.css' },
      });

      // Mock realistic CSS input
      mockFs.readFile.mockResolvedValue(`
        @import "components/header.css";
        body { 
          color: #333; 
          font-family: Arial, sans-serif; 
        }
      `);

      const mockProcess = vi.fn().mockReturnValue({
        then: vi.fn().mockResolvedValue({ 
          css: 'body{color:#333;font-family:Arial,sans-serif}' 
        }),
      });
      mockPostcss.mockReturnValue({
        process: mockProcess,
      });

      // Test data() method
      const data = await instance.data();
      expect(data.permalink).toBe('assets/styles/main.css');
      expect(data.plugins).toEqual(['postcss-import', 'autoprefixer', 'cssnano']);

      // Test render() method
      const result = await instance.render(data);
      expect(result.css).toBe('body{color:#333;font-family:Arial,sans-serif}');
    });
  });
}); 