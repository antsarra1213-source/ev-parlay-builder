"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const DEFAULT_ASSUMED_VIG_PCT = 7;
const DEFAULT_STAKE = 10;

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

function toNumOrNull(v) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function americanToDecimal(a) {
  if (a === 0) return null;
  if (a > 0) return 1 + a / 100;
  return 1 + 100 / Math.abs(a);
}

function americanToImpliedProb(a) {
  if (a === 0) return null;
  if (a > 0) return 100 / (a + 100);
  return Math.abs(a) / (Math.abs(a) + 100);
}

function probToAmerican(p) {
  const q = clamp(p, 1e-9, 1 - 1e-9);
  if (q >= 0.5) return -Math.round((q * 100) / (1 - q));
  return Math.round(((1 - q) * 100) / q);
}

function formatAmerican(a) {
  if (a === null || a === undefined || !Number.isFinite(a)) return "—";
  return a > 0 ? `+${a}` : `${a}`;
}

function formatPct(x) {
  if (x === null || x === undefined || !Number.isFinite(x)) return "—";
  return `${(x * 100).toFixed(2)}%`;
}

function formatMoney(x) {
  if (x === null || x === undefined || !Number.isFinite(x)) return "—";
  const sign = x >= 0 ? "" : "-";
  return `${sign}$${Math.abs(x).toFixed(2)}`;
}

function encodeStateToHash(stateObj) {
  try {
    const json = JSON.stringify(stateObj);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    return b64;
  } catch {
    return "";
  }
}

