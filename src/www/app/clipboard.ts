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

/// <reference path='../../types/outline.d.ts'/>

import {Clipboard} from './clipboard_common';
import {CordovaClipboard} from './clipboard_cordova';
import {ElectronClipboard} from './clipboard_electron';

export function getClipboard(): Clipboard {
  if (outline.WEB_PLATFORM === 'cordova') {
    return new CordovaClipboard();
  } else if (outline.WEB_PLATFORM === 'electron') {
    return new ElectronClipboard();
  } else {
    throw new Error('getClipboard() not implemented for platform');
  }
}
