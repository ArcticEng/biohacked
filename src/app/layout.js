import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";

export const metadata = {
  title: "Bio-Hacked",
  description: "AI-powered nutrition, coaching & community platform",
};

// Inline script runs before React hydrates — prevents flash of wrong theme
const noFlashScript = `
  try {
    var t = localStorage.getItem('biohacked-theme');
    if (t !== 'light' && t !== 'dark') t = 'dark';
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
