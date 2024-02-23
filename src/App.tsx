import {BrowserRouter as Router, Route, Routes} from 'react-router-dom'
import {Home} from "./pages/Home.tsx";

export const App = () => {
    return (
        <>
            <Router basename={import.meta.env.BASE_URL}>
                <Routes>
                    <Route path="/" element={<Home/>}/>
                    <Route path="/:config" element={<Home/>}/>
                </Routes>
            </Router>
        </>
    )
}


