import {ReactNode} from "react";

const linkClass = "text-primary-text underline"

export const External = ({href, children}: { href: string, children: ReactNode }) => (
    <a className={linkClass} href={href} target="_blank" rel="noreferrer noopener">{children}<span
        className="sr-only"> (opens in a new tab)</span></a>
)
