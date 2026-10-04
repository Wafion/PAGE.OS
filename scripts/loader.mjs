import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

export async function resolve(specifier, context, nextResolve) {
  let target = specifier;
  if (specifier.startsWith('@/')) {
    const rel = specifier.slice(2);
    const resolvedPath = path.resolve(process.cwd(), 'src', rel);
    for (const ext of ['', '.ts', '.tsx', '.js', '.mjs', '/index.ts']) {
      const candidate = resolvedPath + ext;
      if (fs.existsSync(candidate) && !fs.statSync(candidate).isDirectory()) {
        return {
          url: pathToFileURL(candidate).href,
          shortCircuit: true,
        };
      }
    }
  } else if (specifier.startsWith('.') && !path.extname(specifier)) {
    if (context.parentURL) {
      const parentDir = path.dirname(new URL(context.parentURL).pathname.replace(/^\/([A-Z]:)/, '$1'));
      const resolvedPath = path.resolve(parentDir, specifier);
      for (const ext of ['.ts', '.tsx', '.js', '.mjs', '/index.ts']) {
        const candidate = resolvedPath + ext;
        if (fs.existsSync(candidate) && !fs.statSync(candidate).isDirectory()) {
          return {
            url: pathToFileURL(candidate).href,
            shortCircuit: true,
          };
        }
      }
    }
  }
  return nextResolve(target, context);
}
