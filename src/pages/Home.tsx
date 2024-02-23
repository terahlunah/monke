// import {useParams} from 'react-router-dom'
import {Linear} from "../components/Linear.tsx";
import {Guide} from "../panels/Guide.tsx";
import {Configuration} from "../panels/Configuration.tsx";
import {Generator} from "../panels/Generator.tsx";

export const Home = () => {

    // const params = useParams();

    return (
        <div className="text-on-surface">
            {/*<p>Home {params.config}</p>*/}

            <Linear className="bg-background md:h-screen">
                <Guide/>
                <Configuration/>
                <Generator/>
            </Linear>
        </div>
    )
}

