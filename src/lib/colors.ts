/**
 * oklch-based theme color palette for D3 charts.
 *
 * oklch(L% C H)
 *   L = lightness  (0=black, 100=white)
 *   C = chroma     (0=gray, higher=colorful; keep ≤0.20 to avoid neon)
 *   H = hue angle  (0-360)
 *
 * Pattern: in dark mode use high L (bright text on dark bg),
 *          in light mode use low L (dark text on light bg).
 */
export function themeColors(isDark: boolean) {
    const d = isDark
    return {
        // ── Neutrals ──────────────────────────────────────────────────────
        text: d ? 'oklch(92% 0 0)' : 'oklch(18% 0 0)',
        textMuted: d ? 'oklch(63% 0 0)' : 'oklch(40% 0 0)',
        textDim: d ? 'oklch(44% 0 0)' : 'oklch(55% 0 0)',
        border: d ? 'oklch(30% 0 0)' : 'oklch(82% 0 0)',
        link: d ? 'oklch(32% 0 0)' : 'oklch(80% 0 0)',
        bg: d ? 'oklch(16% 0 0)' : 'oklch(99% 0 0)',
        bgCard: d ? 'oklch(22% 0 0)' : 'oklch(96% 0 0)',

        // ── Blue  H≈250 ──────────────────────────────────────────────────
        blueFill: d ? 'oklch(22% 0.06 250)' : 'oklch(93% 0.04 250)',
        blueStroke: d ? 'oklch(62% 0.20 250)' : 'oklch(50% 0.22 250)',
        blueText: d ? 'oklch(76% 0.15 250)' : 'oklch(38% 0.20 250)',

        // ── Indigo  H≈270 ────────────────────────────────────────────────
        indigoFill: d ? 'oklch(20% 0.06 270)' : 'oklch(93% 0.04 270)',
        indigoStroke: d ? 'oklch(60% 0.20 270)' : 'oklch(50% 0.22 270)',
        indigoText: d ? 'oklch(76% 0.16 270)' : 'oklch(38% 0.20 270)',

        // ── Purple  H≈295 ────────────────────────────────────────────────
        purpleFill: d ? 'oklch(20% 0.06 295)' : 'oklch(93% 0.04 295)',
        purpleStroke: d ? 'oklch(60% 0.20 295)' : 'oklch(50% 0.22 295)',
        purpleText: d ? 'oklch(76% 0.16 295)' : 'oklch(38% 0.20 295)',

        // ── Pink/Fuchsia  H≈320 ──────────────────────────────────────────
        pinkFill: d ? 'oklch(20% 0.06 320)' : 'oklch(93% 0.04 320)',
        pinkStroke: d ? 'oklch(62% 0.20 320)' : 'oklch(50% 0.22 320)',
        pinkText: d ? 'oklch(76% 0.16 320)' : 'oklch(38% 0.20 320)',

        // ── Red  H≈25 ────────────────────────────────────────────────────
        redFill: d ? 'oklch(20% 0.06 25)' : 'oklch(94% 0.04 25)',
        redStroke: d ? 'oklch(60% 0.22 25)' : 'oklch(48% 0.24 25)',
        redText: d ? 'oklch(74% 0.16 25)' : 'oklch(36% 0.20 25)',

        // ── Amber/Orange  H≈65 ───────────────────────────────────────────
        amberFill: d ? 'oklch(22% 0.05 65)' : 'oklch(94% 0.04 65)',
        amberStroke: d ? 'oklch(70% 0.16 65)' : 'oklch(52% 0.20 65)',
        amberText: d ? 'oklch(80% 0.14 65)' : 'oklch(40% 0.18 65)',

        // ── Green  H≈145 ─────────────────────────────────────────────────
        greenFill: d ? 'oklch(20% 0.06 145)' : 'oklch(93% 0.04 145)',
        greenStroke: d ? 'oklch(58% 0.18 145)' : 'oklch(46% 0.20 145)',
        greenText: d ? 'oklch(75% 0.15 145)' : 'oklch(36% 0.18 145)',

        // ── Cyan  H≈200 ──────────────────────────────────────────────────
        cyanFill: d ? 'oklch(20% 0.05 200)' : 'oklch(93% 0.04 200)',
        cyanStroke: d ? 'oklch(65% 0.16 200)' : 'oklch(46% 0.18 200)',
        cyanText: d ? 'oklch(78% 0.14 200)' : 'oklch(36% 0.18 200)',
    }
}
