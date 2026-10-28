import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function CopyText({ text, label }: { text: string; label: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'manual'>('idle');
  return (
    <div className="viewer-copy">
      <code>{text}</code>
      <button
        className="secondary-button"
        aria-label={label}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setStatus('copied');
          } catch {
            setStatus('manual');
          }
        }}
      >
        {status === 'copied' ? <Check size={15} /> : <Copy size={15} />}
        {status === 'copied' ? 'Copied' : 'Copy'}
      </button>
      {status === 'manual' ? (
        <div className="viewer-copy-fallback" role="status">
          Clipboard unavailable. Select this text and copy it:
          <textarea
            readOnly
            value={text}
            aria-label={`${label} manually`}
            onFocus={(event) => event.currentTarget.select()}
          />
        </div>
      ) : null}
      <span className="viewer-copy-status" role="status">
        {status === 'copied' ? `${label} copied.` : ''}
      </span>
    </div>
  );
}
