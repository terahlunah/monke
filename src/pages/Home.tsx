// import {useParams} from 'react-router-dom'
import {Linear} from "../components/Linear.tsx";
import {Guide} from "../panels/Guide.tsx";
import {Configuration} from "../panels/Configuration.tsx";
import {Generator} from "../panels/Generator.tsx";
import {useState} from "react";

export const Home = () => {

    // const params = useParams();

    const [enableWeights, setEnableWeights] = useState(false)
    const [enableSerif, setEnableSerif] = useState(false)

    return (
        <div className="text-on-surface">
            {/*<p>Home {params.config}</p>*/}

            <Linear className="bg-background md:h-screen">
                <Guide/>
                <Configuration enableWeights={enableWeights} enableSerif={enableSerif}/>
                <Generator enableWeights={enableWeights} setEnableWeights={setEnableWeights} enableSerif={enableSerif}
                           setEnableSerif={setEnableSerif}/>
            </Linear>
        </div>
    )
}

