import {Col} from "../components/Col.tsx";
import {useState} from "react";
import {BookOpenIcon, XMarkIcon} from "@heroicons/react/24/outline";
import {Row} from "../components/Row.tsx";

export const Guide = () => {

    const [showGuide, setShowGuide] = useState(false)

    return (
        <>
            {showGuide ? (
                <Col className="bg-secondary/20 grow md:basis-1/2">
                    <Row className="justify-between bg-secondary p-4">
                        <div className="">Guide</div>
                        <button onClick={() => setShowGuide(false)} ><XMarkIcon className="h-6"/></button>
                    </Row>
                    <div className="p-8">
                        <h1>Work in Progress</h1>
                    </div>
                </Col>
            ) : (
                <Col className="bg-secondary/20">
                    <button className="bg-secondary p-4" onClick={() => setShowGuide(true)}>
                        <BookOpenIcon className="h-6"/>
                    </button>
                </Col>
            )
            }
        </>
    )
}


