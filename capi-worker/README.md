# CrosCheq CAPI relay

A small Cloudflare Worker that receives event payloads from the landing
site's browser-side tracking (`assets/meta-tracking.js`) and forwards them
to Meta's Conversions API. This is separate, new infrastructure — it does
not touch the static landing site repo's deploy (GitHub Pages) or the
product app's Vercel deploy.

The Meta access token lives only as a Worker secret. It is never committed
to this repo and never sent to the browser.

## Deploy

```bash
cd capi-worker
npm install -g wrangler   # if you don't already have it
wrangler login            # opens a browser to authorize your Cloudflare account
wrangler deploy
```

Then set the access token as a secret (you'll be prompted to paste it —
it is not stored in any file in this repo):

```bash
wrangler secret put META_CONVERSIONS_API_ACCESS_TOKEN
```

Get the token from Meta Events Manager → Data Sources → your pixel →
Settings → Conversions API → Generate access token.

`wrangler deploy` prints the Worker's URL, e.g.:

```
https://croscheq-capi.<your-subdomain>.workers.dev
```

## Wire it up

Open `../assets/meta-tracking.js` and replace the placeholder:

```js
var CAPI_ENDPOINT = 'https://REPLACE_WITH_YOUR_WORKER_URL.workers.dev/events';
```

with your deployed Worker URL + `/events`, then commit and push. Until this
is done, the site only sends browser-side Pixel events — CAPI sends are
silently skipped (see the guard in `pageView`/`viewContent`/`lead`... i.e.
`sendCapi()`).

## Config

`wrangler.toml` sets two non-secret vars:

- `META_PIXEL_ID` — the Pixel/dataset ID events are attributed to.
- `ALLOWED_ORIGIN` — CORS is locked to this origin so only croscheq.com can
  call the relay.

## Testing

```bash
curl -i -X POST https://croscheq-capi.<your-subdomain>.workers.dev/events \
  -H 'Content-Type: application/json' \
  -d '{
    "event_name": "PageView",
    "event_id": "test-123",
    "event_time": '"$(date +%s)"',
    "event_source_url": "https://croscheq.com/",
    "custom_data": {}
  }'
```

A `200 {"ok":true}` means Meta accepted the event. Check Events Manager →
Test Events in Meta Business Manager to see it arrive, and confirm it
shows as deduplicated once the same `event_id` also arrives via the
browser Pixel.
