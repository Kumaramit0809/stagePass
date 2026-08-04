/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
  safelist: [
    { pattern: /bg-(violet|teal|amber|rose|blue|emerald|sky|cyan|orange)-(500|600|700|800|900)\/(10|15|20|25|30|40|50|80)/ },
    { pattern: /border-(violet|teal|amber|rose|blue|emerald|sky|cyan|orange)-(400|500|600)\/(20|30|40|50)/ },
    { pattern: /text-(violet|teal|amber|rose|blue|emerald|sky|cyan|orange)-(300|400)/ },
    { pattern: /from-(violet|teal|amber|rose|blue|emerald|sky|cyan|orange)-(700|800|900)/ },
    { pattern: /via-(violet|teal|amber|rose|blue|emerald|sky|cyan|orange)-(600|700)/ },
    { pattern: /to-(violet|teal|amber|rose|blue|emerald|sky|cyan|orange)-(400|500|600)/ },
  ],
};
