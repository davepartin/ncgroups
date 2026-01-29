export default function TextBlastModal({ filters, filterDescription, recipientCount, onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
                <h2 className="text-xl font-bold mb-2">Send Text Blast</h2>
                <p className="text-gray-600 mb-4">
                    Sending to {recipientCount} people matching: <span className="font-medium">{filterDescription}</span>
                </p>

                <textarea
                    className="w-full h-32 p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-nc-green focus:outline-none"
                    placeholder="Type your message here..."
                />

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            alert('Message sent! (Mock)')
                            onClose()
                        }}
                        className="px-4 py-2 bg-nc-green text-white rounded-lg hover:bg-opacity-90 font-medium"
                    >
                        Send Blast
                    </button>
                </div>
            </div>
        </div>
    )
}
