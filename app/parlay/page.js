"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

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
  // Odds entry mode
  const [mode, setMode] = useState("perleg"); // "perleg" | "total"

  // Fair value source (how we get true probability)
  const [fairSource, setFairSource] = useState("sharp"); // "sharp" | "manual"

  // Inputs (top)
  const [vigPct, setVigPct] = useState(DEFAULT_VIG_PCT);
  const [stake, setStake] = useState(DEFAULT_STAKE);
  const [boostPct, setBoostPct] = useState("");
  const [totalOdds, setTotalOdds] = useState("");

  // Manual fair odds input (total mode only)
  const [fairTotalOdds, setFairTotalOdds] = useState("");

  // Legs
  const [legs, setLegs] = useState([
    { id: crypto.randomUUID(), label: "", sharpA: "", sharpB: "", fair: "", your: "" },
    { id: crypto.randomUUID(), label: "", sharpA: "", sharpB: "", fair: "", your: "" },
  ]);

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
    if (decoded.fairSource) setFairSource(decoded.fairSource === "manual" ? "manual" : "sharp");

    if (Number.isFinite(decoded.vigPct)) setVigPct(decoded.vigPct);
    if (Number.isFinite(decoded.stake)) setStake(decoded.stake);
    if (decoded.boostPct !== undefined) setBoostPct(decoded.boostPct);
    if (decoded.totalOdds !== undefined) setTotalOdds(decoded.totalOdds);
    if (decoded.fairTotalOdds !== undefined) setFairTotalOdds(decoded.fairTotalOdds);

    if (Array.isArray(decoded.legs) && decoded.legs.length) {
      setLegs(
        decoded.legs.map((l) => ({
          id: crypto.randomUUID(),
          label: l.label ?? "",
          sharpA: l.sharpA ?? "",
          sharpB: l.sharpB ?? "",
          fair: l.fair ?? "",
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
      { id: crypto.randomUUID(), label: "", sharpA: "", sharpB: "", fair: "", your: "" },
    ]);
  }

  function removeLeg(id) {
    setLegs((prev) => {
      const next = prev.filter((l) => l.id !== id);
      return next.length ? next : prev;
    });
  }

  function clearLegs() {
    setLegs([{ id: crypto.randomUUID(), label: "", sharpA: "", sharpB: "", fair: "", your: "" }]);
    showToast("Legs cleared");
  }

  function clearAll() {
    setMode("perleg");
    setFairSource("sharp");
    setVigPct(DEFAULT_VIG_PCT);
    setStake(DEFAULT_STAKE);
    setBoostPct("");
    setTotalOdds("");
    setFairTotalOdds("");
    setLegs([
      { id: crypto.randomUUID(), label: "", sharpA: "", sharpB: "", fair: "", your: "" },
      { id: crypto.randomUUID(), label: "", sharpA: "", sharpB: "", fair: "", your: "" },
    ]);
    showToast("Cleared all");
  }

  // Dimming helper
  function inputClass(disabled) {
    return disabled ? "input dim" : "input";
  }

  const legCalcs = useMemo(() => {
    const vig = clamp((safeNum(vigPct) ?? DEFAULT_VIG_PCT) / 100, 0, 0.25);

    return legs.map((leg) => {
      // Manual fair odds (per-leg)
      if (fairSource === "manual" && mode === "perleg") {
        const pFair = americanToProb(leg.fair);
        const pTrue = pFair !== null ? clamp(pFair, 0.000001, 0.999999) : null;
        const fairA = pTrue !== null ? probToAmerican(pTrue) : null;
        const yourDec = americanToDecimal(leg.your);

        return {
          id: leg.id,
          pTrue,
          fairA,
          method: "Manual fair odds",
          yourDec,
        };
      }

      // Sharp devig
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

      return { id: leg.id, pTrue, fairA, method: method || "—", yourDec };
    });
  }, [legs, vigPct, fairSource, mode]);

  const results = useMemo(() => {
    const stakeNum = clamp(safeNum(stake) ?? DEFAULT_STAKE, 0, 1_000_000);
    const boost = clamp((safeNum(boostPct) ?? 0) / 100, 0, 10);

    // TRUE PROBABILITY SOURCE
    let trueParlayProb = null;

    if (fairSource === "manual" && mode === "total") {
      const p = americanToProb(fairTotalOdds);
      trueParlayProb = p !== null ? clamp(p, 0.000001, 0.999999) : null;
    } else {
      const probs = legCalcs.map((l) => l.pTrue).filter((p) => p !== null && Number.isFinite(p));
      trueParlayProb = probs.length > 0 ? probs.reduce((acc, p) => acc * p, 1) : null;
    }

    const fairParlayAmerican = trueParlayProb !== null ? probToAmerican(trueParlayProb) : null;

    // YOUR ODDS SOURCE
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

    // BOOSTED ODDS
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

    // EV
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
  }, [legCalcs, mode, totalOdds, stake, boostPct, legs.length, fairSource, fairTotalOdds]);

  function currentStateForShare() {
    return {
      mode,
      fairSource,
      vigPct: safeNum(vigPct) ?? DEFAULT_VIG_PCT,
      stake: safeNum(stake) ?? DEFAULT_STAKE,
      boostPct: boostPct ?? "",
      totalOdds: totalOdds ?? "",
      fairTotalOdds: fairTotalOdds ?? "",
      legs: legs.map((l) => ({
        label: l.label ?? "",
        sharpA: l.sharpA ?? "",
        sharpB: l.sharpB ?? "",
        fair: l.fair ?? "",
        your: l.your ?? "",
      })),
    };
  }

  function buildResultsText() {
    const lines = [];
    lines.push("EV Parlay Builder Results");
    lines.push(`Odds Mode: ${mode === "total" ? "Total Parlay Odds" : "Per-Leg Odds"}`);
    lines.push(`Fair Value Source: ${fairSource === "manual" ? "Manual Fair Odds" : "Sharp Devig"}`);
    lines.push(`Stake: $${(results.stakeNum ?? 0).toFixed(2)}`);

    if (fairSource === "sharp") {
      lines.push(`Assumed vig when Sharp B missing: ${Number(vigPct).toFixed(2)}%`);
    }

    if (mode === "total") {
      lines.push(`Your Total Parlay Odds: ${isBlank(totalOdds) ? "—" : String(totalOdds)}`);
      if (fairSource === "manual") {
        lines.push(`Fair Parlay Odds: ${isBlank(fairTotalOdds) ? "—" : String(fairTotalOdds)}`);
      }
    }

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

  const isManual = fairSource === "manual";
  const isTotal = mode === "total";
  const isPerLeg = mode === "perleg";

  // Top disable rules
  const vigDisabled = isManual;
  const totalOddsDisabled = !isTotal; // only editable in total mode
  const fairTotalVisible = isManual && isTotal;

  return (
    <div className="container">
      <div className="toast" ref={toastRef} />

      {/* TOP HEADER */}
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

          <Link className="pill" href="/help" title="Help / Guide">
            Help
          </Link>
        </div>
      </div>

      <div className="notice">
        <b>Required:</b>{" "}
        {fairSource === "sharp" ? (
          <>
            each leg needs <b>Sharp Side A</b>. Your odds are required in <b>PER-LEG</b> mode, or Total Parlay Odds in{" "}
            <b>TOTAL</b> mode. Sharp Side B is optional (we’ll assume the vig % if missing).
          </>
        ) : (
          <>
            enter <b>Fair Odds</b> (manual) and compare to your odds. In <b>PER-LEG</b> mode, you’ll enter fair odds per
            leg. In <b>TOTAL</b> mode, you’ll enter fair odds for the full parlay.
          </>
        )}
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
              Per-Leg Odds
            </button>
            <button
              className={mode === "total" ? "segBtn segBtnActive" : "segBtn"}
              onClick={() => setMode("total")}
            >
              Total Parlay Odds
            </button>
          </div>
        </div>

        {/* Fair value source selector */}
        <div className="fairSourceRow">
          <div className="miniNote" style={{ marginBottom: 6 }}>
            Fair Value Source
          </div>
          <div className="segmented">
            <button
              className={fairSource === "sharp" ? "segBtn segBtnActive" : "segBtn"}
              onClick={() => setFairSource("sharp")}
            >
              Devig from Sharp Books
            </button>
            <button
              className={fairSource === "manual" ? "segBtn segBtnActive" : "segBtn"}
              onClick={() => setFairSource("manual")}
            >
              Manual Fair Odds
            </button>
          </div>
        </div>

        <div className="gridInputs">
          <div className="field">
            <label>Assumed Vig % (if Sharp B missing)</label>
            <input
              className={inputClass(vigDisabled)}
              value={vigPct}
              onChange={(e) => setVigPct(e.target.value)}
              placeholder="7"
              disabled={vigDisabled}
            />
          </div>

          <div className="field">
            <label>Stake ($)</label>
            <input className="input" value={stake} onChange={(e) => setStake(e.target.value)} placeholder="10" />
          </div>

          <div className="field">
            <label>{mode === "total" ? "Your Total Parlay Odds (American)" : "Total Parlay Odds"}</label>
            <input
              className={inputClass(totalOddsDisabled)}
              value={mode === "total" ? totalOdds : ""}
              onChange={(e) => setTotalOdds(e.target.value)}
              placeholder={mode === "total" ? "Example: +300" : "(Calculated from leg odds)"}
              disabled={totalOddsDisabled}
            />
          </div>

          {/* Manual fair odds (total mode only) */}
          {fairTotalVisible ? (
            <div className="field">
              <label>Fair Parlay Odds (American)</label>
              <input
                className="input"
                value={fairTotalOdds}
                onChange={(e) => setFairTotalOdds(e.target.value)}
                placeholder="Example: -110"
              />
            </div>
          ) : null}

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

        {/* Instructions dropdown */}
        <details className="tipBox">
          <summary className="tipSummary">Instructions (click)</summary>
          <div className="tipBody">
            <div style={{ marginBottom: 10 }}>
              <b>Quick start</b>
              <ol style={{ margin: "6px 0 0 18px", padding: 0, color: "rgba(255,255,255,0.82)" }}>
                <li style={{ marginBottom: 4 }}>
                  Choose <b>Odds Mode</b>: <b>Per-Leg Odds</b> or <b>Total Parlay Odds</b>.
                </li>
                <li style={{ marginBottom: 4 }}>
                  Choose <b>Fair Value Source</b>: <b>Devig from Sharp Books</b> or <b>Manual Fair Odds</b>.
                </li>
                <li>
                  Enter inputs and read results: <b>EV %</b> and <b>Status</b>.
                </li>
              </ol>
            </div>

            <div style={{ marginBottom: 10 }}>
              <b>What each input means</b>
              <div style={{ marginTop: 6, color: "rgba(255,255,255,0.82)", lineHeight: 1.55 }}>
                <div>
                  <b>Label (optional):</b> a note like “Knicks ML”.
                </div>
                <div>
                  <b>Stake ($):</b> amount risked.
                </div>
                <div>
                  <b>Boost %:</b> applies to <b>profit portion</b> only.
                </div>
                <div>
                  <b>Your Odds:</b> odds you can actually bet.
                </div>
                <div>
                  <b>Fair Odds:</b> no-vig line used to estimate true probability.
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <b>Modes</b>
              <div style={{ marginTop: 6, color: "rgba(255,255,255,0.82)", lineHeight: 1.55 }}>
                <div style={{ marginBottom: 8 }}>
                  <b>Per-Leg Odds:</b> enter odds on every leg.
                </div>
                <div>
                  <b>Total Parlay Odds:</b> enter one total parlay price up top (leg “Your Odds” is ignored).
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <b>Fair Value Source</b>
              <div style={{ marginTop: 6, color: "rgba(255,255,255,0.82)", lineHeight: 1.55 }}>
                <div style={{ marginBottom: 8 }}>
                  <b>Sharp Devig:</b> enter Sharp A (and optional Sharp B). If Sharp B is missing, we use assumed vig %.
                </div>
                <div>
                  <b>Manual Fair Odds:</b> if you already know fair odds, enter them. In total mode, enter fair parlay odds
                  up top. In per-leg mode, enter fair odds per leg. Irrelevant boxes are disabled.
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <b>How to interpret results</b>
              <div style={{ marginTop: 6, color: "rgba(255,255,255,0.82)", lineHeight: 1.55 }}>
                <div>
                  <b>True Probability</b> → estimated win rate.
                </div>
                <div>
                  <b>Fair Odds</b> → “no-vig” price implied by true probability.
                </div>
                <div>
                  <b>Break-even</b> → win rate required at offered odds.
                </div>
                <div>
                  <b>EV</b> → expected profit/loss over the long run.
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <b>Common mistakes</b>
              <ul style={{ margin: "6px 0 0 18px", padding: 0, color: "rgba(255,255,255,0.82)" }}>
                <li style={{ marginBottom: 4 }}>Use American odds only (e.g., -110 or +150).</li>
                <li style={{ marginBottom: 4 }}>EV is long-run edge — not a guarantee.</li>
              </ul>
            </div>

            <div style={{ marginTop: 8 }}>
              <Link className="btn btnGhost" href="/help">
                Open full Help / Guide
              </Link>
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
              {fairSource === "sharp" ? (
                <>
                  Sharp A required. Sharp B optional.{" "}
                  {mode === "perleg" ? "Your odds required in per-leg mode." : "Your odds ignored in total mode."}
                </>
              ) : (
                <>
                  Manual fair odds selected.{" "}
                  {mode === "perleg"
                    ? "Enter Fair Odds + Your Odds on each leg."
                    : "Enter Fair Parlay Odds + Your Total Parlay Odds above (legs disabled)."}
                </>
              )}
            </div>
          </div>

          <div className="btnRow">
            <button className="btn" onClick={clearLegs}>
              Clear Legs
            </button>
          </div>
        </div>

        {/* Desktop header grid */}
        <div className="legsHeaderGrid">
          <div>#</div>
          <div>Label</div>
          <div>{isManual && isPerLeg ? "Fair Odds (American)" : "Sharp Side A"}</div>
          <div>{isManual && isPerLeg ? "—" : "Sharp Side B"}</div>
          <div>{isPerLeg ? "Your Odds" : "Your Odds (ignored)"}</div>
          <div>Leg True Prob</div>
          <div>Leg Fair Odds</div>
          <div>Action</div>
        </div>

        {legs.map((leg, idx) => {
          const calc = legCalcs[idx];

          const legsDisabled = isManual && isTotal; // manual+total = legs locked
          const sharpLocked = isManual; // manual mode blocks sharp inputs
          const labelLocked = legsDisabled;
          const yourLocked = isTotal || legsDisabled; // total mode ignores per-leg your odds
          const fairPerLegActive = isManual && isPerLeg;

          const colAIsDisabled = legsDisabled ? true : fairPerLegActive ? false : sharpLocked;
          const sharpBDisabled = fairPerLegActive ? true : legsDisabled ? true : sharpLocked;

          return (
            <div key={leg.id} className={`legRowGrid ${legsDisabled ? "dimRow" : ""}`}>
              {/* Col 1 */}
              <div className="legIndex">{idx + 1}</div>

              {/* Col 2 */}
              <div className="legCell">
                <div className="mobileOnlyLabel">Label</div>
                <input
                  className={inputClass(labelLocked)}
                  value={leg.label}
                  onChange={(e) =>
                    setLegs((prev) => prev.map((x) => (x.id === leg.id ? { ...x, label: e.target.value } : x)))
                  }
                  placeholder="Label (optional, e.g. Knicks ML)"
                  disabled={labelLocked}
                />
              </div>

              {/* Col 3 */}
              <div className="legCell">
                <div className="mobileOnlyLabel">{fairPerLegActive ? "Fair Odds" : "Sharp A"}</div>
                <input
                  className={inputClass(colAIsDisabled)}
                  value={fairPerLegActive ? leg.fair : leg.sharpA}
                  onChange={(e) =>
                    setLegs((prev) =>
                      prev.map((x) =>
                        x.id === leg.id
                          ? fairPerLegActive
                            ? { ...x, fair: e.target.value }
                            : { ...x, sharpA: e.target.value }
                          : x
                      )
                    )
                  }
                  placeholder="Example: -110"
                  disabled={colAIsDisabled}
                />
              </div>

              {/* Col 4 */}
              <div className="legCell">
                <div className="mobileOnlyLabel">{fairPerLegActive ? "Sharp B" : "Sharp B"}</div>
                <input
                  className={inputClass(sharpBDisabled)}
                  value={fairPerLegActive ? "" : leg.sharpB}
                  onChange={(e) =>
                    setLegs((prev) => prev.map((x) => (x.id === leg.id ? { ...x, sharpB: e.target.value } : x)))
                  }
                  placeholder={fairPerLegActive ? "Disabled" : "Optional: +100"}
                  disabled={sharpBDisabled}
                />
              </div>

              {/* Col 5 */}
              <div className="legCell">
                <div className="mobileOnlyLabel">Your Odds</div>
                <input
                  className={inputClass(yourLocked)}
                  value={leg.your}
                  onChange={(e) =>
                    setLegs((prev) => prev.map((x) => (x.id === leg.id ? { ...x, your: e.target.value } : x)))
                  }
                  placeholder={isPerLeg ? "Example: +120" : "Ignored in TOTAL mode"}
                  disabled={yourLocked}
                />
              </div>

              {/* Col 6 */}
              <div className="legCell">
                <div className="mobileOnlyLabel">Leg True Prob</div>
                <div className="kpiBig">{fmtPct(calc?.pTrue)}</div>
                <div className="miniNote">{calc?.method || "—"}</div>
              </div>

              {/* Col 7 */}
              <div className="legCell">
                <div className="mobileOnlyLabel">Leg Fair Odds</div>
                <div className="kpiBig">{fmtAmerican(calc?.fairA)}</div>
                <div className="miniNote">Fair odds</div>
              </div>

              {/* Col 8 */}
              <div className="legCell">
                <div className="mobileOnlyLabel">Action</div>
                <button className="btn btnDanger" onClick={() => removeLeg(leg.id)} disabled={legsDisabled}>
                  Remove
                </button>
              </div>
            </div>
          );
        })}

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

          <div
            className={`resultCard ${
              results.evDollars === null ? "" : results.evDollars > 0 ? "toneGood" : "toneBad"
            }`}
          >
            <div className="resultLabel">EV $ (stake: ${Math.round(results.stakeNum ?? 0)})</div>
            <div className="resultValue">{fmtMoney(results.evDollars)}</div>
          </div>

          <div className={`resultCard ${toneClass}`}>
            <div className="resultLabel">EV %</div>
            <div className="resultValue">
              {results.evPct === null ? "—" : `${(results.evPct * 100).toFixed(2)}%`}
            </div>
          </div>

          <div
            className={`resultCard ${
              results.status === "+EV" ? "toneGood" : results.status === "-EV" ? "toneBad" : ""
            }`}
          >
            <div className="resultLabel">Status</div>
            <div className="resultValue">{results.status}</div>
          </div>
        </div>

        <div className="miniNote" style={{ marginTop: 14 }}>
          This tool is for informational purposes only. Always double-check inputs.
        </div>
      </section>
    </div>
  );
}
