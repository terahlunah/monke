import {BrowserRouter as Router, Route, Routes} from 'react-router-dom'
import {Home} from "./pages/Home.tsx";

export const App = () => {
    return (
        <>
            <Router>
                <Routes>
                    <Route path="/" element={<Home/>}/>
                    <Route path="/:config" element={<Home/>}/>
                </Routes>
            </Router>
        </>
    )
}


