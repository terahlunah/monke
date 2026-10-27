import {ChangeEvent, Dispatch, lazy, Suspense, useRef, useState} from "react";
import {Listbox, ListboxButton, ListboxLabel, ListboxOption, ListboxOptions} from "@headlessui/react";
import {CheckIcon, ChevronDownIcon} from "lucide-react";
import {toast} from "react-toastify";
import {Config} from "@/engine/config.ts";
import {ConfigAction} from "@/engine/configReducer.ts";
import {parseConfigFile} from "@/engine/configfile.ts";
import type {AwkwordsImport as AwkwordsResult} from "@/engine/awkwords.ts";
import {GeneratorView} from "@/features/generator/useGeneratorView.ts";
import {exampleToConfig, firstGrammar, recipes} from "@/features/docs/referenceExamples.ts";
import {useMediaQuery} from "@/app/useMediaQuery.ts";
import {ToggleLabel} from "@/components/ToggleLabel.tsx";
import {buttonOutline, buttonPrimary, textInput} from "@/components/styles.ts";
import {Menu, MenuGroup, MenuItem, MenuPanel, MenuTrigger, menuItemClass} from "@/components/menu.tsx";

type GrammarToolbarProps = {
    config: Config
    dispatch: Dispatch<ConfigAction>
    view: GeneratorView
}

const referenceExamples = [firstGrammar, ...recipes]

const exportConfig = (config: Config) => {
    const data = JSON.stringify(config, null, 4)
    const name = config.language.length != 0 ? config.language.replace(" ", "_") : "config"
    const url = URL.createObjectURL(new Blob([data], {type: "text/plain;charset=utf-8"}))
    const link = document.createElement("a")
    link.href = url
    link.download = `${name}.monke`
    link.click()
    // Revoking synchronously can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 0)
}

const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    toast("Link copied to clipboard!")
}

// Everything that acts on the whole grammar: its name, start rule, global flags, loading and sharing.
// The importer and its parser are only needed once someone imports, so they load on first use.
const AwkwordsImport = lazy(() => import("@/features/generator/AwkwordsImport.tsx").then(m => ({default: m.AwkwordsImport})))

