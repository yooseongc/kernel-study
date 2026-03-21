import { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface CodeBlockProps {
  code: string
  language?: string
  filename?: string
}

export function CodeBlock({ code, language = 'c', filename }: CodeBlockProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        navigator.clipboard.writeText(code.trim()).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        })
    }

    return (
        <div className="rounded-xl overflow-hidden border border-gray-700 text-sm">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700">
                <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500/70" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
                    <span className="w-3 h-3 rounded-full bg-green-500/70" />
                </div>
                {filename && (
                    <span className="text-xs text-gray-400 font-mono ml-2">{filename}</span>
                )}
                <button
                    onClick={handleCopy}
                    className="ml-auto text-xs text-gray-400 hover:text-gray-200 transition-colors px-2 py-0.5 rounded hover:bg-gray-700"
                    aria-label="코드 복사"
                >
                    {copied ? '복사됨 ✓' : '복사'}
                </button>
            </div>
            <SyntaxHighlighter
                language={language}
                style={vscDarkPlus}
                customStyle={{ margin: 0, borderRadius: 0, background: '#0d1117', fontSize: '0.82rem' }}
                showLineNumbers
            >
                {code.trim()}
            </SyntaxHighlighter>
        </div>
    )
}
