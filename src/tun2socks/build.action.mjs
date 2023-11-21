// Copyright 2023 The Outline Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import url from 'url';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

import {spawnStream} from '../build/spawn_stream.mjs';
import {getBuildParameters} from '../build/get_build_parameters.mjs';
import {getRootDir} from '../build/get_root_dir.mjs';

/**
 * @description Builds the tun2socks library for the specified platform.
 *
 * @param {string[]} parameters
 */
export async function main(...parameters) {
  const {platform: targetPlatform} = getBuildParameters(parameters);

  const binDir = path.join(getRootDir(), 'build', 'bin');
  const outputDir = path.join(getRootDir(), 'build', targetPlatform);

  await fs.mkdir(binDir, {recursive: true});
  await fs.mkdir(outputDir, {recursive: true});

  // install go tools locally
  await spawnStream(
    'go',
    'build',
    '-o',
    binDir,
    'golang.org/x/mobile/cmd/gomobile',
    'golang.org/x/mobile/cmd/gobind',
    'github.com/crazy-max/xgo'
  );

  const hostPlatform = os.platform();

  process.env.PATH = hostPlatform === 'win32' ? `${binDir};${process.env.PATH}` : `${binDir}:${process.env.PATH}`;

  switch (targetPlatform + hostPlatform) {
    case 'android' + 'darwin':
    case 'android' + 'linux':
    case 'android' + 'win32':
      return spawnStream(
        'gomobile',
        'bind',
        '-androidapi=33',
        '-target=android',
        `-o=${outputDir}/tun2socks.aar`,
        'github.com/Jigsaw-Code/outline-client/src/tun2socks/outline/tun2socks',
        'github.com/Jigsaw-Code/outline-client/src/tun2socks/outline/shadowsocks'
      );
    case 'ios' + 'darwin':
    case 'macos' + 'darwin':
    case 'maccatalyst' + 'darwin':
      process.env.MACOSX_DEPLOYMENT_TARGET = '10.14';

      return spawnStream(
        'gomobile',
        'bind',
        '-bundleid=org.outline.tun2socks',
        '-iosversion=13.1',
        `-target=${targetPlatform}`,
        `-o=${outputDir}/tun2socks.xcframework`,
        'github.com/Jigsaw-Code/outline-client/src/tun2socks/outline/tun2socks',
        'github.com/Jigsaw-Code/outline-client/src/tun2socks/outline/shadowsocks'
      );
    case 'windows' + 'linux':
    case 'windows' + 'darwin':
      return spawnStream(
        'xgo',
        '-targets=windows/386',
        `-dest=${outputDir}/tun2socks`,
        '-pkg=src/tun2socks/outline/electron',
        '-out=tun2socks.exe',
        '.'
      );
    case 'linux' + 'win32':
    case 'linux' + 'darwin':
      return spawnStream(
        'xgo',
        '-targets=linux/amd64',
        `-dest=${outputDir}/tun2socks`,
        '-pkg=src/tun2socks/outline/electron',
        '-out=tun2socks',
        '.'
      );
    case 'windows' + 'win32':
    case 'linux' + 'linux':
      return spawnStream(
        'go',
        'build',
        '-o',
        `${outputDir}/tun2socks`,
        'github.com/Jigsaw-Code/outline-client/src/tun2socks/outline/electron'
      );
    default:
      throw new Error(`Unsupported cross-compilation: ${targetPlatform} on ${hostPlatform}`);
  }
}

if (import.meta.url === url.pathToFileURL(process.argv[1]).href) {
  await main(...process.argv.slice(2));
}
