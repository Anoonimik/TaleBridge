import { registerHooks } from 'node:module';
import { transformSync } from 'esbuild';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && context.parentURL) {
      const url = new URL(specifier, context.parentURL);
      for (const suffix of ['', '.ts', '.tsx', '/index.ts']) {
        if (existsSync(fileURLToPath(url) + suffix) && /\.(?:ts|tsx)$/.test(url.pathname + suffix))
          return { url: pathToFileURL(fileURLToPath(url) + suffix).href, shortCircuit: true };
      }
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (/\.(?:ts|tsx)$/.test(url) && !url.includes('/node_modules/'))
      return {
        format: 'module',
        source: transformSync(readFileSync(new URL(url), 'utf8'), {
          loader: url.endsWith('tsx') ? 'tsx' : 'ts',
          format: 'esm',
          target: 'node24',
        }).code,
        shortCircuit: true,
      };
    return next(url, context);
  },
});
