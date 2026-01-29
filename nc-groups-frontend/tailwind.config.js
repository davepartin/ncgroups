/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'nc-green': '#2EAD7B',   // Primary green
                'nc-blue': '#5BA4C9',    // Secondary blue
                'nc-rose': '#C05B7C',    // Alerts
                'nc-mustard': '#D4A84B', // Warnings
                'nc-ink': '#2C3E50',     // Text
                'nc-light': '#f4f4f5',   // Background
            },
            fontFamily: {
                display: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
