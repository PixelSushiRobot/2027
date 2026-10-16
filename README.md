# $2027 — The Last Tezos Token

A satirical landing page for $2027, a "Proof-of-Waiting" token on Tezos that rewards you for doing absolutely nothing until 2027. Not financial advice. We have no metals.

Static HTML, CSS and vanilla JS. No build step, no dependencies.

## Files

| File | What it does |
| --- | --- |
| `index.html` | Page markup and the three dialogs |
| `styles.css` | Page styles |
| `modals.css` | Dialog styles, responsive rules, reduced motion, print |
| `app.js` | Countdown, scroll reveals, and dialog behavior |

## Running locally

Open `index.html` in a browser. To test with a local server:

```sh
npx serve .
# or
python3 -m http.server
```

## The buttons

- **Buy $2027 / Get $2027 →** (nav + hero): Proof-of-Waiting challenge. Do nothing for 20.27 seconds; any mouse movement, click, scroll, key press or tab switch resets it. Success awards a downloadable Certificate of Inaction and a share-to-X link.
- **Read Beige Paper:** a mostly redacted whitepaper. Page 1 says "Wait." Page 2 unlocks in 2027.
- **Get $2027 →** (final CTA): a waitlist where you are always #2,027 and the progress bar never finishes.

After the deadline, all buy buttons turn red and read "Too late."

## Countdown

Counts down to **Jan 1, 2027, 00:00 UTC**, the same moment for everyone. The caption shows the local equivalent. Change `DEADLINE` at the top of `app.js` to move it.

### Testing the deadline

Append a query string to the URL:

- `?simulate=2027` jumps past the deadline
- `?simulate=15` starts 15 seconds before it, to watch the switch

## Before launch

- [ ] Add a 1200×630 `og-image.png`, uncomment the `og:image` tag in `index.html`, and set `twitter:card` to `summary_large_image`
- [ ] Re-add the Cloudflare Web Analytics snippet (removed from the test build)
- [ ] Confirm `icon.svg`, `favicon.png`, `apple-touch-icon.png` and `site.webmanifest` are deployed alongside the page
- [ ] Remove "(Test)" from the `<title>`

## Notes

- Fonts load from Google Fonts (Archivo Black, Rubik, Permanent Marker) with Arial Black / Helvetica / Marker Felt fallbacks.
- Icons are inline SVGs from [Lucide](https://lucide.dev) (ISC license).
- Respects `prefers-reduced-motion`. Content stays visible if JavaScript is disabled.

---

$2027 is satire. It is not affiliated with or endorsed by the Tezos Foundation.
