import {createBoolPref} from "@/components/boolPref.ts";

// On by default: seeing the words change while editing is the main way to understand a grammar.
const pref = createBoolPref("monke.livePreview", true)

export const setLivePreview = pref.set
export const useLivePreview = pref.use
export const resyncLivePreview = pref.resync
