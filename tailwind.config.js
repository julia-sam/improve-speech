/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{js,jsx,ts,tsx}'],
    theme: {
        extend: {
            colors: {
                darkGray: '#373234',
                lightTeal: '#C8D7D2',
                offWhite: '#F4F2F0',
                mutedRed: '#D84339',
            },
        },
    },
    plugins: [],
};

