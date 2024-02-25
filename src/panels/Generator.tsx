import {Col} from "../components/Col.tsx";
import {SwitchLabel} from "../components/SwitchLabel.tsx";


type GeneratorProps = {
    enableWeights: boolean
    setEnableWeights: (enable: boolean) => void
    enableSerif: boolean
    setEnableSerif: (enable: boolean) => void
}

export const Generator = ({enableWeights, setEnableWeights, enableSerif, setEnableSerif}: GeneratorProps) => {

    return (
        <>
            <Col className="grow bg-primary/5 md:basis-1/2">
                <div className="bg-primary p-4">Generator</div>

                <Col className="p-6 gap-4 overflow-auto no-scrollbar pb-64">

                    <SwitchLabel checked={enableWeights} onChange={setEnableWeights}
                                 label="Enable probability weights"
                                 enabledColor="bg-accent-warning" disabledColor="bg-accent-warning/20"/>
                    <SwitchLabel checked={enableSerif} onChange={setEnableSerif}
                                 label="Enable serifs (For IPA characters readability)"
                                 enabledColor="bg-primary" disabledColor="bg-primary/20"/>

                    <button>Share link</button>
                    <button>Export Config</button>
                    <button>Import Config</button>
                    <button>Generate Word</button>

                </Col>
            </Col>
        </>
    )
}


