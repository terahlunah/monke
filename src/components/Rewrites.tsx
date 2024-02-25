import {GenericProps} from "./GenericProps.tsx";
import {Row} from "./Row.tsx";
import {ChevronDoubleRightIcon, PlusIcon, TrashIcon} from "@heroicons/react/24/outline";
import AutowidthInput from "react-autowidth-input";
import {ChangeEvent} from "react";
import {Col} from "./Col.tsx";
import cloneDeep from "lodash.clonedeep"

type Rewrite = {
    match: string,
    replace: string
}

type RewritesProps = {
    rewrites: Rewrite[]
    onRewritesChange: (rewrites: Rewrite[]) => void
    enableSerif?: boolean
}

export const Rewrites = (
    {
        className,
        rewrites,
        onRewritesChange,
        enableSerif
    }: GenericProps<RewritesProps>) => {

    const onRewriteChangeIndex = (index: number) => {
        return (rewrite: Rewrite) => {
            const newRewrite = cloneDeep(rewrites)
            newRewrite[index] = rewrite
            onRewritesChange(newRewrite)
        }
    }

    const onRewriteDeleteIndex = (index: number) => {
        return () => {
            const newRewrite = cloneDeep(rewrites)
            newRewrite.splice(index, 1)
            onRewritesChange(newRewrite)
        }
    }

    const onRewriteAdd = () => {
        const newRewrite = cloneDeep(rewrites)
        newRewrite.push({match: "", replace: ""})
        onRewritesChange(newRewrite)
    }


    return (
        <Col className={`${className}`}>
            <Row className="items-center gap-4">
                <h1 className="pb-4 text-3xl">Rewrites</h1>
                <hr className="grow h-0.5 border-t-0 bg-accent-warning"/>
            </Row>

            <Col className={`${className} rounded bg-surface p-2 gap-2`}>
                <Row className="gap-4 flex-wrap">
                    {rewrites.map((r, index) =>
                        <RewriteItem rewrite={r}
                                     onChange={onRewriteChangeIndex(index)}
                                     onDelete={onRewriteDeleteIndex(index)}
                                     enableSerif={enableSerif}/>
                    )}
                    <button onClick={onRewriteAdd} className="bg-accent-warning mr-4 rounded p-1">
                        <PlusIcon className="h-6"/>
                    </button>
                </Row>
            </Col>
        </Col>
    )
}

type RewriteItemProps = {
    rewrite: Rewrite
    onChange: (rewrite: Rewrite) => void
    onDelete?: () => void
    enableSerif?: boolean
}

const RewriteItem = ({
                         className,
                         rewrite,
                         onChange,
                         onDelete,
                         enableSerif,
                     }: GenericProps<RewriteItemProps>) => {


    const onMatchInput = (e: ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value
        onChange({...rewrite, match: v})
    }
    const onReplaceInput = (e: ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value
        onChange({...rewrite, replace: v})
    }


    return (
        <Row className={`${className} rounded overflow-clip w-min h-8 items-center`}>
            <button onClick={onDelete} className="bg-accent-warning p-1 h-8"><TrashIcon className="h-4"/></button>
            <AutowidthInput value={rewrite.match}
                            onChange={onMatchInput}
                            className={`bg-accent-warning/40 px-1 outline-0 text-center h-8 ${enableSerif ? "font-serif" : ""}`}
                            type="text"
                            minWidth={15}/>
            <button className="bg-accent-warning p-1 h-8"><ChevronDoubleRightIcon className="h-4"/></button>
            <AutowidthInput value={rewrite.replace}
                            onChange={onReplaceInput}
                            className={`bg-accent-warning/40 px-1 outline-0 text-center h-8 ${enableSerif ? "font-serif" : ""}`}
                            type="text"
                            minWidth={15}/>
        </Row>
    );
}