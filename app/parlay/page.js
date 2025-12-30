"use client";

import React, { useMemo, useState } from "react";

function toNumber(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function americanToImpliedProb(american) {
  const a = toNumber(american);
  if (a === null || a === 0) return null;
  if (a > 0) return 100 / (a + 100);
  return Math.abs(a) / (Math.abs(a) + 100);
}

function impliedProbToAmerican(p) {
  if (!Number.isFinite(p) || p <= 0 || p >= 1) return null;
  if (p <= 0.5) return Math.round((1 - p) * 100 / p);
  return Math.round(-p * 100 / (1 - p));
}

function americanToDecimal(american) {
  const a = toNumber(american);
  if (a === null || a === 0) return null;
  if (a > 0) return 1 + a / 100;
  return 1 + 100 / Math.abs(a);
}

function decimalToAmerican(dec) {
  if (!Number.isFinite(dec) || dec <= 1) return null;
  const profit = dec - 1;
  if (profit >= 1) return Math.round(profit * 100);
  return Math.round(-100 / profit);
}

function formatAmerican(a) {
  if (a === null || a === undefined) return "—";
  const n = Number(a);
  if (!Number.isFinite(n)) return "—";
  return n > 0 ? `+${n}` : `${n}`;
}

function formatDecimalFromAmerican(a) {
  const d = americanToDecimal(a);
  if (!Number.isFinite(d)) return "—";
  // show 2 decimals like books
  return d.toFixed(2);
}

function formatPct(p) {
  if (!Number.isFinite(p)) return "—";
  return `${(p * 100).toFixed(2)}%`;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Devig logic:
 * - If Sharp A + Sharp B present: classic 2-sided normalize.
 * - If Sharp B missing: use assumed vig% as a discount to implied probability (simple + stable).
 */
function devigTrueProb(sharpA_Amer, sharpB_Amer, assumedVigPct) {
  const pA = americanToImpliedProb(sharpA_Amer);
  if (pA === null) return { p: null, note: "" };

  const pB = americanToImpliedProb(sharpB_Amer);
  if (pB !== null) {
    const total = pA + pB;
    const q = total > 0 ? pA / total : null;
    return { p: q, note: "Devig (two-sided)" };
  }

  const vig = clamp((toNumber(assumedVigPct) ?? 0) / 100, 0, 0.25);
  const q = clamp(pA * (1 - vig), 0.0001, 0.9999);
  return { p: q, note: `Assumed vig (${(vig * 100).toFixed(1)}%)` };
}

/* ---------- Odds parsing by format ---------- */

function normalizeOddsToAmerican(raw, oddsFormat) {
  const s = String(raw ?? "").trim();
  if (!s) return null;

  if (oddsFormat === "american") {
    const a = toNumber(s);
    if (a === null || a === 0) return null;
    return a;
  }

  // decimal
  const d = toNumber(s);
  if (d === null || d <= 1) return null;
  return decimalToAmerican(d);
}

function isValidOdds(raw, oddsFormat) {
  const a = normalizeOddsToAmerican(raw, oddsFormat);
  return a !== null && Number.isFinite(a) && a !== 0;
}

function ResultTile({ labelNode, value, tone = "neutral", onCopy }) {
  const klass =
    tone === "good" ? "resultTile goodGlow" :
    tone === "bad" ? "resultTile badGlow" :
    tone === "warn" ? "resultTile warnGlow" :
    "resultTile";

  return (
    <div className={klass}>
      <div className="resultLabel">
        <span>{labelNode}</span>
        {onCopy ? (
          <button className="copyMini" onClick={onCopy}>Copy</button>
        ) : null}
      </div>
      <div className="resultValue">{value}</div>
    </div>
  );
}

function InfoTooltip({ title = "Info", children }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="infoWrap">
      <button
        type="button"
        className="infoBtn"
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        aria-label={title}
      >
        i
      </button>
      {open ? (
        <div className="infoCard" onClick={(e) => e.stopPropagation()}>
          <div style={{ fontWeight: 950, marginBottom: 6 }}>{title}</div>
          <div style={{ color: "rgba(255,255,255,0.86)", lineHeight: 1.35 }}>
            {children}
          </div>
          <div style={{ marginTop: 10 }}>
            <button className="pillBtn" onClick={() => setOpen(false)}>Close</button>
          </div>
        </div>
      ) : null}
    </span>
  );
}

export default function ParlayPage() {
  const [mode, setMode] = useState("total"); // "total" | "perLeg"
  const [oddsFormat, setOddsFormat] = useState("american"); // "american" | "decimal"

  const [assumedVigPct, setAssumedVigPct] = useState("7");
  const [stake, setStake] = useState("10");
  const [totalParlayOdds, setTotalParlayOdds] = useState("");
  const [boostPct, setBoostPct] = useState("");

  const [legs, setLegs] = useState([
    { id: crypto.randomUUID(), label: "", sharpA: "", sharpB: "", yourOdds: "" },
  ]);

  const addLeg = () => {
    setLegs(prev => [
      ...prev,
      { id: crypto.randomUUID(), label: "", sharpA: "", sharpB: "", yourOdds: "" },
    ]);
  };

  const removeLeg = (id) => {
    setLegs(prev => prev.length <= 1 ? prev : prev.filter(l => l.id !== id));
  };

  const clearLegs = () => {
    setLegs([{ id: crypto.randomUUID(), label: "", sharpA: "", sharpB: "", yourOdds: "" }]);
  };

  const clearAll = () => {
    setMode("total");
    setOddsFormat("american");
    setAssumedVigPct("7");
    setStake("10");
    setTotalParlayOdds("");
    setBoostPct("");
    clearLegs();
  };

  const computed = useMemo(() => {
    const legComputed = legs.map((l) => {
      const sharpA_A = normalizeOddsToAmerican(l.sharpA, oddsFormat);
      const sharpB_A = normalizeOddsToAmerican(l.sharpB, oddsFormat);
      const your_A = normalizeOddsToAmerican(l.yourOdds, oddsFormat);

      const { p, note } = devigTrueProb(sharpA_A, sharpB_A, assumedVigPct);
      const fairA = p ? impliedProbToAmerican(p) : null;

      return {
        ...l,
        sharpA_A,
        sharpB_A,
        your_A,
        trueProb: p,
        fairOddsA: fairA,
        note,
      };
    });

    // true parlay probability = product of true probs
    const probs = legComputed.map(x => x.trueProb).filter(p => Number.isFinite(p));
    const trueParlayProb = probs.length === legComputed.length && probs.length > 0
      ? probs.reduce((acc, p) => acc * p, 1)
      : null;

    const fairParlayAmerican = trueParlayProb ? impliedProbToAmerican(trueParlayProb) : null;

    // Your parlay odds (American)
    let yourParlayAmerican = null;

    if (mode === "total") {
      yourParlayAmerican = normalizeOddsToAmerican(totalParlayOdds, oddsFormat);
    } else {
      // multiply decimals from each leg your odds (converted to American then to Decimal)
      const decs = legComputed.map(x => americanToDecimal(x.your_A));
      if (decs.every(d => Number.isFinite(d)) && decs.length > 0) {
        const totalDec = decs.reduce((acc, d) => acc * d, 1);
        yourParlayAmerican = decimalToAmerican(totalDec);
      }
    }

    const boost = clamp((toNumber(boostPct) ?? 0) / 100, 0, 10);
    const boostedAmerican = (yourParlayAmerican !== null && Number.isFinite(yourParlayAmerican) && boost > 0)
      ? (() => {
          const dec = americanToDecimal(yourParlayAmerican);
          if (!dec) return null;
          const boostedDec = 1 + (dec - 1) * (1 + boost);
          return decimalToAmerican(boostedDec);
        })()
      : yourParlayAmerican;

    const breakEvenProb = (boostedAmerican !== null && Number.isFinite(boostedAmerican))
      ? americanToImpliedProb(boostedAmerican)
      : null;

    // EV: stake * (p * payout - (1-p))
    const st = clamp(toNumber(stake) ?? 0, 0, 1_000_000);
    let evDollar = null;
    let evPct = null;
    if (Number.isFinite(trueParlayProb) && boostedAmerican !== null && Number.isFinite(boostedAmerican) && st > 0) {
      const dec = americanToDecimal(boostedAmerican);
      if (dec) {
        const expected = trueParlayProb * (st * (dec - 1)) - (1 - trueParlayProb) * st;
        evDollar = expected;
        evPct = (expected / st) * 100;
      }
    }

    const status =
      evPct === null ? "Enter inputs to calculate" :
      evPct > 0 ? "+EV" :
      evPct < 0 ? "-EV" : "Neutral";

    return {
      legComputed,
      trueParlayProb,
      fairParlayAmerican,
      yourParlayAmerican,
      boostedAmerican,
      breakEvenProb,
      evDollar,
      evPct,
      status,
    };
  }, [legs, assumedVigPct, mode, totalParlayOdds, boostPct, stake, oddsFormat]);

  /* ---------- Validation ---------- */

  const validation = useMemo(() => {
    const legErrors = computed.legComputed.map((l) => {
      const sharpAOk = isValidOdds(l.sharpA, oddsFormat);
      const sharpBOk = !String(l.sharpB ?? "").trim() ? true : isValidOdds(l.sharpB, oddsFormat);

      const yourReq = mode === "perLeg";
      const yourOk = !yourReq ? true : isValidOdds(l.yourOdds, oddsFormat);

      return {
        sharpAOk,
        sharpBOk,
        yourOk,
      };
    });

    const totalOk = mode !== "total" ? true : isValidOdds(totalParlayOdds, oddsFormat);

    const anyMissingSharpA = legErrors.some(e => !e.sharpAOk);
    const anyBadSharpB = legErrors.some(e => !e.sharpBOk);
    const anyMissingYour = legErrors.some(e => !e.yourOk);

    return {
      legErrors,
      totalOk,
      anyMissingSharpA,
      anyBadSharpB,
      anyMissingYour,
    };
  }, [computed.legComputed, oddsFormat, mode, totalParlayOdds]);

  /* ---------- Copy helpers ---------- */

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  };

  const formatOdds = (americanVal) => {
    if (oddsFormat === "american") return formatAmerican(americanVal);
    return formatDecimalFromAmerican(americanVal);
  };

  const copySummary = () => {
    const lines = [
      `EV Parlay Builder`,
      `Mode: ${mode === "total" ? "Total parlay odds" : "Per-leg your odds"}`,
      `Odds format: ${oddsFormat === "american" ? "American" : "Decimal"}`,
      `Assumed vig (if Sharp B missing): ${assumedVigPct || "—"}%`,
      `Stake: $${stake || "—"}`,
      `Boost: ${boostPct || "0"}%`,
      ``,
      `True Parlay Probability: ${formatPct(computed.trueParlayProb)}`,
      `Fair Parlay Odds: ${formatOdds(computed.fairParlayAmerican)}`,
      `Your Parlay Odds: ${formatOdds(computed.yourParlayAmerican)}`,
      `Boosted Parlay Odds: ${formatOdds(computed.boostedAmerican)}`,
      `Break-even Probability: ${formatPct(computed.breakEvenProb)}`,
      `EV $: ${computed.evDollar === null ? "—" : `$${computed.evDollar.toFixed(2)}`}`,
      `EV %: ${computed.evPct === null ? "—" : `${computed.evPct.toFixed(2)}%`}`,
      `Status: ${computed.status}`,
    ];
    copyText(lines.join("\n"));
  };

  const placeholderOdds = oddsFormat === "american" ? "Example: -160" : "Example: 1.91";
  const placeholderYour = oddsFormat === "american" ? "Example: +110" : "Example: 2.10";
  const placeholderTotal = oddsFormat === "american" ? "Example: +300" : "Example: 4.00";

  return (
    <div
      className="containerMax"
      onClick={() => { /* click-away closes tooltips (they stopPropagation internally) */ }}
    >
      <div className="topBar">
        <div className="titleBlock">
          <h1>EV Parlay Builder</h1>
          <p>Devig vs sharp odds → true probability → compare to your odds (with optional boost)</p>
        </div>

        <div className="topButtons">
          <button className="pillBtn" onClick={copySummary}>Copy Results</button>
          <button className="pillBtn" onClick={() => copyText(window.location.href)}>Copy Share Link</button>
          <button className="primaryBtn" onClick={clearAll}>Clear All</button>
        </div>
      </div>

      <div className="banner">
        <b>Required:</b> each leg needs Sharp Side A. Your odds are required in <b>PER-LEG</b> mode, or Total Parlay Odds in <b>TOTAL</b> mode. Sharp Side B is optional (we’ll assume the vig % if missing).
      </div>

      {/* INPUTS */}
      <div className="card">
        <div className="cardTitleRow">
          <div>
            <div className="cardTitleRow" style={{ marginBottom: 0 }}>
              <h2 className="cardTitle">Inputs</h2>
              <InfoTooltip title="What are “sharp books”?" >
                “Sharp books” are books/exchanges whose prices are generally closer to the true market probability
                (tighter lines, higher limits). You’re using their odds to estimate a “fair” probability, then comparing
                your bet price to that fair probability.
              </InfoTooltip>
            </div>
            <div className="smallNote">Set assumptions once, then build legs below.</div>
          </div>

          <div className="modeTabs">
            <button
              className={`modeTab ${mode === "perLeg" ? "modeTabActive" : ""}`}
              onClick={() => setMode("perLeg")}
            >
              Per-leg your odds
            </button>
            <button
              className={`modeTab ${mode === "total" ? "modeTabActive" : ""}`}
              onClick={() => setMode("total")}
            >
              Total parlay odds
            </button>

            <div className="toggleWrap">
              <div className="toggleLabel">Odds format</div>
              <div className="toggleBtns">
                <button
                  className={`toggleBtn ${oddsFormat === "american" ? "toggleBtnActive" : ""}`}
                  onClick={() => setOddsFormat("american")}
                  type="button"
                >
                  American
                </button>
                <button
                  className={`toggleBtn ${oddsFormat === "decimal" ? "toggleBtnActive" : ""}`}
                  onClick={() => setOddsFormat("decimal")}
                  type="button"
                >
                  Decimal
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid3">
          <div>
            <div className="label">Assumed Vig % (if Sharp B missing)</div>
            <input
              className="input"
              value={assumedVigPct}
              onChange={(e) => setAssumedVigPct(e.target.value)}
              placeholder="7"
            />
            <div className="hint">Used only when Sharp B is blank.</div>
          </div>

          <div>
            <div className="label">Stake ($)</div>
            <input
              className="input"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              placeholder="10"
            />
            <div className="hint">EV $ is computed for this stake.</div>
          </div>

          <div>
            <div className="label">Your Total Parlay Odds ({oddsFormat === "american" ? "American" : "Decimal"})</div>
            <input
              className={`input ${mode !== "total" ? "inputDisabled" : ""} ${mode === "total" && !validation.totalOk && String(totalParlayOdds || "").trim() ? "inputInvalid" : ""}`}
              value={totalParlayOdds}
              onChange={(e) => setTotalParlayOdds(e.target.value)}
              placeholder={placeholderTotal}
              disabled={mode !== "total"}
            />
            {mode === "total" && String(totalParlayOdds || "").trim() && !validation.totalOk ? (
              <div className="hint hintError">Enter a valid total odds value.</div>
            ) : (
              <div className="hint">{mode === "total" ? "Required in TOTAL mode." : "Ignored in PER-LEG mode."}</div>
            )}
          </div>
        </div>

        <div className="sectionSpacer" />

        <div className="grid2">
          <div>
            <div className="label">Boost % (optional)</div>
            <input
              className="input"
              value={boostPct}
              onChange={(e) => setBoostPct(e.target.value)}
              placeholder="Example: 20"
            />
            <div className="hint">Applies to your payout (profit portion).</div>
          </div>
          <div />
        </div>
      </div>

      <div className="sectionSpacer" />

      {/* LEGS */}
      <div className="card">
        <div className="cardTitleRow">
          <div>
            <h2 className="cardTitle">Legs</h2>
            <div className="smallNote">
              Sharp A required. Sharp B optional. Your odds required in per-leg mode. Label is optional.
            </div>

            {(validation.anyMissingSharpA || validation.anyBadSharpB || validation.anyMissingYour) ? (
              <div className="hint hintWarn" style={{ marginTop: 8 }}>
                Heads up: some inputs are missing/invalid — results may show “—” until fixed.
              </div>
            ) : null}
          </div>

          <div className="topButtons">
            <button className="pillBtn" onClick={clearLegs}>Clear Legs</button>
            <button className="primaryBtn" onClick={addLeg}>+ Add Leg</button>
          </div>
        </div>

        {/* Desktop header row */}
        <div className="legsHeaderRow">
          <div>#</div>
          <div>Label</div>
          <div>Sharp Side A</div>
          <div>Sharp Side B</div>
          <div>Your Odds {mode === "total" ? "(ignored)" : ""}</div>
          <div>Leg True Prob</div>
          <div>Leg Fair Odds</div>
          <div>Remove</div>
        </div>

        {computed.legComputed.map((l, idx) => {
          const canEditYourOdds = mode === "perLeg";
          const fairTxt = formatOdds(l.fairOddsA);
          const trueTxt = l.trueProb === null ? "—" : formatPct(l.trueProb);

          const errs = validation.legErrors[idx] ?? { sharpAOk: true, sharpBOk: true, yourOk: true };

          return (
            <div key={l.id} className="legRow">
              <div className="legRowGrid">
                <div className="legNum">{idx + 1}</div>

                {/* Label */}
                <div>
                  <div className="label">Label</div>
                  <input
                    className="input"
                    value={l.label}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLegs(prev => prev.map(x => x.id === l.id ? { ...x, label: v } : x));
                    }}
                    placeholder="Optional (e.g., Knicks ML)"
                  />
                  <div className="hint">Optional. For your own tracking.</div>
                </div>

                {/* On mobile we still render in this grid; CSS collapses to stacked */}
                <div className="legMobileInputs2">
                  <div>
                    <div className="label">Sharp A</div>
                    <input
                      className={`input ${!errs.sharpAOk && String(l.sharpA || "").trim() ? "inputInvalid" : ""}`}
                      value={l.sharpA}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLegs(prev => prev.map(x => x.id === l.id ? { ...x, sharpA: v } : x));
                      }}
                      placeholder={placeholderOdds}
                    />
                    {!errs.sharpAOk && String(l.sharpA || "").trim() ? (
                      <div className="hint hintError">Invalid odds.</div>
                    ) : (
                      <div className="hint">Required.</div>
                    )}
                  </div>

                  <div>
                    <div className="label">Sharp B (optional)</div>
                    <input
                      className={`input ${!errs.sharpBOk ? "inputInvalid" : ""}`}
                      value={l.sharpB}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLegs(prev => prev.map(x => x.id === l.id ? { ...x, sharpB: v } : x));
                      }}
                      placeholder={placeholderOdds}
                    />
                    {!errs.sharpBOk ? (
                      <div className="hint hintError">Invalid odds (or leave blank).</div>
                    ) : (
                      <div className="hint">Optional.</div>
                    )}
                  </div>
                </div>

                <div className="legMobileInputs1">
                  <div>
                    <div className="label">Your Odds {mode === "total" ? "(ignored)" : ""}</div>
                    <input
                      className={`input ${!canEditYourOdds ? "inputDisabled" : ""} ${canEditYourOdds && !errs.yourOk && String(l.yourOdds || "").trim() ? "inputInvalid" : ""}`}
                      value={l.yourOdds}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLegs(prev => prev.map(x => x.id === l.id ? { ...x, yourOdds: v } : x));
                      }}
                      placeholder={mode === "total" ? "Ignored in TOTAL mode" : placeholderYour}
                      disabled={!canEditYourOdds}
                    />
                    {canEditYourOdds ? (
                      (!errs.yourOk && String(l.yourOdds || "").trim()
                        ? <div className="hint hintError">Invalid odds.</div>
                        : <div className="hint">Required in PER-LEG mode.</div>
                      )
                    ) : (
                      <div className="hint">Ignored in TOTAL mode.</div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="metricBig">{trueTxt}</div>
                  <div className="metricSub">{l.note || ""}</div>
                </div>

                <div>
                  <div className="metricBig">{fairTxt}</div>
                  <div className="metricSub">Fair odds</div>
                </div>

                <div>
                  <button className="removeBtn" onClick={() => removeLeg(l.id)}>Remove</button>
                </div>
              </div>
            </div>
          );
        })}

        <div className="tipRow">
          Tip: You can use this as a 1-leg calculator by removing down to one leg.
        </div>
      </div>

      <div className="sectionSpacer" />

      {/* RESULTS (below legs) */}
      <div className="card">
        <div className="cardTitleRow">
          <h2 className="cardTitle">Results</h2>
          <button className="pillBtn" onClick={copySummary}>Copy All</button>
        </div>

        <div className="resultsGrid">
          <ResultTile
            labelNode="True Parlay Probability"
            value={formatPct(computed.trueParlayProb)}
            onCopy={() => copyText(formatPct(computed.trueParlayProb))}
          />
          <ResultTile
            labelNode={`Fair Parlay Odds (${oddsFormat === "american" ? "American" : "Decimal"})`}
            value={formatOdds(computed.fairParlayAmerican)}
            onCopy={() => copyText(formatOdds(computed.fairParlayAmerican))}
          />
          <ResultTile
            labelNode={`Your Parlay Odds (${oddsFormat === "american" ? "American" : "Decimal"})`}
            value={formatOdds(computed.yourParlayAmerican)}
            onCopy={() => copyText(formatOdds(computed.yourParlayAmerican))}
          />
          <ResultTile
            labelNode={`Boosted Parlay Odds (${oddsFormat === "american" ? "American" : "Decimal"})`}
            value={formatOdds(computed.boostedAmerican)}
            onCopy={() => copyText(formatOdds(computed.boostedAmerican))}
          />

          <ResultTile
            labelNode={
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                Break-even Probability
                <InfoTooltip title="Break-even probability">
                  This is the minimum win probability needed for your bet price (including boost) to have EV = 0.
                  <br /><br />
                  If your “True Parlay Probability” is higher than break-even, the bet is +EV.
                </InfoTooltip>
              </span>
            }
            value={formatPct(computed.breakEvenProb)}
            onCopy={() => copyText(formatPct(computed.breakEvenProb))}
          />

          <ResultTile
            labelNode={`EV $ (stake: $${stake || "—"})`}
            value={computed.evDollar === null ? "—" : `$${computed.evDollar.toFixed(2)}`}
            tone={computed.evDollar !== null && computed.evDollar > 0 ? "good" : computed.evDollar !== null && computed.evDollar < 0 ? "bad" : "neutral"}
            onCopy={() => copyText(computed.evDollar === null ? "—" : `$${computed.evDollar.toFixed(2)}`)}
          />

          <ResultTile
            labelNode="EV %"
            value={computed.evPct === null ? "—" : `${computed.evPct.toFixed(2)}%`}
            tone={computed.evPct !== null && computed.evPct > 0 ? "good" : computed.evPct !== null && computed.evPct < 0 ? "bad" : "neutral"}
            onCopy={() => copyText(computed.evPct === null ? "—" : `${computed.evPct.toFixed(2)}%`)}
          />

          <ResultTile
            labelNode="Status"
            value={computed.status}
            tone={computed.status === "+EV" ? "good" : computed.status === "-EV" ? "bad" : computed.status === "Enter inputs to calculate" ? "warn" : "neutral"}
            onCopy={() => copyText(computed.status)}
          />
        </div>

        <div className="tipRow" style={{ marginTop: 14 }}>
          This tool is for informational purposes only. Always double-check inputs.
        </div>
      </div>
    </div>
  );
}
