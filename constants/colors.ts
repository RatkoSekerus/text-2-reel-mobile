// Colors matching the web app
export const Colors = {
  // Background colors
  background: {
    dark: "#111827", // gray-900
    medium: "#1f2937", // gray-800
    main: "#18202B", // Main background color
    gradient: ["#111827", "#111827", "#111827"] as const, // Solid background color
  },
  // Cyan colors (cyberpunk theme)
  cyan: {
    400: "#22d3ee", // cyan-400
    500: "#06b6d4", // cyan-500 (main cyan)
    600: "#0891b2", // cyan-600
    700: "#0e7490", // cyan-700
    glow: "rgba(6, 182, 212, 0.5)", // cyan-500 with opacity for glow
    glowStrong: "rgba(6, 182, 212, 0.8)", // stronger glow
  },
  // Text colors
  text: {
    white: "#FFFFFF",
    gray: {
      300: "#d1d5db",
      400: "#9ca3af",
      500: "#6b7280",
    },
  },
  // Button colors
  button: {
    primary: "#06b6d4", // cyan-500
    primaryHover: "#0891b2", // cyan-600
  },
};
