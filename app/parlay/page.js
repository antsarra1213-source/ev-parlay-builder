"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_VIG_PCT = 7;
const DEFAULT_STAKE = 10;

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

function isBlank(v) {
  return v === null || v === undefined || String(v).trim() === "";
}

function safeNum(v) {
  if (isBlank(v)) return null;
  const n = Number(String(v).replaceAll(",", "").trim());
  return Number.isFinite(n) ? n : null;
}

function americanToProb(american) {
  const a = safeNum(american);
  if (a === null || a === 0) return null;
  if (a > 0) return 100 / (a + 100);
  return Math.abs(a) / (Math.abs(a) + 100);
}

function probToAmerican(prob) {
  const p = prob;
  if (!Number.isFinite(p) || p <= 0 || p >= 1) return null;
  if (p >= 0.5) return -Math.round((p * 100) / (1 - p));
  return Math.round(((1 - p) * 100) / p);
}

function americanToDecimal(american) {
  const a = safeNum(american);
  if (a === null || a === 0) return null;
  if (a > 0) return 1 + a / 100;
  return 1 + 100 / Math.abs(a);
}

function decimalToAmerican(decimal) {
  const d = safeNum(decimal);
  if (d === null || d <= 1) return null;
  const profit = d - 1;
  if (profit >= 1) return Math.round(profit * 100);
  return -Math.round(100 / profit);
}

function fmtAmerican(a) {
  if (a === null || a === undefined || !Number.isFinite(a)) return "—";
  return a > 0 ? `+${a}` : `${a}`;
}

function fmtPct(p) {
  if (p === null || p === undefined || !Number.isFinite(p)) return "—";
  return `${(p * 100).toFixed(2)}%`;
}

function fmtMoney(x) {
  if (x === null || x === undefined || !Number.isFinite(x)) return "—";
  const sign = x < 0 ? "-" : "";
  const abs = Math.abs(x);
  return `${sign}$${abs.toFixed(2)}`;
}

