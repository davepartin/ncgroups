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
  return (
    <div className="fixed top-[135px] left-0 right-0 z-50 pointer-events-none flex justify-center">
      <div className="bg-white/95 backdrop-blur shadow-xl rounded-full border border-gray-200 p-1.5 flex gap-2 pointer-events-auto">
        {/* Copy Numbers Button */}
        <button
          onClick={handleCopyNumbers}
          disabled={disabled || loading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm ${copied ? 'bg-green-600 text-white' : 'bg-white text-nc-blue border border-gray-200 hover:bg-gray-50'
            }`}
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              <span>Copy #s ({count})</span>
            </>
          )}
        </button>

        {/* Text Blast Button (Twilio) */}
        <button
          onClick={onTextBlast}
          disabled={disabled}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-nc-green text-white shadow-sm hover:shadow-md transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
          <span>Text Blast</span>
        </button>
      </div>
    </div>
  )
}
