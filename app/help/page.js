import Link from "next/link";

export default function HelpPage() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "28px 18px 48px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Help (EV Betting + How to Use)</h1>
        <Link
          href="/"
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            textDecoration: "none",
          }}
        >
          ← Back to Builder
        </Link>
      </div>

      <section style={card()}>
        <h2 style={h2()}>What is +EV betting?</h2>
        <p style={p()}>
          <b>EV</b> means <b>Expected Value</b> — the average profit (or loss) you’d expect over a large number of bets.
          A bet is <b>+EV</b> when the price you’re getting is better than the “true” price.
        </p>
        <p style={p()}>
          Example idea: if a bet wins 55% of the time but the sportsbook is pricing it like it only wins 50% of the time,
          you have an edge. You won’t win every time, but over many bets, the math favors you.
        </p>
      </section>

      <section style={card()}>
        <h2 style={h2()}>Why “devig” sharp books?</h2>
        <p style={p()}>
          Sportsbooks bake in a fee called <b>vig</b>. If you convert both sides of a market to implied probability,
          the total is usually greater than 100% — that extra is the vig.
        </p>
        <p style={p()}>
          “Devigging” removes that built-in fee to estimate a <b>true probability</b>. This app uses:
        </p>
        <ul style={ul()}>
          <li>
            <b>Two-sided devig</b> when Sharp Side A and B are provided.
          </li>
          <li>
            If Sharp Side B is missing, it uses an <b>assumed vig</b> (default 7%) to estimate the true probability from Sharp A.
          </li>
        </ul>
      </section>

      <section style={card()}>
        <h2 style={h2()}>How to use the Parlay Builder</h2>
        <ol style={ol()}>
          <li>
            For each leg, enter <b>Sharp Side A</b> odds (required).
          </li>
          <li>
            If you have it, enter <b>Sharp Side B</b> (optional). If blank, the app uses the assumed vig %.
          </li>
          <li>
            Choose how you want to input your odds:
            <ul style={ul()}>
              <li>
                <b>Per-leg your odds</b> → enter Your Odds for each leg (required in this mode)
              </li>
              <li>
                <b>Total parlay odds</b> → enter the overall odds you’re getting (and per-leg inputs are ignored)
              </li>
            </ul>
          </li>
          <li>
            Add a <b>Boost %</b> if applicable (example: 20 means +20% boost).
          </li>
          <li>
            Read the results:
            <ul style={ul()}>
              <li><b>True Parlay Probability</b>: estimated chance the parlay wins</li>
              <li><b>Fair Odds</b>: what the odds “should” be with no vig</li>
              <li><b>Break-even</b>: the win rate needed to break even at your boosted odds</li>
              <li><b>EV per $1</b> and <b>EV%</b>: the expected profit edge</li>
            </ul>
          </li>
        </ol>
      </section>

      <section style={card()}>
        <h2 style={h2()}>Tips</h2>
        <ul style={ul()}>
          <li>Start simple: try a 1-leg “parlay” to validate one bet’s EV.</li>
          <li>Sharp books are used as the “truth anchor.” Don’t devig against a soft book.</li>
          <li>Always sanity-check extreme odds: one typo can swing EV massively.</li>
        </ul>
      </section>
    </main>
  );
}

function card() {
  return {
    marginTop: 14,
    padding: 16,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
    color: "rgba(255,255,255,0.92)",
  };
}
function h2() {
  return { marginTop: 0 };
}
function p() {
  return { lineHeight: 1.6 };
}
function ul() {
  return { lineHeight: 1.6, marginTop: 10 };
}
function ol() {
  return { lineHeight: 1.6, marginTop: 10 };
}
