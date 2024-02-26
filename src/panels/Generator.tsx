import {Col} from "../components/Col.tsx";
import {SwitchLabel} from "../components/SwitchLabel.tsx";
import {Row} from "../components/Row.tsx";
import {ArrowDownTrayIcon, ArrowUpTrayIcon, LinkIcon} from "@heroicons/react/24/outline";


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
                                 enabledColor="bg-accent-warning" disabledColor="bg-accent-warning/30"/>
                    <SwitchLabel checked={enableSerif} onChange={setEnableSerif}
                                 label="Enable serifs (For IPA characters readability)"
                                 enabledColor="bg-primary" disabledColor="bg-primary/30"/>

                    <div className="h-0.5 bg-white/20"/>

                    <Row className="gap-4">
                        <button className="grow bg-primary rounded p-2">
                            <Row className="items-center justify-center gap-2">
                                <h1>Share link</h1>
                                <LinkIcon className="h-5"/>
                            </Row>
                        </button>
                        <button className="grow bg-primary rounded p-2">
                            <Row className="items-center justify-center gap-2">
                                <h1>Export Config</h1>
                                <ArrowUpTrayIcon className="h-5"/>
                            </Row>
                        </button>
                        <button className="grow bg-primary rounded p-2">
                            <Row className="items-center justify-center gap-2">
                                <h1>Import Config</h1>
                                <ArrowDownTrayIcon className="h-5"/>
                            </Row>
                        </button>
                    </Row>

                    <button className="bg-primary rounded p-2">Generate Word</button>

                </Col>
            </Col>
        </>
    )
}


