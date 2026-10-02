/*
 * Shared Meta Pixel + Conversions API helper.
 *
 * Every public page loads the Meta Pixel base snippet, then this file, then
 * calls MetaTracking.pageView() (and MetaTracking.viewContent(...) on
 * content pages). Each call generates one event_id and uses it for BOTH the
 * browser Pixel call and the server-side CAPI call, so Meta can deduplicate
 * the pair instead of counting the event twice.
 *
 * CAPI_ENDPOINT points at the Cloudflare Worker that holds the Conversions
 * API access token server-side. Until that Worker is deployed and this
 * constant is updated, CAPI sends are skipped and only the browser Pixel
 * fires.
 */
(function () {
  'use strict';

  var CAPI_ENDPOINT = 'https://croscheq-capi.autumn-mouse-56a3.workers.dev/events';

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function sha256Hex(str) {
    if (!window.crypto || !crypto.subtle) return Promise.resolve(null);
    var data = new TextEncoder().encode(String(str).trim().toLowerCase());
    return crypto.subtle.digest('SHA-256', data).then(function (buf) {
      return Array.prototype.map
        .call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, '0'); })
        .join('');
    });
  }

  function sendCapi(eventName, eventId, customData, hashedEmail) {
    if (CAPI_ENDPOINT.indexOf('REPLACE_WITH') !== -1) return;
    var payload = {
      event_name: eventName,
      event_id: eventId,
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      event_source_url: window.location.href,
      custom_data: customData || {},
      user_data: hashedEmail ? { em: hashedEmail } : {}
    };
    try {
      fetch(CAPI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  function pageView() {
    var id = uuid();
    if (window.fbq) fbq('track', 'PageView', {}, { eventID: id });
    sendCapi('PageView', id, {});
  }

  function viewContent(contentName, contentCategory) {
    var id = uuid();
    var data = { content_name: contentName, content_category: contentCategory };
    if (window.fbq) fbq('track', 'ViewContent', data, { eventID: id });
    sendCapi('ViewContent', id, data);
  }

  function lead(email, eventName) {
    eventName = eventName || 'Lead';
    var id = uuid();
    var fire = function (hashedEmail) {
      if (window.fbq) fbq('track', eventName, {}, { eventID: id });
      sendCapi(eventName, id, {}, hashedEmail || null);
    };
    if (email) {
      sha256Hex(email).then(fire).catch(function () { fire(null); });
    } else {
      fire(null);
    }
  }

  window.MetaTracking = { pageView: pageView, viewContent: viewContent, lead: lead };
})();
