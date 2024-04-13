import { SpellSlotGroupId } from '@item/spellcasting-entry/collection.js';
import { MODULENAME } from './const.js';
import { OneToTen } from '@module/data.js';

export function log(message: any): void {
  if (typeof message == 'string') {
    console.log(MODULENAME + ' | ' + message);
  } else {
    console.log(MODULENAME + ' |');
    console.log(message);
  }
}

export function stringArray(array: unknown): string[] | undefined {
  if (!isStringArray(array)) return;
  return array as string[];
}

function isStringArray(array: unknown): boolean {
  //test if it's an Array
  if (!(array instanceof Array)) return false;
  const tmp = array as unknown[];
  //test if there is only string in the Array
  if (tmp.length > 0 && tmp.every((e) => typeof e === 'string')) return true;
  return false;
}

//function copied from pf2e system
export function coerceToSpellGroupId(value: unknown): SpellSlotGroupId | null {
  if (value === 'cantrips') return value;
  const numericValue = Number(value) || NaN;
  return numericValue.between(1, 10) ? (numericValue as OneToTen) : null;
}

export function forceObject(object: unknown): object {
  return object as object;
}

export async function addDaily(filePath: string, key: string): Promise<void> {
  //get the code from the file
  const code = await (await fetch(filePath)).text();
  //get all the customs dailies
  const customs: any = game.settings.get('pf2e-dailies', 'customDailies');
  if (!customs) return;
  const dailyApparitionIndex = customs.findIndex((e: any) => e.key == key);
  //if there is already a custom daily for the apparition edit it
  if (dailyApparitionIndex !== -1) {
    customs.splice(dailyApparitionIndex, 1, { key: key, code: code, schema: '3.0.0' });
  } else {
    //else create it
    customs.push({ key: key, code: code, schema: '3.0.0' });
  }
  game.settings.set('pf2e-dailies', 'customDailies', customs);
}
