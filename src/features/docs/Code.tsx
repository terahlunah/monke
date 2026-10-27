export const Code = ({children}: { children: string }) => (
    // Short tokens like 'text' never break; only long ones may wrap anywhere, so narrow table cells can't overflow.
    <code className={`font-mono rounded-sm bg-white/10 px-1.5 py-0.5 ${children.length <= 12 ? "whitespace-pre" : "[overflow-wrap:anywhere] whitespace-pre-wrap"}`}>{children}</code>
)
