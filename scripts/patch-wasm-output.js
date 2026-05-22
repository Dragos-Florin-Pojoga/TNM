#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const buildDir = process.argv[2] || 'src/audio/build/js';
const channels = 8;

const files = {
  main: join(buildDir, 'maze_audio.js'),
  worklet: join(buildDir, 'maze_audio_AudioLibWorklet.js'),
};

const patches = [
  {
    file: 'main',
    desc: `outputChannelCount → ${channels}`,
    find: /{outputChannelCount:\[\d+\],processorOptions/,
    replace: `{outputChannelCount:[${channels}],processorOptions`,
  },
  {
    file: 'main',
    desc: `hv new_with_options output channels → ${channels} (main)`,
    find: /_hv_maze_audio_new_with_options\(this\.sampleRate,\d+,\d+,2\)/,
    replace: `_hv_maze_audio_new_with_options(this.sampleRate,10,2,${channels})`,
  },
  {
    file: 'worklet',
    desc: `output[i].set null guard`,
    find: /output\[i\]\.set/g,
    replace: 'if(output[i])output[i].set',
  },
  {
    file: 'worklet',
    desc: `hv new_with_options output channels → ${channels} (worklet)`,
    find: /_hv_maze_audio_new_with_options\(sampleRate,\d+,\d+,2\)/,
    replace: `_hv_maze_audio_new_with_options(sampleRate,10,2,${channels})`,
  },
];

let exitCode = 0;

for (const { file, desc, find, replace } of patches) {
  const path = files[file];
  let content;
  try {
    content = readFileSync(path, 'utf-8');
  } catch (err) {
    console.error(`ERROR: Cannot read ${path}: ${err.message}`);
    exitCode = 1;
    continue;
  }

  const match = content.match(find);
  if (!match) {
    console.warn(`WARNING: Pattern not found in ${file} — "${typeof find === 'string' ? find.slice(0, 60) : find.source.slice(0, 60)}..."`);
    console.warn(`  (${desc})`);
    continue;
  }

  content = content.replace(find, replace);
  writeFileSync(path, content, 'utf-8');
  console.log(`OK: ${desc} (matched "${match[0].slice(0, 50)}...")`);
}

if (exitCode !== 0) {
  process.exit(exitCode);
}

console.log('WASM output patching complete.');
