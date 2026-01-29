import { useState } from 'react'
import { getFilteredPhones } from '../api/client'

export default function ActionBar({ count, filters, onTextBlast }) {
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopyNumbers = async () => {
    if (count === 0) return

    setLoading(true)
    try {
      const { phones } = await getFilteredPhones(filters)

      // Copy to clipboard
      await navigator.clipboard.writeText(phones.join(', '))

      // Show feedback
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      alert('Failed to copy numbers: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const disabled = count === 0

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-30">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex gap-3">
          {/* Copy Numbers Button */}
          <button
            onClick={handleCopyNumbers}
            disabled={disabled || loading}
            className={`action-btn flex-1 text-white transition-colors duration-200 ${copied ? 'bg-green-600' : 'bg-nc-blue'}`}
          >
            {copied ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Copied!</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                <span>Copy Numbers ({count})</span>
              </>
            )}
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
