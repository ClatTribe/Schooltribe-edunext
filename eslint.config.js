export default [
  {
    ignores: ["dist", "node_modules", "public", ".vercel"]
  },
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": "warn",
    }
  }
];