function decodeStateFromHash(b64) {
  try {
    const json = decodeURIComponent(escape(atob(b64)));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

const makeLeg = () => ({
  sharpA: "",
  sharpB: "",
  yourOdds: "",
  touched: { sharpA: false, sharpB: false, yourOdds: false },
});

export default function ParlayPage() {
  const [legs, setLegs] = useState([makeLeg(), makeLeg()]);

  const [oddsMode, setOddsMode] = useState("PER_LEG"); // PER_LEG or TOTAL
  const [totalParlayOdds, setTotalParlayOdds] = useState("");
  const [totalTouched, setTotalTouched] = useState(false);

  const [assumedVigPct, setAssumedVigPct] = useState(String(DEFAULT_ASSUMED_VIG_PCT));
  const [assumedVigTouched, setAssumedVigTouched] = useState(false);

  const [boostPct, setBoostPct] = useState("");
  const [boostTouched, setBoostTouched] = useState(false);

  const [stake, setStake] = useState(String(DEFAULT_STAKE));
  const [stakeTouched, setStakeTouched] = useState(false);

  // Load from URL hash if present
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash?.replace("#", "");
    if (!hash) return;

    const decoded = decodeStateFromHash(hash);
    if (!decoded) return;

    if (Array.isArray(decoded.legs) && decoded.legs.length >= 1) {
      setLegs(
        decoded.legs.map((l) => ({
          sharpA: l.sharpA ?? "",
          sharpB: l.sharpB ?? "",
          yourOdds: l.yourOdds ?? "",
          touched: { sharpA: false, sharpB: false, yourOdds: false },
        }))
      );
    }
    if (decoded.oddsMode) setOddsMode(decoded.oddsMode);
    if (decoded.totalParlayOdds !== undefined) setTotalParlayOdds(decoded.totalParlayOdds ?? "");
    if (decoded.assumedVigPct !== undefined)
      setAssumedVigPct(decoded.assumedVigPct ?? String(DEFAULT_ASSUMED_VIG_PCT));
    if (decoded.boostPct !== undefined) setBoostPct(decoded.boostPct ?? "");
    if (decoded.stake !== undefined) setStake(decoded.stake ?? String(DEFAULT_STAKE));
  }, []);

  const assumedVigDecimal = useMemo(() => {
    const n = toNumOrNull(assumedVigPct);
    if (n === null) return DEFAULT_ASSUMED_VIG_PCT / 100;
    return clamp(n / 100, 0, 0.25);
  }, [assumedVigPct]);

  const boostDecimal = useMemo(() => {
    const n = toNumOrNull(boostPct);
    if (n === null) return 0;
    return clamp(n / 100, 0, 5);
  }, [boostPct]);

  const stakeNum = useMemo(() => {
    const n = toNumOrNull(stake);
    if (n === null) return null;
    return clamp(n, 0, 1_000_000);
  }, [stake]);

  function updateLeg(i, key, value) {
    setLegs((prev) =>
      prev.map((leg, idx) => (idx !== i ? leg : { ...leg, [key]: value }))
    );
  }

  // mark touched on first interaction (change)
  function touchOnChange(i, key) {
    setLegs((prev) =>
      prev.map((leg, idx) => {
        if (idx !== i) return leg;
        if (leg.touched[key]) return leg;
        return { ...leg, touched: { ...leg.touched, [key]: true } };
      })
    );
  }

  function setTouched(i, key) {
    setLegs((prev) =>
      prev.map((leg, idx) => (idx !== i ? leg : { ...leg, touched: { ...leg.touched, [key]: true } }))
    );
  }

  function addLeg() {
    setLegs((prev) => [...prev, makeLeg()]);
  }

  function removeLeg(i) {
    setLegs((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  function clearAll() {
    setLegs([makeLeg(), makeLeg()]);
    setOddsMode("PER_LEG");
    setTotalParlayOdds("");
    setTotalTouched(false);
    setBoostPct("");
    setBoostTouched(false);
    setAssumedVigPct(String(DEFAULT_ASSUMED_VIG_PCT));
    setAssumedVigTouched(false);
    setStake(String(DEFAULT_STAKE));
    setStakeTouched(false);

    if (typeof window !== "undefined") {
      window.location.hash = "";
    }
  }

  const calc = useMemo(() => {
    const vig = assumedVigDecimal;

    const legsComputed = legs.map((leg) => {
      const a = toNumOrNull(leg.sharpA);
      const b = toNumOrNull(leg.sharpB);
      const y = toNumOrNull(leg.yourOdds);

      const pA = a === null ? null : americanToImpliedProb(a);
      const pB = b === null ? null : americanToImpliedProb(b);

      let fairProb = null;
      let usedAssumedVig = false;

      if (pA !== null && pB !== null) {
        const total = pA + pB;
        if (total > 0) fairProb = pA / total;
      } else if (pA !== null && pB === null) {
        usedAssumedVig = true;
        fairProb = pA / (1 + vig);
      }

      if (fairProb !== null) fairProb = clamp(fairProb, 1e-6, 1 - 1e-6);

      const fairAmerican = fairProb === null ? null : probToAmerican(fairProb);
      const yourDecimal = y === null ? null : americanToDecimal(y);

      return { fairProb, fairAmerican, yourDecimal, usedAssumedVig };
    });

    let trueProb = 1;
    let haveAllFair = true;
    for (const l of legsComputed) {
      if (l.fairProb === null) {
        haveAllFair = false;
        break;
      }
      trueProb *= l.fairProb;
    }
    trueProb = haveAllFair ? clamp(trueProb, 1e-12, 1 - 1e-12) : null;

    const fairParlayAmerican = trueProb === null ? null : probToAmerican(trueProb);

    let yourParlayDecimal = null;
    if (oddsMode === "TOTAL") {
      const t = toNumOrNull(totalParlayOdds);
      yourParlayDecimal = t === null ? null : americanToDecimal(t);
    } else {
      let dec = 1;
      let ok = true;
      for (const l of legsComputed) {
        if (l.yourDecimal === null) {
          ok = false;
          break;
        }
        dec *= l.yourDecimal;
      }
      yourParlayDecimal = ok ? dec : null;
    }

    const boostedDecimal =
      yourParlayDecimal === null ? null : 1 + (yourParlayDecimal - 1) * (1 + boostDecimal);

    const breakEvenProb = boostedDecimal === null ? null : 1 / boostedDecimal;

    const evPerDollar =
      trueProb === null || boostedDecimal === null ? null : trueProb * boostedDecimal - 1;

    const evDollars =
      evPerDollar === null || stakeNum === null ? null : evPerDollar * stakeNum;

    return {
      legsComputed,
      trueProb,
      fairParlayAmerican,
      yourParlayDecimal,
      boostedDecimal,
      breakEvenProb,
      evPerDollar,
      evPct: evPerDollar,
      evDollars,
    };
  }, [legs, oddsMode, totalParlayOdds, assumedVigDecimal, boostDecimal, stakeNum]);

  const topBanner = useMemo(() => {
    return `Required: each leg needs Sharp Side A. Your Odds are required in PER-LEG mode, or Total Parlay Odds in TOTAL mode. Sharp Side B is optional (we'll assume ${(assumedVigDecimal * 100).toFixed(
      1
    )}% vig if missing).`;
  }, [assumedVigDecimal]);

  function fieldError(leg, key) {
    const v = String(leg[key] ?? "").trim();
    if (!leg.touched[key]) return "";

    if (key === "sharpA") {
      if (!v) return "Required";
      if (toNumOrNull(v) === null) return "Enter valid American odds";
    }
    if (key === "sharpB") {
      if (!v) return "";
      if (toNumOrNull(v) === null) return "Enter valid American odds";
    }
    if (key === "yourOdds") {
      if (oddsMode !== "PER_LEG") return "";
      if (!v) return "Required";
      if (toNumOrNull(v) === null) return "Enter valid American odds";
    }
    return "";
  }

  const totalOddsError = useMemo(() => {
    if (oddsMode !== "TOTAL") return "";
    const v = String(totalParlayOdds ?? "").trim();
    if (!totalTouched) return "";
    if (!v) return "Required";
    if (toNumOrNull(v) === null) return "Enter valid American odds";
    return "";
  }, [oddsMode, totalParlayOdds, totalTouched]);

  const boostError = useMemo(() => {
    const v = String(boostPct ?? "").trim();
    if (!boostTouched) return "";
    if (!v) return "";
    const n = toNumOrNull(v);
    if (n === null) return "Enter a number (example: 20)";
    if (n < 0) return "Boost cannot be negative";
    return "";
  }, [boostPct, boostTouched]);

  const vigError = useMemo(() => {
    const v = String(assumedVigPct ?? "").trim();
    if (!assumedVigTouched) return "";
    if (!v) return "Required";
    const n = toNumOrNull(v);
    if (n === null) return "Enter a number (example: 7)";
    if (n < 0 || n > 25) return "Use 0–25";
    return "";
  }, [assumedVigPct, assumedVigTouched]);

  const stakeError = useMemo(() => {
    const v = String(stake ?? "").trim();
    if (!stakeTouched) return "";
    if (!v) return "Required";
    const n = toNumOrNull(v);
    if (n === null) return "Enter a number (example: 10)";
    if (n < 0) return "Stake cannot be negative";
    return "";
  }, [stake, stakeTouched]);

  function copyShareLink() {
    if (typeof window === "undefined") return;

    const shareState = {
      oddsMode,
      totalParlayOdds,
      boostPct,
      assumedVigPct,
      stake,
      legs: legs.map((l) => ({ sharpA: l.sharpA, sharpB: l.sharpB, yourOdds: l.yourOdds })),
    };
    const hash = encodeStateToHash(shareState);
    const url = `${window.location.origin}${window.location.pathname}#${hash}`;
    navigator.clipboard?.writeText(url);
    alert("Share link copied!");
  }

  const resultsReady = calc.trueProb !== null && calc.boostedDecimal !== null;

  const containerStyle = { maxWidth: 1100, margin: "0 auto", padding: "18px 18px 48px" };

  const cardStyle = {
    background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
  };

  const labelStyle = { fontSize: 12, color: "var(--muted)", marginBottom: 6 };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid var(--border2)",
    background: "rgba(0,0,0,0.18)",
    color: "var(--text)",
    outline: "none",
  };

  const errorTextStyle = { fontSize: 12, color: "var(--bad)", marginTop: 6, minHeight: 16 };

  const pillBtn = (variant = "default") => {
    const base = {
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid var(--border2)",
      background: "rgba(255,255,255,0.06)",
      color: "var(--text)",
      cursor: "pointer",
      whiteSpace: "nowrap",
    };
    if (variant === "primary") {
      return { ...base, background: "rgba(59,130,246,0.25)", border: "1px solid rgba(59,130,246,0.45)" };
    }
    if (variant === "danger") {
      return { ...base, background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.35)" };
    }
    return base;
  };

  return (
    <main style={containerStyle}>
      <style>{`
        @media (max-width: 900px){
          .legsHeader, .legsRow{
            grid-template-columns: 44px 1fr 1fr 1fr !important;
          }
          .hideOnMobile{ display:none !important; }
          .removeCol{ justify-content:flex-end; }
        }
      `}</style>

      {/* Header (compact) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, letterSpacing: 0.2 }}>EV Parlay Builder</h1>
          <div style={{ color: "var(--muted)", marginTop: 6, fontSize: 13 }}>
            Devig vs sharp odds → true probability → compare to your odds (with optional boost)
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={copyShareLink} style={pillBtn()}>
            Copy Share Link
          </button>
          <Link href="/help" style={{ ...pillBtn("primary"), display: "inline-block", textAlign: "center" }}>
            Help
          </Link>
        </div>
      </div>

      {/* Always-visible banner */}
      <div
        style={{
          marginTop: 10,
          padding: "10px 14px",
          borderRadius: 14,
          border: "1px solid rgba(239,68,68,0.30)",
          background: "rgba(239,68,68,0.10)",
          color: "rgba(255,255,255,0.92)",
          fontSize: 13,
        }}
      >
        {topBanner}
      </div>

      {/* INPUTS (FULL WIDTH on top) */}
      <section style={{ ...cardStyle, marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Inputs</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={pillBtn(oddsMode === "PER_LEG" ? "primary" : "default")} onClick={() => setOddsMode("PER_LEG")}>
              Per-leg your odds
            </button>
            <button style={pillBtn(oddsMode === "TOTAL" ? "primary" : "default")} onClick={() => setOddsMode("TOTAL")}>
              Total parlay odds
            </button>
          </div>
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <div style={labelStyle}>Assumed Vig % (if Sharp B missing)</div>
            <input
              style={inputStyle}
              value={assumedVigPct}
              onChange={(e) => {
                if (!assumedVigTouched) setAssumedVigTouched(true);
                setAssumedVigPct(e.target.value);
              }}
              onBlur={() => setAssumedVigTouched(true)}
              placeholder="Example: 7"
            />
            <div style={errorTextStyle}>{vigError}</div>
          </div>

          <div>
            <div style={labelStyle}>Stake ($)</div>
            <input
              style={inputStyle}
              value={stake}
              onChange={(e) => {
                if (!stakeTouched) setStakeTouched(true);
                setStake(e.target.value);
              }}
              onBlur={() => setStakeTouched(true)}
              placeholder="Example: 10"
            />
            <div style={errorTextStyle}>{stakeError}</div>
          </div>

          {/* Keep this slot for TOTAL odds or a helpful placeholder */}
          <div>
            {oddsMode === "TOTAL" ? (
              <>
                <div style={labelStyle}>Your Total Parlay Odds (American)</div>
                <input
                  style={inputStyle}
                  value={totalParlayOdds}
                  onChange={(e) => {
                    if (!totalTouched) setTotalTouched(true);
                    setTotalParlayOdds(e.target.value);
                  }}
                  onBlur={() => setTotalTouched(true)}
                  placeholder="Example: +320"
                />
                <div style={errorTextStyle}>{totalOddsError}</div>
              </>
            ) : (
              <>
                <div style={labelStyle}>Total Parlay Odds</div>
                <div style={{ ...inputStyle, display: "flex", alignItems: "center", opacity: 0.65 }}>
                  (Calculated from leg odds)
                </div>
                <div style={errorTextStyle} />
              </>
            )}
          </div>
        </div>

        {/* ✅ Boost BELOW the total odds area (as requested) */}
        <div style={{ marginTop: 6, maxWidth: 360 }}>
          <div style={labelStyle}>Boost % (optional)</div>
          <input
            style={inputStyle}
            value={boostPct}
            onChange={(e) => {
              if (!boostTouched) setBoostTouched(true);
              setBoostPct(e.target.value);
            }}
            onBlur={() => setBoostTouched(true)}
            placeholder="Example: 20"
          />
          <div style={errorTextStyle}>{boostError}</div>
        </div>
      </section>

      {/* LEGS (next) */}
      <section style={{ ...cardStyle, marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Legs</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
              Sharp A required. Sharp B optional. Your odds required in per-leg mode.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={clearAll} style={pillBtn()}>
              Clear All
            </button>
            <button onClick={addLeg} style={pillBtn("primary")}>
              + Add Leg
            </button>
          </div>
        </div>

        {/* Column headers */}
        <div
          className="legsHeader"
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "60px 1.15fr 1.15fr 1.15fr 1.1fr 1fr 90px",
            gap: 10,
            padding: "10px 10px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "rgba(0,0,0,0.14)",
            color: "var(--muted)",
            fontSize: 12,
          }}
        >
          <div>#</div>
          <div>Sharp Side A</div>
          <div>Sharp Side B</div>
          <div>{oddsMode === "PER_LEG" ? "Your Odds" : "Your Odds (ignored)"}</div>
          <div className="hideOnMobile">Leg True Prob</div>
          <div className="hideOnMobile">Leg Fair Odds</div>
          <div style={{ textAlign: "right" }}>Remove</div>
        </div>

        {/* Rows */}
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
          {legs.map((leg, i) => {
            const computed = calc.legsComputed[i];
            const errA = fieldError(leg, "sharpA");
            const errB = fieldError(leg, "sharpB");
            const errY = fieldError(leg, "yourOdds");

            return (
              <div
                key={i}
                className="legsRow"
                style={{
                  display: "grid",
                  gridTemplateColumns: "60px 1.15fr 1.15fr 1.15fr 1.1fr 1fr 90px",
                  gap: 10,
                  padding: "10px 10px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "rgba(255,255,255,0.03)",
                  alignItems: "start",
                }}
              >
                <div style={{ paddingTop: 10, color: "var(--muted)" }}>{i + 1}</div>

                <div>
                  <input
                    style={inputStyle}
                    value={leg.sharpA}
                    onChange={(e) => {
                      touchOnChange(i, "sharpA");
                      updateLeg(i, "sharpA", e.target.value);
                    }}
                    onBlur={() => setTouched(i, "sharpA")}
                    placeholder="Example: -110"
                  />
                  <div style={errorTextStyle}>{errA}</div>
                </div>

                <div>
                  <input
                    style={inputStyle}
                    value={leg.sharpB}
                    onChange={(e) => {
                      touchOnChange(i, "sharpB");
                      updateLeg(i, "sharpB", e.target.value);
                    }}
                    onBlur={() => setTouched(i, "sharpB")}
                    placeholder="Optional: +100"
                  />
                  <div style={errorTextStyle}>{errB}</div>
                </div>

                <div>
                  <input
                    style={{ ...inputStyle, opacity: oddsMode === "TOTAL" ? 0.6 : 1 }}
                    value={leg.yourOdds}
                    onChange={(e) => {
                      touchOnChange(i, "yourOdds");
                      updateLeg(i, "yourOdds", e.target.value);
                    }}
                    onBlur={() => setTouched(i, "yourOdds")}
                    placeholder={oddsMode === "TOTAL" ? "Ignored in TOTAL mode" : "Example: +120"}
                    disabled={oddsMode === "TOTAL"}
                  />
                  <div style={errorTextStyle}>{errY}</div>
                </div>

                <div className="hideOnMobile" style={{ paddingTop: 10 }}>
                  <div style={{ fontWeight: 800 }}>{computed?.fairProb === null ? "—" : formatPct(computed.fairProb)}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                    {computed?.usedAssumedVig ? `Assumed vig (${(assumedVigDecimal * 100).toFixed(1)}%)` : "Devig (two-sided)"}
                  </div>
                </div>

                <div className="hideOnMobile" style={{ paddingTop: 10 }}>
                  <div style={{ fontWeight: 800 }}>
                    {computed?.fairAmerican === null ? "—" : formatAmerican(computed.fairAmerican)}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Fair odds</div>
                </div>

                <div className="removeCol" style={{ textAlign: "right", paddingTop: 6, display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => removeLeg(i)}
                    style={pillBtn("danger")}
                    disabled={legs.length <= 1}
                    title={legs.length <= 1 ? "Must keep at least 1 leg" : "Remove leg"}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 14, color: "var(--muted)", fontSize: 13 }}>
          Tip: You can use this as a 1-leg calculator by removing down to one leg.
        </div>
      </section>

      {/* RESULTS (full width at bottom) */}
      <section style={{ ...cardStyle, marginTop: 14 }}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>Results</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
          <ResultTile label="True Parlay Probability" value={resultsReady ? formatPct(calc.trueProb) : "—"} />
          <ResultTile label="Fair Parlay Odds" value={resultsReady ? formatAmerican(calc.fairParlayAmerican) : "—"} />
          <ResultTile
            label="Your Parlay Odds"
            value={
              calc.yourParlayDecimal === null
                ? "—"
                : formatAmerican(probToAmerican(1 / clamp(calc.yourParlayDecimal, 1e-9, 1e9)))
            }
          />
          <ResultTile
            label="Boosted Parlay Odds"
            value={
              calc.boostedDecimal === null
                ? "—"
                : formatAmerican(probToAmerican(1 / clamp(calc.boostedDecimal, 1e-9, 1e9)))
            }
          />
          <ResultTile label="Break-even Probability" value={calc.breakEvenProb === null ? "—" : formatPct(calc.breakEvenProb)} />
          {/* ✅ replaced EV per $1 with EV $ (stake) */}
          <ResultTile
            label={`EV $ (stake: $${stakeNum ?? "—"})`}
            value={calc.evDollars === null ? "—" : formatMoney(calc.evDollars)}
            tone={calc.evDollars === null ? "neutral" : calc.evDollars >= 0 ? "good" : "bad"}
          />
          <ResultTile
            label="EV %"
            value={calc.evPct === null ? "—" : `${(calc.evPct * 100).toFixed(2)}%`}
            tone={calc.evPct === null ? "neutral" : calc.evPct >= 0 ? "good" : "bad"}
          />
          <ResultTile
            label="Status"
            value={resultsReady ? (calc.evPerDollar >= 0 ? "✅ +EV" : "❌ -EV") : "Enter inputs to calculate"}
            tone={resultsReady ? (calc.evPerDollar >= 0 ? "good" : "bad") : "neutral"}
          />
        </div>
      </section>

      <footer style={{ marginTop: 18, color: "var(--muted)", fontSize: 12 }}>
        This tool is for informational purposes only. Always double-check inputs.
      </footer>
    </main>
  );
}

function ResultTile({ label, value, tone = "neutral" }) {
  const toneStyle =
    tone === "good"
      ? { border: "1px solid rgba(34,197,94,0.35)", background: "rgba(34,197,94,0.08)" }
      : tone === "bad"
      ? { border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.08)" }
      : { border: "1px solid var(--border)", background: "rgba(0,0,0,0.14)" };

  return (
    <div style={{ padding: "12px 12px", borderRadius: 14, ...toneStyle, minHeight: 78 }}>
      <div style={{ fontSize: 12, color: "var(--muted)" }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 18, fontWeight: 900 }}>{value}</div>
    </div>
  );
}
