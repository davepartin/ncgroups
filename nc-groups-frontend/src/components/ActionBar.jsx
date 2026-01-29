import { useState } from 'react'
import { getSmsUri } from '../api/client'

export default function ActionBar({ count, filters, onTextBlast }) {
  const [loadingSms, setLoadingSms] = useState(false)

  const handleGroupText = async () => {
    if (count === 0) return
    
    setLoadingSms(true)
    try {
      const result = await getSmsUri(filters)
      
      // Open native SMS app
      window.location.href = result.smsUri
    } catch (err) {
      alert('Failed to generate SMS: ' + err.message)
    } finally {
      setLoadingSms(false)
    }
  }

  const disabled = count === 0

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-30">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex gap-3">
          {/* Group Text Button (Native SMS) */}
          <button
            onClick={handleGroupText}
            disabled={disabled || loadingSms}
            className="action-btn flex-1 bg-nc-blue text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Group Text ({count})</span>
          </button>

          {/* Text Blast Button (Twilio) */}
          <button
            onClick={onTextBlast}
            disabled={disabled}
            className="action-btn flex-1 bg-nc-green text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            <span>Text Blast ({count})</span>
          </button>
        </div>

        {count > 20 && (
          <p className="text-center text-xs text-nc-mustard mt-2">
            ⚠️ Large group texts may not work on all devices. Consider Text Blast.
          </p>
        )}
      </div>

      {/* Safe area for mobile */}
      <div className="h-safe-area-inset-bottom bg-white" />
    </div>
  )
}