function encodeState(stateObj) {
  const json = JSON.stringify(stateObj);
  const b64 = btoa(unescape(encodeURIComponent(json)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  return b64;
}

function decodeState(b64url) {
  try {
    const b64 = b64url.replaceAll("-", "+").replaceAll("_", "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const json = decodeURIComponent(escape(atob(b64 + pad)));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getShareUrlWithState(stateObj) {
  const url = new URL(window.location.href);
  url.searchParams.set("s", encodeState(stateObj));
  return url.toString();
}

export default function ParlayPage() {
  const [mode, setMode] = useState("perleg");

  const [vigPct, setVigPct] = useState(DEFAULT_VIG_PCT);
  const [stake, setStake] = useState(DEFAULT_STAKE);
  const [boostPct, setBoostPct] = useState("");
  const [totalOdds, setTotalOdds] = useState("");

  const [legs, setLegs] = useState([
    { id: crypto.randomUUID(), label: "", sharpA: "", sharpB: "", your: "" },
    { id: crypto.randomUUID(), label: "", sharpA: "", sharpB: "", your: "" },
  ]);

  const [helpOpen, setHelpOpen] = useState(false);
  const toastRef = useRef(null);

  // Load from share link
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const s = url.searchParams.get("s");
    if (!s) return;

    const decoded = decodeState(s);
    if (!decoded) return;

    if (decoded.mode) setMode(decoded.mode === "total" ? "total" : "perleg");
    if (Number.isFinite(decoded.vigPct)) setVigPct(decoded.vigPct);
    if (Number.isFinite(decoded.stake)) setStake(decoded.stake);
    if (decoded.boostPct !== undefined) setBoostPct(decoded.boostPct);
    if (decoded.totalOdds !== undefined) setTotalOdds(decoded.totalOdds);

    if (Array.isArray(decoded.legs) && decoded.legs.length) {
      setLegs(
        decoded.legs.map((l) => ({
          id: crypto.randomUUID(),
          label: l.label ?? "",
          sharpA: l.sharpA ?? "",
          sharpB: l.sharpB ?? "",
          your: l.your ?? "",
        }))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showToast(msg) {
    if (!toastRef.current) return;
    toastRef.current.textContent = msg;
    toastRef.current.classList.add("show");
    setTimeout(() => toastRef.current?.classList.remove("show"), 1800);
  }

  async function copyText(text, okMsg = "Copied") {
    try {
      await navigator.clipboard.writeText(text);
      showToast(okMsg);
    } catch {
      showToast("Copy failed (browser blocked)");
    }
  }

  function addLeg() {
    setLegs((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: "", sharpA: "", sharpB: "", your: "" },
    ]);
  }

  function removeLeg(id) {
    setLegs((prev) => {
      const next = prev.filter((l) => l.id !== id);
      return next.length ? next : prev;
    });
  }

  function clearLegs() {
    setLegs([{ id: crypto.randomUUID(), label: "", sharpA: "", sharpB: "", your: "" }]);
    showToast("Legs cleared");
  }

  function clearAll() {
    setMode("perleg");
    setVigPct(DEFAULT_VIG_PCT);
    setStake(DEFAULT_STAKE);
    setBoostPct("");
    setTotalOdds("");
    setLegs([
      { id: crypto.randomUUID(), label: "", sharpA: "", sharpB: "", your: "" },
      { id: crypto.randomUUID(), label: "", sharpA: "", sharpB: "", your: "" },
    ]);
    showToast("Cleared all");
  }

  const legCalcs = useMemo(() => {
    const vig = clamp((safeNum(vigPct) ?? DEFAULT_VIG_PCT) / 100, 0, 0.25);

    return legs.map((leg) => {
      const pA = americanToProb(leg.sharpA);
      const pB = americanToProb(leg.sharpB);

      let pTrue = null;
      let method = "";

      if (pA !== null && pB !== null) {
        const total = pA + pB;
        if (total > 0) {
          pTrue = clamp(pA / total, 0.000001, 0.999999);
          method = "Devig (two-sided)";
        }
      } else if (pA !== null && pB === null) {
        pTrue = clamp(pA / (1 + vig), 0.000001, 0.999999);
        method = `Assumed vig (${(vig * 100).toFixed(1)}%)`;
      }

      const fairA = pTrue !== null ? probToAmerican(pTrue) : null;
      const yourDec = americanToDecimal(leg.your);

      return { id: leg.id, pTrue, fairA, method, yourDec };
    });
  }, [legs, vigPct]);

  const results = useMemo(() => {
    const stakeNum = clamp(safeNum(stake) ?? DEFAULT_STAKE, 0, 1_000_000);
    const boost = clamp((safeNum(boostPct) ?? 0) / 100, 0, 10);

    const probs = legCalcs.map((l) => l.pTrue).filter((p) => p !== null && Number.isFinite(p));
    const trueParlayProb = probs.length > 0 ? probs.reduce((acc, p) => acc * p, 1) : null;

    const fairParlayAmerican = trueParlayProb !== null ? probToAmerican(trueParlayProb) : null;

    let yourParlayAmerican = null;

    if (mode === "total") {
      const a = safeNum(totalOdds);
      if (a !== null && a !== 0) yourParlayAmerican = Math.trunc(a);
    } else {
      const yourDecs = legCalcs.map((l) => l.yourDec).filter((d) => d !== null && Number.isFinite(d));
      if (yourDecs.length > 0 && yourDecs.length === legs.length) {
        const parlayDec = yourDecs.reduce((acc, d) => acc * d, 1);
        yourParlayAmerican = decimalToAmerican(parlayDec);
      }
    }

    let boostedAmerican = null;
    const yourDec = yourParlayAmerican !== null ? americanToDecimal(yourParlayAmerican) : null;
    if (yourDec !== null) {
      const profitMultiple = yourDec - 1;
      const boostedProfitMultiple = profitMultiple * (1 + boost);
      const boostedDec = 1 + boostedProfitMultiple;
      boostedAmerican = decimalToAmerican(boostedDec);
    }

    const offeredAmerican = boost > 0 && boostedAmerican !== null ? boostedAmerican : yourParlayAmerican;
    const offeredDec = offeredAmerican !== null ? americanToDecimal(offeredAmerican) : null;

    const breakEvenProb = offeredDec !== null ? clamp(1 / offeredDec, 0, 1) : null;

    let evDollars = null;
    let evPct = null;

    if (trueParlayProb !== null && offeredDec !== null) {
      const profitIfWin = stakeNum * (offeredDec - 1);
      evDollars = trueParlayProb * profitIfWin - (1 - trueParlayProb) * stakeNum;
      evPct = stakeNum > 0 ? evDollars / stakeNum : null;
    }

    const status =
      evPct === null ? "Enter inputs to calculate" : evPct > 0 ? "+EV" : evPct < 0 ? "-EV" : "Neutral";

    return {
      trueParlayProb,
      fairParlayAmerican,
      yourParlayAmerican,
      boostedAmerican,
      breakEvenProb,
      evDollars,
      evPct,
      status,
      stakeNum,
    };
  }, [legCalcs, mode, totalOdds, stake, boostPct, legs.length]);

  function currentStateForShare() {
    return {
      mode,
      vigPct: safeNum(vigPct) ?? DEFAULT_VIG_PCT,
      stake: safeNum(stake) ?? DEFAULT_STAKE,
      boostPct: boostPct ?? "",
      totalOdds: totalOdds ?? "",
      legs: legs.map((l) => ({
        label: l.label ?? "",
        sharpA: l.sharpA ?? "",
        sharpB: l.sharpB ?? "",
        your: l.your ?? "",
      })),
    };
  }

  function buildResultsText() {
    const lines = [];
    lines.push("EV Parlay Builder Results");
    lines.push(`Mode: ${mode === "total" ? "Total parlay odds" : "Per-leg your odds"}`);
    lines.push(`Stake: $${(results.stakeNum ?? 0).toFixed(2)}`);
    lines.push(`Assumed vig when Sharp B missing: ${Number(vigPct).toFixed(2)}%`);
    if (safeNum(boostPct) !== null && safeNum(boostPct) > 0) {
      lines.push(`Boost: ${Number(boostPct).toFixed(2)}% (profit portion)`);
    }
    lines.push("");
    lines.push(`True Parlay Probability: ${fmtPct(results.trueParlayProb)}`);
    lines.push(`Fair Parlay Odds: ${fmtAmerican(results.fairParlayAmerican)}`);
    lines.push(`Your Parlay Odds: ${fmtAmerican(results.yourParlayAmerican)}`);
    lines.push(`Boosted Parlay Odds: ${fmtAmerican(results.boostedAmerican)}`);
    lines.push(`Break-even Probability: ${fmtPct(results.breakEvenProb)}`);
    lines.push(`EV $: ${fmtMoney(results.evDollars)}`);
    lines.push(`EV %: ${results.evPct === null ? "—" : `${(results.evPct * 100).toFixed(2)}%`}`);
    lines.push(`Status: ${results.status}`);
    return lines.join("\n");
  }

  const toneClass =
    results.evPct === null ? "" : results.evPct > 0 ? "toneGood" : results.evPct < 0 ? "toneBad" : "";

  return (
    <div className="container">
      <div className="toast" ref={toastRef} />

      {/* TOP HEADER (clean) */}
      <div className="headerRow">
        <div>
          <h1 className="h1">EV Parlay Builder</h1>
          <div className="subhead">
            Devig vs sharp odds → true probability → compare to your odds (with optional boost)
          </div>
        </div>

        <div className="topActions">
          <button
            className="pill"
            onClick={() => copyText(getShareUrlWithState(currentStateForShare()), "Share link copied")}
            title="Copy a shareable link (includes all inputs)"
          >
            Copy Share Link
          </button>
          <button className="pill" onClick={() => setHelpOpen(true)}>
            Help
          </button>
        </div>
      </div>

      <div className="notice">
        <b>Required:</b> each leg needs Sharp Side A. Your odds are required in <b>PER-LEG</b> mode, or Total
        Parlay Odds in <b>TOTAL</b> mode. Sharp Side B is optional (we’ll assume the vig % if missing).
      </div>

      {/* INPUTS */}
      <section className="panel">
        <div className="panelHeader">
          <div>
            <div className="panelTitle">Inputs</div>
            <div className="panelSub">Set assumptions once, then build legs below.</div>
          </div>

          <div className="segmented">
            <button
              className={mode === "perleg" ? "segBtn segBtnActive" : "segBtn"}
              onClick={() => setMode("perleg")}
            >
              Per-leg your odds
            </button>
            <button
              className={mode === "total" ? "segBtn segBtnActive" : "segBtn"}
              onClick={() => setMode("total")}
            >
              Total parlay odds
            </button>
          </div>
        </div>

        <div className="gridInputs">
          <div className="field">
            <label>Assumed Vig % (if Sharp B missing)</label>
            <input className="input" value={vigPct} onChange={(e) => setVigPct(e.target.value)} placeholder="7" />
          </div>

          <div className="field">
            <label>Stake ($)</label>
            <input className="input" value={stake} onChange={(e) => setStake(e.target.value)} placeholder="10" />
          </div>

          <div className="field">
            <label>{mode === "total" ? "Your Total Parlay Odds (American)" : "Total Parlay Odds"}</label>
            <input
              className="input"
              value={mode === "total" ? totalOdds : ""}
              onChange={(e) => setTotalOdds(e.target.value)}
              placeholder={mode === "total" ? "Example: +300" : "(Calculated from leg odds)"}
              disabled={mode !== "total"}
            />
          </div>

          <div className="field" style={{ gridColumn: "1 / span 2" }}>
            <label>Boost % (optional)</label>
            <input
              className="input"
              value={boostPct}
              onChange={(e) => setBoostPct(e.target.value)}
              placeholder="Example: 20"
            />
          </div>
        </div>

        {/* Tips dropdown (real, visible, styled) */}
        <details className="tipBox">
          <summary className="tipSummary">Tips (click)</summary>
          <div className="tipBody">
            <div style={{ marginBottom: 6 }}>
              <b>Sharp books</b> are typically lower-vig, more efficient markets. We use them to estimate a truer
              probability.
            </div>
            <div style={{ marginBottom: 6 }}>
              If you have both Sharp A and Sharp B, we devig two-sided. If Sharp B is blank, we approximate using the
              assumed vig above.
            </div>
            <div>
              Profit boosts apply to the <b>profit portion</b>, not your full payout.
            </div>
            <div style={{ marginTop: 8 }}>
              <button className="btn btnGhost" type="button" onClick={() => setHelpOpen(true)}>
                What’s “sharp”? (more)
              </button>
            </div>
          </div>
        </details>
      </section>

      {/* LEGS */}
      <section className="panel">
        <div className="panelHeader">
          <div>
            <div className="panelTitle">Legs</div>
            <div className="panelSub">
              Sharp A required. Sharp B optional.{" "}
              {mode === "perleg" ? "Your odds required in per-leg mode." : "Your odds ignored in total mode."}
            </div>
          </div>

          <div className="btnRow">
            <button className="btn" onClick={clearLegs}>
              Clear Legs
            </button>
          </div>
        </div>

        <div className="legsHeaderGrid">
          <div>#</div>
          <div>Label</div>
          <div>Sharp Side A</div>
          <div>Sharp Side B</div>
          <div>{mode === "perleg" ? "Your Odds" : "Your Odds (ignored)"}</div>
          <div>Leg True Prob</div>
          <div>Leg Fair Odds</div>
        </div>

        {legs.map((leg, idx) => {
          const calc = legCalcs[idx];
          return (
            <div key={leg.id} className="legRowGrid">
              <div className="legIndex">{idx + 1}</div>

              <input
                className="input"
                value={leg.label}
                onChange={(e) =>
                  setLegs((prev) => prev.map((x) => (x.id === leg.id ? { ...x, label: e.target.value } : x)))
                }
                placeholder="Optional (e.g., Knicks ML)"
              />

              <input
                className="input"
                value={leg.sharpA}
                onChange={(e) =>
                  setLegs((prev) => prev.map((x) => (x.id === leg.id ? { ...x, sharpA: e.target.value } : x)))
                }
                placeholder="Example: -110"
              />

              <input
                className="input"
                value={leg.sharpB}
                onChange={(e) =>
                  setLegs((prev) => prev.map((x) => (x.id === leg.id ? { ...x, sharpB: e.target.value } : x)))
                }
                placeholder="Optional: +100"
              />

              <input
                className="input"
                value={leg.your}
                onChange={(e) =>
                  setLegs((prev) => prev.map((x) => (x.id === leg.id ? { ...x, your: e.target.value } : x)))
                }
                placeholder={mode === "perleg" ? "Example: +120" : "Ignored in TOTAL mode"}
                disabled={mode !== "perleg"}
              />

              <div>
                <div className="kpiBig">{fmtPct(calc?.pTrue)}</div>
                <div className="miniNote">{calc?.method || "—"}</div>
              </div>

              <div>
                <div className="kpiBig">{fmtAmerican(calc?.fairA)}</div>
                <div className="miniNote">Fair odds</div>
              </div>

              <button className="btn btnDanger" onClick={() => removeLeg(leg.id)}>
                Remove
              </button>
            </div>
          );
        })}

        {/* Add Leg BELOW the last leg (your request) */}
        <div className="legsFooterActions">
          <div className="legsFooterActionsLeft" />
          <button className="btn btnPrimary" onClick={addLeg}>
            + Add Leg
          </button>
        </div>

        <div className="miniNote" style={{ marginTop: 10 }}>
          Tip: You can use this as a 1-leg calculator by removing down to one leg.
        </div>
      </section>

      {/* RESULTS */}
      <section className="panel">
        <div className="resultsHeaderRow">
          <div>
            <div className="panelTitle">Results</div>
            <div className="panelSub">One clean copy button for the full results.</div>
          </div>

          <div className="btnRow">
            <button className="btn" onClick={() => copyText(buildResultsText(), "Results copied")}>
              Copy Results
            </button>
            <button className="btn btnDanger" onClick={clearAll}>
              Clear All
            </button>
          </div>
        </div>

        <div className="resultsGrid">
          <div className="resultCard">
            <div className="resultLabel">True Parlay Probability</div>
            <div className="resultValue">{fmtPct(results.trueParlayProb)}</div>
          </div>

          <div className="resultCard">
            <div className="resultLabel">Fair Parlay Odds</div>
            <div className="resultValue">{fmtAmerican(results.fairParlayAmerican)}</div>
          </div>

          <div className="resultCard">
            <div className="resultLabel">Your Parlay Odds</div>
            <div className="resultValue">{fmtAmerican(results.yourParlayAmerican)}</div>
          </div>

          <div className="resultCard">
            <div className="resultLabel">Boosted Parlay Odds</div>
            <div className="resultValue">{fmtAmerican(results.boostedAmerican)}</div>
          </div>

          <div className="resultCard">
            <div className="resultLabel">Break-even Probability</div>
            <div className="resultValue">{fmtPct(results.breakEvenProb)}</div>
          </div>

          <div className={`resultCard ${results.evDollars === null ? "" : results.evDollars > 0 ? "toneGood" : "toneBad"}`}>
            <div className="resultLabel">EV $ (stake: ${Math.round(results.stakeNum ?? 0)})</div>
            <div className="resultValue">{fmtMoney(results.evDollars)}</div>
          </div>

          <div className={`resultCard ${toneClass}`}>
            <div className="resultLabel">EV %</div>
            <div className="resultValue">
              {results.evPct === null ? "—" : `${(results.evPct * 100).toFixed(2)}%`}
            </div>
          </div>

          <div className={`resultCard ${results.status === "+EV" ? "toneGood" : results.status === "-EV" ? "toneBad" : ""}`}>
            <div className="resultLabel">Status</div>
            <div className="resultValue">{results.status}</div>
          </div>
        </div>

        <div className="miniNote" style={{ marginTop: 14 }}>
          This tool is for informational purposes only. Always double-check inputs.
        </div>
      </section>

      {/* HELP MODAL */}
      {helpOpen ? (
        <div
          onMouseDown={() => setHelpOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 50,
          }}
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              maxWidth: 720,
              width: "100%",
              border: "1px solid var(--border)",
              background: "rgba(10,18,32,0.92)",
              borderRadius: 18,
              boxShadow: "var(--shadow)",
              padding: 18,
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>Help / What are “Sharp Books”?</div>
            <div style={{ color: "rgba(255,255,255,0.78)", lineHeight: 1.5, fontSize: 14 }}>
              <p>
                <b>“Sharp” books</b> are sportsbooks/markets that tend to have <b>tighter pricing</b> (lower vig,
                faster line efficiency). We use their odds to estimate a <b>truer probability</b>, then compare that to
                the odds you’re getting.
              </p>
              <p>
                <b>Sharp Side A</b> is the side you want to bet. If you provide <b>Sharp Side B</b> as the opposite
                side, the calculator can <b>devig two-sided</b> by normalizing implied probabilities.
              </p>
              <p>
                If you don’t have Sharp Side B, we approximate by assuming an <b>overround</b> of <b>(1 + assumed vig)</b>{" "}
                and reduce Sharp A’s implied probability accordingly.
              </p>
              <p>
                <b>Boost %</b> applies to the <b>profit portion only</b> (common “profit boost” structure).
              </p>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <button className="btn btnPrimary" onClick={() => setHelpOpen(false)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
