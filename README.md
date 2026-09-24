# IceT Play Designer

A tiny static site for hockey coaches.

- `designer/` — the Play Designer. Start from one of the five faceoff dots on our half of the ice, a situation (breakout, D-zone coverage, regroup), or **📍 Place puck** anywhere to line both teams up around it. Custom setups can be saved as named starting positions (stored on that device). Optional player names and per-position jobs.
- `play/` — what players open from the share link: pick a position, Watch, Play it, get graded. With no link it shows an example.
- `coach-guide/` — how to design and share a play, with an animated 35-second demo (`designer-demo.js`).

## How sharing works
The whole play is encoded in the link (`play/#p=…`, base64url JSON). Nothing is uploaded; there is no server or account. Saved plays and starting positions live in the browser's localStorage (`ipd-*` keys).

Link format: `{v, n:name, h:house, s:[per-step positions ×2 in ORDER], c:captions, j:jobs, m:names}` with
ORDER = G, C, LW, RW, LD, RD, OC, OLW, ORW, OD1, OD2, puck. Rink units are feet: our net at x=11, blue line 75, red line 100; view shows x 0–134.

## Publish
Double-click `push.bat`. GitHub Pages: Settings → Pages → Deploy from branch → `main` / root.
Site: https://jayalalj.github.io/IceTPlayDesigner-/
