import React from 'react';

export function renderRichText(text: string) {
    if (!text) return null;

    // Use a regex to match **bold** or *italic*
    // It captures the delimiter and the content together
    const regex = /(\*\*.*?\*\*|\*.*?\*)/g;
    const parts = text.split(regex);

    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
            return (
                <strong key={i} className="font-black text-slate-900">
                    {part.slice(2, -2)}
                </strong>
            );
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
            return (
                <em key={i} className="italic text-slate-800">
                    {part.slice(1, -1)}
                </em>
            );
        }
        // Normal text part (newlines are naturally preserved by CSS whitespace-pre-wrap in the parent)
        return <span key={i}>{part}</span>;
    });
}
