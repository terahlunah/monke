// import {useParams} from 'react-router-dom'
import {Linear} from "../components/Linear.tsx";
import {Guide} from "../panels/Guide.tsx";
import {Configuration} from "../panels/Configuration.tsx";
import {Generator} from "../panels/Generator.tsx";
import {useState} from "react";
import {Rule} from "../panels/RuleInstance.tsx";
import {uid} from "uid";
import {Bounce, ToastContainer} from "react-toastify";

export type Config = {
    rules: Rule[],
    enableWeights: boolean,
    enableSerif: boolean,
}


export const Home = () => {

    // const params = useParams();

    const [config, setConfig] = useState<Config>({
        rules: defaultRules,
        enableWeights: false,
        enableSerif: false,
    })

    const setEnableWeights = (value: boolean) => {
        setConfig({...config, enableWeights: value})
    }

    const setEnableSerif = (value: boolean) => {
        setConfig({...config, enableSerif: value})
    }

    const setRules = (value: Rule[]) => {
        setConfig({...config, rules: value})
    }

    return (
        <div className="text-on-surface">
            {/*<p>Home {params.config}</p>*/}
            <ToastContainer
                position="bottom-center"
                autoClose={2000}
                hideProgressBar
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="dark"
                transition={Bounce}
            />
            <Linear className="bg-background md:h-screen">
                <Guide/>
                <Configuration config={config} setRules={setRules}/>
                <Generator config={config} setEnableWeights={setEnableWeights} setEnableSerif={setEnableSerif}/>
            </Linear>
        </div>
    )
}

const defaultRules = [
    {
        name: "Vowel",
        id: uid(),
        terminalOnly: true,
        patterns: [
            {pattern: "a", id: uid(), weight: 1.0},
            {pattern: "e", id: uid(), weight: 1.0},
            {pattern: "i", id: uid(), weight: 1.0},
            {pattern: "o", id: uid(), weight: 1.0},
            {pattern: "u", id: uid(), weight: 1.0},
        ],
        rewrites: [],
        showRewrites: false,
        exclusions: [],
        showExclusions: false,
    },
    {
        name: "Consonant",
        id: uid(),
        terminalOnly: true,
        patterns: [
            {pattern: "p", id: uid(), weight: 1.0},
            {pattern: "t", id: uid(), weight: 1.0},
            {pattern: "k", id: uid(), weight: 1.0},
            {pattern: "s", id: uid(), weight: 1.0},
            {pattern: "m", id: uid(), weight: 1.0},
            {pattern: "n", id: uid(), weight: 1.0},
            {pattern: "l", id: uid(), weight: 1.0},
            {pattern: "w", id: uid(), weight: 1.0},
            {pattern: "j", id: uid(), weight: 1.0},
        ],
        rewrites: [],
        showRewrites: false,
        exclusions: [],
        showExclusions: false,
    },
    {
        name: "Coda",
        id: uid(),
        terminalOnly: true,
        patterns: [
            {pattern: "n", id: uid(), weight: 1.0},
        ],
        rewrites: [],
        showRewrites: false,
        exclusions: [],
        showExclusions: false,
    },
    {
        name: "Rime",
        id: uid(),
        terminalOnly: false,
        patterns: [
            {pattern: "Vowel.(Coda)", id: uid(), weight: 1.0},
        ],
        rewrites: [],
        showRewrites: false,
        exclusions: [],
        showExclusions: false,
    },
    {
        name: "Full",
        id: uid(),
        terminalOnly: false,
        patterns: [
            {pattern: "Consonant.Rime", id: uid(), weight: 1.0},
        ],
        rewrites: [],
        showRewrites: false,
        exclusions: [],
        showExclusions: false,
    },

    {
        name: "Word",
        id: uid(),
        terminalOnly: false,
        patterns: [
            {pattern: "[Rime/Full].Full{:2}", id: uid(), weight: 1.0},
        ],
        rewrites: [],
        showRewrites: false,
        exclusions: [],
        showExclusions: false,
    },
]