export const GrammarToolbar = ({config, dispatch, view}: GrammarToolbarProps) => {
    const desktop = useMediaQuery("(min-width: 768px)")
    const fileInput = useRef<HTMLInputElement>(null)
    const importButton = useRef<HTMLButtonElement>(null)
    const [awkwordsOpen, setAwkwordsOpen] = useState(false)
    // Stays mounted after the first open so a cancelled draft is kept, as before.
    const [awkwordsUsed, setAwkwordsUsed] = useState(false)

    const onFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        // Reset so picking the same file again still fires a change event.
        e.target.value = ""
        if (!file) return

        try {
            dispatch({type: "load", config: parseConfigFile(await file.text())})
            toast("Config imported")
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to import config")
        }
    }

    const onAwkwordsImported = (result: AwkwordsResult) => {
        dispatch({type: "load", config: result.config})
        view.applyAwkwords(result)
        const n = result.warnings.length
        const rules = `${result.config.rules.length} ${result.config.rules.length === 1 ? "rule" : "rules"}`
        toast(n === 0 ? `Awkwords imported: ${rules}` : `Awkwords imported: ${rules}, ${n} ${n === 1 ? "note" : "notes"} to review`)
    }

    // The menu item the dialog was opened from has unmounted by the time the dialog closes, so focus is handed back
    // to the menu's trigger explicitly, after the dialog has finished restoring focus itself.
    const closeAwkwords = () => {
        setAwkwordsOpen(false)
        setTimeout(() => importButton.current?.focus(), 0)
    }

    const importMonke = (
        <MenuItem>
            <button type="button" className={menuItemClass} onClick={() => fileInput.current?.click()}>
                {desktop ? "Monke file…" : "Import Monke file…"}
            </button>
        </MenuItem>
    )
    const importAwkwords = (
        <MenuItem>
            <button type="button" className={menuItemClass} onClick={() => {
                setAwkwordsUsed(true)
                setAwkwordsOpen(true)
            }}>
                {desktop ? "Awkwords…" : "Import Awkwords…"}
            </button>
        </MenuItem>
    )
    const exportMonke = (
        <MenuItem>
            <button type="button" className={menuItemClass} onClick={() => exportConfig(config)}>
                {desktop ? "Monke file (.monke)" : "Export .monke file"}
            </button>
        </MenuItem>
    )

    return (
        <section aria-label="Grammar settings"
                 className="flex flex-col gap-2.5 px-4 py-3 md:flex-row md:flex-wrap md:items-center md:gap-3 md:px-6 shrink-0 border-b border-line bg-surface">
            <div className="flex gap-2 md:contents">
                <label className="flex flex-1 flex-col gap-1 md:flex-none md:flex-row md:items-center md:gap-2">
                    <span className="text-xs text-muted md:text-sm">Language</span>
                    <input value={config.language} onChange={e => dispatch({type: "setLanguage", language: e.target.value})}
                           className={`${textInput} h-10 md:h-[34px] min-w-0 md:w-40`}/>
                </label>

                <Listbox value={config.root} onChange={root => dispatch({type: "setRoot", root})}>
                    <div className="flex w-[130px] flex-col gap-1 md:w-auto md:flex-row md:items-center md:gap-2">
                        <ListboxLabel className="text-xs text-muted md:text-sm">Start rule</ListboxLabel>
                        <ListboxButton className={`${textInput} relative h-10 md:h-[34px] md:w-40 pr-8 text-left`}>
                            <span className="block truncate">{config.root}</span>
                            <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted"
                                             aria-hidden="true"/>
                        </ListboxButton>
                        <ListboxOptions
                            anchor="bottom start"
                            transition
                            className="z-30 w-(--button-width) min-w-40 max-h-60 overflow-auto rounded-lg border border-line-strong bg-surface py-1 shadow-lg outline-none [--anchor-gap:4px] transition duration-100 ease-in data-closed:opacity-0">
                            {config.rules.map(rule => (
                                <ListboxOption key={rule.id} value={rule.name}
                                               className="relative cursor-default select-none py-2 pl-9 pr-3 data-focus:bg-white/10">
                                    {({selected}) => (
                                        <>
                                            <span className={`block truncate ${selected ? "font-medium" : "font-normal"}`}>{rule.name}</span>
                                            {selected ? (
                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                                    <CheckIcon className="size-4" aria-hidden="true"/>
                                                </span>
                                            ) : null}
                                        </>
                                    )}
                                </ListboxOption>
                            ))}
                        </ListboxOptions>
                    </div>
                </Listbox>
            </div>

            <div className="flex flex-wrap gap-2 md:items-center md:gap-3">
                <ToggleLabel label="Weights" checked={config.enableWeights} tone="primary" dot
                             onChange={enabled => dispatch({type: "setEnableWeights", enabled})}
                             className="h-[34px] md:h-[30px] px-3"/>
                <ToggleLabel label="Repeat rewrites" checked={config.repeatRewrites} tone="primary" dot
                             onChange={enabled => dispatch({type: "setRepeatRewrites", enabled})}
                             className="h-[34px] md:h-[30px] px-3"/>
            </div>

            <div className="grid grid-cols-4 gap-1.5 md:ml-auto md:flex md:items-center md:gap-2">
                <button type="button" className={buttonOutline} aria-label="New grammar"
                        onClick={() => dispatch({type: "clear"})}>
                    New
                </button>

                <Menu>
                    <MenuTrigger className={`${buttonOutline} max-md:px-1`} caret={desktop}>Examples</MenuTrigger>
                    <MenuPanel>
                        <MenuItem>
                            <button type="button" className={menuItemClass}
                                    onClick={() => dispatch({type: "loadExample", weighted: false})}>
                                toki pona example
                            </button>
                        </MenuItem>
                        <MenuItem>
                            <button type="button" className={menuItemClass}
                                    onClick={() => dispatch({type: "loadExample", weighted: true})}>
                                Weighted toki pona example
                            </button>
                        </MenuItem>
                        <MenuGroup heading="From the Reference">
                        {referenceExamples.map(example => (
                            <MenuItem key={example.id}>
                                <button type="button" className={menuItemClass}
                                        onClick={() => dispatch({type: "load", config: exampleToConfig(example, config.enableSerif)})}>
                                    {example.title}
                                </button>
                            </MenuItem>
                        ))}
                        </MenuGroup>
                    </MenuPanel>
                </Menu>

                {desktop ? (
                    <>
                        <Menu>
                            <MenuTrigger className={buttonOutline} buttonRef={importButton}>Import</MenuTrigger>
                            <MenuPanel>{importMonke}{importAwkwords}</MenuPanel>
                        </Menu>
                        <Menu>
                            <MenuTrigger className={buttonOutline}>Export</MenuTrigger>
                            <MenuPanel anchor="bottom end">{exportMonke}</MenuPanel>
                        </Menu>
                    </>
                ) : (
                    <Menu>
                        <MenuTrigger className={`${buttonOutline} max-md:px-1`} buttonRef={importButton}>Files</MenuTrigger>
                        <MenuPanel anchor="bottom end">{importMonke}{importAwkwords}{exportMonke}</MenuPanel>
                    </Menu>
                )}

                <button type="button" className={`${buttonPrimary} max-md:px-1`} aria-label="Share link" onClick={copyLink}>
                    <span className="md:hidden" aria-hidden="true">Share</span>
                    <span className="max-md:hidden" aria-hidden="true">Share link</span>
                </button>
            </div>

            <input ref={fileInput} type="file" accept=".monke" className="hidden" onChange={onFileSelected}
                   aria-hidden="true" tabIndex={-1}/>
            {awkwordsUsed ?
                <Suspense fallback={null}>
                    <AwkwordsImport open={awkwordsOpen} onClose={closeAwkwords} onImported={onAwkwordsImported}/>
                </Suspense> : null}
        </section>
    )
}
