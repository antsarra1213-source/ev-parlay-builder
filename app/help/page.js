"use client";

import Link from "next/link";

export default function HelpPage() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "28px 18px 48px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Help / Guide</h1>

        <Link href="/" className="pill" style={{ fontWeight: 800 }}>
          ← Back to Builder
        </Link>
      </div>

      <div style={{ marginTop: 8, color: "rgba(255,255,255,0.70)", lineHeight: 1.5 }}>
        This page explains EV betting, sharp books, devigging, the calculator modes, and how to interpret results.
      </div>

      <section style={card()}>
        <h2 style={h2()}>What is EV (+EV) betting?</h2>
        <p style={p()}>
          <b>EV</b> means <b>Expected Value</b> — the average profit (or loss) you’d expect over a large number of the
          same bet. A bet is <b>+EV</b> when the odds you’re getting are better than the “true” odds.
        </p>
        <p style={p()}>
          Simple idea: if something wins <b>55%</b> of the time, but the sportsbook is pricing it like it only wins{" "}
          <b>50%</b> of the time, you have an edge. You won’t win every bet — EV is about the long run.
        </p>
      </section>

      <section style={card()}>
        <h2 style={h2()}>What are “sharp books”?</h2>
        <p style={p()}>
          “Sharp” books (or sharp markets) are typically more efficient: tighter lines, lower vig, and faster adjustment
          to information. They’re not “perfect,” but they’re often a strong anchor for estimating a truer probability.
        </p>
        <p style={p()}>
          This calculator uses sharp odds to estimate a <b>true probability</b>, then compares that to the odds you’re
          getting to compute EV.
        </p>
      </section>

      <section style={card()}>
        <h2 style={h2()}>Why devig matters (and how this app does it)</h2>
        <p style={p()}>
          Sportsbooks bake in a fee called <b>vig</b>. If you convert both sides of a market to implied probabilities,
          the total is usually greater than 100% — that extra is the vig.
        </p>
        <p style={p()}>
          <b>Devigging</b> removes that built-in fee to estimate a <b>true probability</b>. In this app:
        </p>
        <ul style={ul()}>
          <li>
            <b>Two-sided devig</b>: enter Sharp Side A and Sharp Side B (the opposite side). The app normalizes the two
            implied probabilities to remove vig.
          </li>
          <li>
            <b>One-sided approximation</b>: if Sharp Side B is blank, the app uses an <b>assumed vig %</b> (default 7%)
            to approximate the true probability from Sharp A.
          </li>
        </ul>
      </section>

      <section style={card()}>
        <h2 style={h2()}>Two key choices you make in the Builder</h2>

        <div style={subSection()}>
          <h3 style={h3()}>1) Odds Mode</h3>
          <ul style={ul()}>
            <li>
              <b>Per-Leg Odds</b>: you enter your odds for <b>each leg</b>. The app multiplies them into a parlay price.
            </li>
            <li>
              <b>Total Parlay Odds</b>: you enter <b>one</b> total parlay price (American odds). Per-leg “Your Odds” boxes
              are ignored/disabled to prevent mistakes.
            </li>
          </ul>
        </div>

        <div style={subSection()}>
          <h3 style={h3()}>2) Fair Value Source</h3>
          <ul style={ul()}>
            <li>
              <b>Devig from Sharp Books</b>: use Sharp A / Sharp B (devig logic described above).
            </li>
            <li>
              <b>Manual Fair Odds</b>: use this if you already know the fair price.
              <ul style={ul()}>
                <li>
                  In <b>Total Parlay Odds</b> mode, enter <b>Fair Parlay Odds (American)</b> and your <b>Total Parlay Odds</b>.
                </li>
                <li>
                  In <b>Per-Leg Odds</b> mode, enter <b>Fair Odds</b> and <b>Your Odds</b> on each leg (sharp inputs are disabled).
                </li>
              </ul>
            </li>
          </ul>
          <p style={pMuted()}>
            Note: the builder disables (“dims”) boxes that don’t apply to your selected mode to reduce input mistakes.
          </p>
        </div>
      </section>

      <section style={card()}>
        <h2 style={h2()}>Step-by-step: how to use the Parlay Builder</h2>
        <ol style={ol()}>
          <li>
            Choose <b>Odds Mode</b>: <b>Per-Leg Odds</b> or <b>Total Parlay Odds</b>.
          </li>
          <li>
            Choose <b>Fair Value Source</b>: <b>Devig from Sharp Books</b> or <b>Manual Fair Odds</b>.
          </li>
          <li>
            Enter <b>Stake ($)</b>.
          </li>
          <li>
            If you have a boost, enter <b>Boost %</b> (profit portion only).
          </li>
          <li>
            Fill in the remaining inputs based on your selections (any irrelevant boxes will be disabled).
          </li>
          <li>
            Review the <b>Results</b> section.
          </li>
        </ol>
      </section>

      <section style={card()}>
        <h2 style={h2()}>How to interpret the Results</h2>
        <ul style={ul()}>
          <li>
            <b>True Parlay Probability</b>: estimated chance the parlay wins (based on devig/manual fair odds).
          </li>
          <li>
            <b>Fair Parlay Odds</b>: what the odds “should” be with no vig, based on true probability.
          </li>
          <li>
            <b>Your Parlay Odds</b>: the odds you’re actually getting (per-leg combined or total entered).
          </li>
          <li>
            <b>Boosted Parlay Odds</b>: your odds after applying Boost % to the profit portion.
          </li>
          <li>
            <b>Break-even Probability</b>: win rate needed to break even at the offered (boosted, if applicable) odds.
          </li>
          <li>
            <b>EV $</b> and <b>EV %</b>: expected profit edge based on your stake.
          </li>
          <li>
            <b>Status</b>: +EV / -EV / Neutral.
          </li>
        </ul>
      </section>

      <section style={card()}>
        <h2 style={h2()}>Common mistakes (quick checklist)</h2>
        <ul style={ul()}>
          <li>Use American odds format only (examples: -110, +150). Avoid typos.</li>
          <li>
            Don’t mix modes: if you’re in <b>Total Parlay Odds</b> mode, don’t expect per-leg “Your Odds” to matter.
          </li>
          <li>Make sure Sharp Side B is the opposite side of Sharp A (if using two-sided devig).</li>
          <li>EV is long-run edge — a +EV bet can lose today and still be correct.</li>
          <li>If results look extreme, re-check inputs before trusting EV.</li>
        </ul>
      </section>

      <section style={card()}>
        <h2 style={h2()}>Extra tips</h2>
        <ul style={ul()}>
          <li>Start simple: use a 1-leg “parlay” to validate a single bet’s EV.</li>
          <li>Use sharp/efficient prices as the “truth anchor” whenever possible.</li>
          <li>If you’re using manual fair odds, make sure they are truly no-vig (or as close as you can get).</li>
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
  return { marginTop: 0, marginBottom: 8 };
}
function h3() {
  return { marginTop: 0, marginBottom: 6, fontSize: 16 };
}
function p() {
  return { lineHeight: 1.65, marginTop: 8, marginBottom: 0 };
}
function pMuted() {
  return { lineHeight: 1.6, marginTop: 10, marginBottom: 0, color: "rgba(255,255,255,0.70)" };
}
function ul() {
  return { lineHeight: 1.65, marginTop: 10, marginBottom: 0 };
}
function ol() {
  return { lineHeight: 1.65, marginTop: 10, marginBottom: 0 };
}
function subSection() {
  return { marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)" };
}
