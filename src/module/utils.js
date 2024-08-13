import { MODULENAME } from './const.js';

export function log(message) {
  if (typeof message == 'string') {
    console.log(MODULENAME + ' | ' + message);
  } else {
    console.log(MODULENAME + ' |');
    console.log(message);
  }
}

export async function addDaily(filePath, key) {
  //get the code from the file
  const code = await (await fetch(filePath)).text();
  //get all the customs dailies
  const customs = game.settings.get('pf2e-dailies', 'customDailies');
  if (!customs) return;
  const dailyApparitionIndex = customs.findIndex((e) => e.key == key);
  //if there is already a custom daily for the apparition edit it
  if (dailyApparitionIndex !== -1) {
    customs.splice(dailyApparitionIndex, 1, { key: key, code: code, schema: '3.0.0' });
  } else {
    //else create it
    customs.push({ key: key, code: code, schema: '3.0.0' });
  }
  game.settings.set('pf2e-dailies', 'customDailies', customs);
}
