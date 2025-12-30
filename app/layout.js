export const metadata = {
  title: "EV Parlay App",
  description: "Parlay EV calculator with devig vs sharp books",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <style>{`
          :root{
            --bg:#0b1220;
            --panel:#0f1b2d;
            --panel2:#0c1626;
            --text:#e8eefc;
            --muted:#a9b6d3;
            --border:rgba(255,255,255,0.10);
            --border2:rgba(255,255,255,0.16);
            --good:#22c55e;
            --bad:#ef4444;
            --warn:#f59e0b;
            --link:#93c5fd;
          }
          *{ box-sizing:border-box; }
          body{
            margin:0;
            font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji","Segoe UI Emoji";
            background: radial-gradient(1200px 600px at 20% 10%, rgba(59,130,246,0.20), transparent 60%),
                        radial-gradient(900px 500px at 80% 20%, rgba(168,85,247,0.16), transparent 55%),
                        var(--bg);
            color:var(--text);
          }
          a{ color:var(--link); text-decoration:none; }
          a:hover{ text-decoration:underline; }
          input, select, button{
            font: inherit;
          }
        `}</style>
        {children}
      </body>
    </html>
  );
}
