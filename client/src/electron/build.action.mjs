// Copyright 2022 The Outline Authors
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

import minimist from 'minimist';
import {getBuildParameters} from '../build/get_build_parameters.mjs';
import {runAction} from '../build/run_action.mjs';
import electron, {Platform} from 'electron-builder';
import copydir from 'copy-dir';
import fs from 'fs/promises';
import url from 'url';
import {getRootDir} from '../build/get_root_dir.mjs';
import path from 'path';

const ELECTRON_BUILD_DIR = 'output';
const ELECTRON_PLATFORMS = ['linux', 'windows'];

export async function main(...parameters) {
  const {platform, buildMode, versionName} = getBuildParameters(parameters);
  const {autoUpdateProvider = 'generic', autoUpdateUrl} = minimist(parameters);

  if (!ELECTRON_PLATFORMS.includes(platform)) {
    throw new TypeError(
      `The platform "${platform}" is not a valid Electron platform. It must be one of: ${ELECTRON_PLATFORMS.join(
        ', '
      )}.`
    );
  }

  if (buildMode === 'debug') {
    console.warn(`WARNING: building "${platform}" in [DEBUG] mode. Do not publish this build!!`);
  }

  if (buildMode === 'release' && !autoUpdateUrl) {
    throw new TypeError(
      "You need to add an electron-builder compliant auto-update url via an 'autoUpdateUrl' flag." +
        'See here: https://www.electron.build/configuration/publish#publishers'
    );
  }

  await runAction('client/src/www/build', ...parameters);
  await runAction('client/src/tun2socks/build', ...parameters);
  await runAction('client/src/electron/build_main', ...parameters);

  await fs.mkdir(path.join(getRootDir(), ELECTRON_BUILD_DIR, 'icons'), {recursive: true});

  await copydir.sync(
    path.join(getRootDir(), 'src', 'electron', 'icons'),
    path.join(getRootDir(), ELECTRON_BUILD_DIR, 'icons')
  );

  const electronConfig = JSON.parse(
    await fs.readFile(path.resolve(getRootDir(), 'src', 'electron', 'electron-builder.json'))
  );

  // build electron binary
  await electron.build({
    publish: buildMode === 'release' ? 'always' : 'never',
    projectDir: getRootDir(),
    targets: Platform[platform.toLocaleUpperCase()].createTarget(),
    config: {
      ...electronConfig,
      publish: autoUpdateUrl
        ? {
            provider: autoUpdateProvider,
            url: autoUpdateUrl,
          }
        : undefined,
      generateUpdatesFilesForAllChannels: buildMode === 'release',
      extraMetadata: {
        ...electronConfig.extraMetadata,
        version: versionName,
      },
    },
  });
}

if (import.meta.url === url.pathToFileURL(process.argv[1]).href) {
  await main(...process.argv.slice(2));
}
