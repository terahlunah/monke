import {ChangeEvent, FormEvent, useId, useRef, useState} from "react"
import {Description, Dialog, DialogPanel, DialogTitle} from "@headlessui/react"
import {Row} from "@/components/Row.tsx"
import {AwkwordsImport as ImportResult, importAwkwords} from "@/engine/awkwords.ts"

type Props = {
    open: boolean
    onClose: () => void
    onImported: (result: ImportResult) => void
}

// Headless UI's Dialog traps focus and closes on Escape. The owner of `open` returns focus to its trigger.
export const AwkwordsImport = ({open, onClose, onImported}: Props) => {
    const [text, setText] = useState("")
    const [error, setError] = useState<string | null>(null)
    const fileInput = useRef<HTMLInputElement>(null)
    const errorId = useId()

    const close = () => {
        onClose()
        setError(null)
    }

    const run = (input: string | Uint8Array, fileName?: string) => {
        try {
            const result = importAwkwords(input, fileName)
            onImported(result)
            setText("")
            close()
        } catch (e) {
            setError(e instanceof Error ? e.message : "This is not an Awkwords pattern")
        }
    }

    const onSubmit = (e: FormEvent) => {
        e.preventDefault()
        run(text)
    }

    const onFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        // Reset so picking the same file again still fires a change event.
        e.target.value = ""
        if (!file) return
        // Bytes, not text: files from Awkwords 1.1 and older are cp1250, which the importer detects.
        run(new Uint8Array(await file.arrayBuffer()), file.name)
    }

    return <>
        <Dialog open={open} onClose={close} className="relative z-50">
            <div className="fixed inset-0 bg-black/60" aria-hidden="true"/>
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <DialogPanel className="flex flex-col gap-4 w-full max-w-xl max-h-full overflow-auto rounded-sm bg-surface border border-line-strong shadow-lg p-6">
                    <DialogTitle className="font-bold text-xl">Import from Awkwords</DialogTitle>
                    <Description className="text-muted">
                        Choose an .awkw file saved by Awkwords, or paste a pattern such as <code>[VV]t[VV]^aa^ii^uu</code>.
                        To paste subpatterns too, write one per line as in a saved file: <code>V:a/i/u</code> then <code>r:CV</code>.
                        This replaces the current grammar; Back undoes it.
                    </Description>

                    <button className="rounded-sm p-2 border border-white/30 hover:bg-white/10" onClick={() => fileInput.current?.click()}>
                        Choose .awkw file
                    </button>
                    <input ref={fileInput} type="file" accept=".awkw,.txt" className="hidden" onChange={onFileSelected}
                           aria-hidden="true" tabIndex={-1}/>

                    <form onSubmit={onSubmit} className="flex flex-col gap-2">
                        <label htmlFor="awkwords-text">Awkwords pattern or file contents</label>
                        <textarea id="awkwords-text" data-autofocus value={text} rows={6} spellCheck={false}
                                  onChange={e => {
                                      setText(e.target.value)
                                      setError(null)
                                  }}
                                  aria-invalid={error ? true : undefined}
                                  aria-describedby={error ? errorId : undefined}
                                  className="font-mono rounded-sm bg-background p-2 border border-white/20 focus-visible:outline-primary-text focus-visible:outline-2"/>
                        {error ? <p id={errorId} role="alert" className="text-danger-text">{error}</p> : null}
                        <Row className="gap-4 justify-end mt-2">
                            <button type="button" className="rounded-sm p-2 px-4 border border-white/30 hover:bg-white/10" onClick={close}>Cancel</button>
                            <button type="submit" className="rounded-sm p-2 px-4 bg-primary text-white">Import</button>
                        </Row>
                    </form>
                </DialogPanel>
            </div>
        </Dialog>
    </>
}
