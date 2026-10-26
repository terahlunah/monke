import {Rule} from "./ui.ts";

export type Config = {
    language: string,
    rules: Rule[],
    root: string | null
    enableWeights: boolean,
    enableSerif: boolean,
}
