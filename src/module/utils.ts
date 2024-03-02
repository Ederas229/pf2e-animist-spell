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
