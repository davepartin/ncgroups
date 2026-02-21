import { useEffect } from 'react';

export default function Toast({ message, show, type = 'success', onClose }) {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [show, onClose]);

    if (!show) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
            <div className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-lg ${type === 'success' ? 'bg-gray-800 text-white' : 'bg-nc-rose text-white'}`}>
                {type === 'success' ? (
                    <svg className="w-5 h-5 text-nc-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )}
                <span className="text-sm font-medium">{message}</span>
            </div>
        </div>
    );
}
