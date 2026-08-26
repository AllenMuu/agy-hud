import * as esbuild from 'esbuild';
import fs from 'node:fs';

const isWatch = process.argv.includes('--watch');
const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

const buildOptions = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/agy-hud.js',
  banner: {
    js: '#!/usr/bin/env node\n',
  },
  define: {
    '__CLI_VERSION__': JSON.stringify(pkg.version),
  },
  minify: false,
  sourcemap: false,
};

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await esbuild.build(buildOptions);
  console.log('Build complete: dist/agy-hud.js');
}

