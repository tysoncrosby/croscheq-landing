/*
 * Meta Conversions API relay.
 *
 * Receives event payloads from assets/meta-tracking.js (the browser), adds
 * server-observed client_ip_address / client_user_agent for better match
 * quality, and forwards to Meta's Graph API using an access token that is
 * stored as a Worker secret and never exposed to the browser.
 *
 * Deploy: see ../README.md
 */

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || 'https://croscheq.com';

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(allowedOrigin) });
    }

    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/events') {
      return json({ error: 'not found' }, 404, allowedOrigin);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: 'invalid json' }, 400, allowedOrigin);
    }

    const { event_name, event_id, event_time, event_source_url, custom_data, user_data, test_event_code } = body || {};
    if (!event_name || !event_id || !event_source_url) {
      return json({ error: 'missing required fields' }, 400, allowedOrigin);
    }

    const clientIp = request.headers.get('CF-Connecting-IP') || undefined;
    const clientUa = request.headers.get('User-Agent') || undefined;

    const metaPayload = {
      data: [
        {
          event_name,
          event_id,
          event_time: event_time || Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_source_url,
          user_data: {
            ...(user_data && user_data.em ? { em: [user_data.em] } : {}),
            ...(clientIp ? { client_ip_address: clientIp } : {}),
            ...(clientUa ? { client_user_agent: clientUa } : {})
          },
          custom_data: custom_data || {}
        }
      ],
      // Only ever set when a caller explicitly passes it (e.g. manual
      // verification against Meta's Test Events tool) - never sent by
      // the site's own production tracking calls.
      ...(test_event_code ? { test_event_code } : {})
    };

    const metaRes = await fetch(
      `https://graph.facebook.com/v21.0/${env.META_PIXEL_ID}/events?access_token=${env.META_CONVERSIONS_API_ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metaPayload)
      }
    );

    if (!metaRes.ok) {
      const detail = await metaRes.text();
      return json({ error: 'meta rejected event', detail }, 502, allowedOrigin);
    }

    return json({ ok: true }, 200, allowedOrigin);
  }
};

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
  });
}
