/*
 * consent.js — cookie consent for venturimx.co
 *
 * Loaded first in <head> on every page. It owns the Google Ads tag: the tag is
 * no longer hardcoded into the pages, it is injected from here once it is
 * allowed to run.
 *
 * Behaviour:
 *   - Visitors outside the EU/EEA/UK never see a banner and the Ads tag loads
 *     immediately, exactly as it did before.
 *   - Visitors inside the EU/EEA/UK get the banner and NO advertising script is
 *     fetched until they accept. Declining is sticky and loads nothing.
 *   - Google Consent Mode v2 signals are always set, so the tag knows its state
 *     the moment it does load.
 *
 * Region is detected from the browser's own timezone. No geo-IP lookup, no
 * third-party request, nothing to disclose. It is deliberately over-inclusive:
 * showing the banner to a non-EU visitor is harmless, missing an EU one is not.
 *
 * Console helpers for testing:
 *   venturiConsent.preview()  show the banner regardless of region
 *   venturiConsent.reset()    clear the stored choice and reload
 *   venturiConsent.state()    current region + stored choice
 */
(function () {
  'use strict';

  var AW_ID     = 'AW-18288850458';
  var STORE_KEY = 'venturi-cookie-consent';   // "granted" | "denied"

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;

  function readChoice() {
    try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; }
  }
  function saveChoice(v) {
    try { localStorage.setItem(STORE_KEY, v); } catch (e) { /* private mode */ }
  }

  /* EU + EEA + UK. Europe/* covers the bulk; the rest are member-state zones
     that do not sit under it (Cyprus, and the Atlantic islands of Portugal,
     Spain, Denmark and Iceland). */
  var EXTRA_ZONES = [
    'Asia/Nicosia', 'Asia/Famagusta',
    'Atlantic/Azores', 'Atlantic/Madeira', 'Atlantic/Canary',
    'Atlantic/Faroe', 'Atlantic/Reykjavik'
  ];

  function consentRequired() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (tz.indexOf('Europe/') === 0) return true;
      return EXTRA_ZONES.indexOf(tz) !== -1;
    } catch (e) {
      return true;   // cannot tell, so ask
    }
  }

  var mustAsk = consentRequired();
  var choice  = readChoice();
  var allowed = mustAsk ? (choice === 'granted') : true;

  gtag('consent', 'default', {
    ad_storage:            allowed ? 'granted' : 'denied',
    ad_user_data:          allowed ? 'granted' : 'denied',
    ad_personalization:    allowed ? 'granted' : 'denied',
    analytics_storage:     allowed ? 'granted' : 'denied',
    functionality_storage: 'granted',
    security_storage:      'granted'
  });

  var tagLoaded = false;
  function loadAdsTag() {
    if (tagLoaded) return;
    tagLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + AW_ID;
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', AW_ID);
  }

  if (allowed) loadAdsTag();

  // -------------------------------------------------------------- banner ---

  var STYLE = [
    '.vc-bar{position:fixed;left:0;right:0;bottom:0;z-index:9999;display:flex;justify-content:center;padding:16px;pointer-events:none;}',
    '.vc-card{pointer-events:auto;width:100%;max-width:760px;display:flex;align-items:center;gap:22px;',
      'background:rgba(238,248,255,0.86);backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);',
      'border:1px solid rgba(170,210,255,0.5);border-radius:20px;padding:18px 22px;',
      'box-shadow:0 12px 44px rgba(12,22,40,0.14);',
      'font-family:"Geist",-apple-system,BlinkMacSystemFont,sans-serif;color:#0C1628;',
      'transform:translateY(12px);opacity:0;transition:transform .34s cubic-bezier(.22,.68,.36,1),opacity .34s ease;}',
    '.vc-card.vc-in{transform:translateY(0);opacity:1;}',
    '.vc-copy{flex:1;min-width:0;}',
    '.vc-title{font-size:14px;font-weight:700;letter-spacing:-0.01em;margin:0 0 4px;}',
    '.vc-text{font-size:13px;line-height:1.5;color:#374060;margin:0;}',
    '.vc-text a{color:#4260FF;text-decoration:none;font-weight:600;}',
    '.vc-text a:hover{text-decoration:underline;}',
    '.vc-acts{display:flex;align-items:center;gap:10px;flex-shrink:0;}',
    '.vc-btn{font:inherit;font-size:13px;font-weight:600;border-radius:100px;padding:10px 20px;cursor:pointer;border:1px solid transparent;white-space:nowrap;transition:transform .16s ease,box-shadow .16s ease;}',
    '.vc-btn:focus-visible{outline:2px solid #4260FF;outline-offset:3px;}',
    '.vc-no{background:transparent;border-color:rgba(120,150,200,0.42);color:#374060;}',
    '.vc-no:hover{border-color:rgba(66,96,255,0.5);color:#0C1628;}',
    '.vc-yes{background:linear-gradient(135deg,#4260FF,#0EA5E9);color:#fff;box-shadow:0 0 22px rgba(66,96,255,0.26);}',
    '.vc-yes:hover{transform:translateY(-1px);box-shadow:0 0 28px rgba(66,96,255,0.38);}',
    '.vc-link{background:none;border:none;padding:0;font:inherit;font-size:13px;color:#8994B8;cursor:pointer;text-decoration:underline;}',
    '.vc-link:hover{color:#4260FF;}',
    '@media (max-width:720px){.vc-card{flex-direction:column;align-items:stretch;gap:14px;padding:18px;}',
      '.vc-acts{justify-content:stretch;}.vc-btn{flex:1;padding:12px 16px;}}',
    '@media (prefers-reduced-motion:reduce){.vc-card{transition:none;transform:none;opacity:1;}}'
  ].join('');

  var bar = null;

  function injectStyle() {
    if (document.getElementById('vc-style')) return;
    var el = document.createElement('style');
    el.id = 'vc-style';
    el.textContent = STYLE;
    document.head.appendChild(el);
  }

  function close() {
    if (!bar) return;
    var node = bar;
    bar = null;
    node.firstChild.classList.remove('vc-in');
    setTimeout(function () {
      if (node.parentNode) node.parentNode.removeChild(node);
    }, 340);
  }

  function decide(value) {
    saveChoice(value);
    if (value === 'granted') {
      gtag('consent', 'update', {
        ad_storage: 'granted', ad_user_data: 'granted',
        ad_personalization: 'granted', analytics_storage: 'granted'
      });
      loadAdsTag();
    } else {
      gtag('consent', 'update', {
        ad_storage: 'denied', ad_user_data: 'denied',
        ad_personalization: 'denied', analytics_storage: 'denied'
      });
    }
    close();
    addSettingsLink();
  }

  function show() {
    if (bar) return;
    injectStyle();

    bar = document.createElement('div');
    bar.className = 'vc-bar';
    bar.innerHTML =
      '<div class="vc-card" role="dialog" aria-label="Cookie choices">' +
        '<div class="vc-copy">' +
          '<p class="vc-title">Cookies on this site</p>' +
          '<p class="vc-text">We use cookieless analytics to count page views, which needs no permission. ' +
            'We would also like to set Google advertising cookies to measure whether our ads lead to signups. ' +
            'That part is up to you. <a href="privacy.html#cookies">Read the details</a>.</p>' +
        '</div>' +
        '<div class="vc-acts">' +
          '<button type="button" class="vc-btn vc-no">Decline</button>' +
          '<button type="button" class="vc-btn vc-yes">Accept</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(bar);
    bar.querySelector('.vc-no').addEventListener('click', function () { decide('denied'); });
    bar.querySelector('.vc-yes').addEventListener('click', function () { decide('granted'); });
    requestAnimationFrame(function () {
      if (bar) bar.firstChild.classList.add('vc-in');
    });
  }

  /* Consent has to be as easy to withdraw as it was to give, so leave a way
     back in the footer. Only for visitors who were asked in the first place. */
  function addSettingsLink() {
    if (!mustAsk || document.getElementById('vc-reopen')) return;
    var foot = document.querySelector('footer');
    if (!foot) return;
    var host = foot.querySelector('p, div') || foot;
    var btn = document.createElement('button');
    btn.id = 'vc-reopen';
    btn.type = 'button';
    btn.className = 'vc-link';
    btn.textContent = 'Cookie settings';
    btn.style.marginLeft = '10px';
    btn.addEventListener('click', function () { injectStyle(); show(); });
    host.appendChild(btn);
  }

  function boot() {
    if (mustAsk && choice === null) show();
    else addSettingsLink();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.venturiConsent = {
    preview: function () { injectStyle(); show(); },
    reset:   function () { try { localStorage.removeItem(STORE_KEY); } catch (e) {} location.reload(); },
    state:   function () {
      var tz = '';
      try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}
      return { timezone: tz, consentRequired: mustAsk, storedChoice: readChoice(), adsTagLoaded: tagLoaded };
    }
  };
})();
