import React from 'react'
import ReactDOM from 'react-dom/client'
import {App} from './App.tsx'
import './main.css'

import {injectStyle} from "react-toastify/dist/inject-style";

injectStyle();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App/>
    </React.StrictMode>,
)
