import React from 'react';

export function IframePage() {
  return (
    <div className="w-full h-[calc(100vh-8rem)] overflow-hidden">
        <div className="relative w-full h-full">
          <iframe
            src="https://lookerstudio.google.com/embed/reporting/a09043c6-81a0-4f5d-985e-74730e761865/page/p_oz4vwb5gud"
            className="absolute top-0 left-0 w-full h-full border-0"
            title="External Website"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            style={{
              minWidth: '100%',
              minHeight: '100%',
              transform: 'scale(1)',
              transformOrigin: 'top left'
            }}
          />
        </div>
      </div>
  );
}