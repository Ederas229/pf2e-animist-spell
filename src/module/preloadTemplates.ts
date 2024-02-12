// SPDX-FileCopyrightText: 2022 Johannes Loher
//
// SPDX-License-Identifier: MIT

export async function preloadTemplates(): Promise<void> {
  const templatePaths: string[] = [
    // Add paths to "modules/pf2e-animist-spell/templates"
  ];

  return loadTemplates(templatePaths);
}
