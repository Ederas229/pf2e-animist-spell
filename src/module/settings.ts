// SPDX-FileCopyrightText: 2022 Johannes Loher
//
// SPDX-License-Identifier: MIT

import { MODULENAME } from './const.js';

export function registerSettings(): void {
  game.settings.register(MODULENAME, 'managerPosition', {
    name: 'manager position',
    scope: 'client',
    config: false,
    type: Object,
    default: {},
  });
}
