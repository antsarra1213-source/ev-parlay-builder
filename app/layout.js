import "./globals.css";

export const metadata = {
  title: "EV Parlay App",
  description: "Parlay EV calculator with devig vs sharp books",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
