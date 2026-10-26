import {createBoolPref} from "./boolPref.ts";

const pref = createBoolPref("monke.alwaysShowReorderButtons", false)

export const setAlwaysShowReorder = pref.set
export const useAlwaysShowReorder = pref.use
export const resyncAlwaysShowReorder = pref.resync
