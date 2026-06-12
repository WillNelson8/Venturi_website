/*
 * Venturi Premium — upgrade flow.
 *
 * Drives premium.html: the Monthly/Annual toggle, the four auth/subscription
 * states (signed out, signed-in free, signed-in premium, dormant), Stripe
 * Checkout, and the Stripe billing portal.
 *
 * While BILLING_ENABLED is false the page shows a "coming soon" state and the
 * Upgrade button is inert. Flip BILLING_ENABLED to true here AND set the
 * matching BILLING_ENABLED=true secret on the edge functions to go live.
 * See supabase/functions/_BILLING.md in the app repo.
 *
 * Reuses the same Supabase project + auth as forum.js / the iOS app, so the
 * signed-in user's account carries straight through to Stripe Checkout.
 */

const BILLING_ENABLED = true;  // live (function secret BILLING_ENABLED=true set 2026-06-12)

const SUPABASE_URL = 'https://crkeiitgmglbcbbyncme.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Vh1Afm2RFFeK8vM0itPF-A_tyYaR81E';
const CHECKOUT_FN = SUPABASE_URL + '/functions/v1/create-checkout-session';
const PORTAL_FN = SUPABASE_URL + '/functions/v1/create-portal-session';

// Pricing copy (display only — the real charge comes from the Stripe Price ids
// configured on the edge function). Keep these in sync with Stripe.
const PLANS = {
    monthly: { amount: '$40', per: '/mo', sub: 'Billed monthly. Cancel anytime.', cap: 'Billed monthly. Cancel anytime.', save: false },
    annual:  { amount: '$400', per: '/yr', sub: 'Billed annually. Cancel anytime.', cap: "That's about $33/mo, billed once a year. Save $80.", save: true },
};

let selectedPlan = 'monthly';

let sb = null;
async function client() {
    if (sb) return sb;
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return sb;
}

function setMsg(text, type) {
    const m = document.getElementById('billingMsg');
    if (!m) return;
    m.textContent = text;
    m.className = 'form-msg ' + (type || '');
}

function renderPrice() {
    const p = PLANS[selectedPlan];
    const amt = document.getElementById('premiumPrice');
    const per = document.getElementById('premiumPer');
    const sub = document.getElementById('premiumSub');
    const save = document.getElementById('savePill');
    const cap = document.getElementById('toggleCap');
    if (amt) amt.textContent = p.amount;
    if (per) per.textContent = p.per;
    if (sub) sub.textContent = p.sub;
    if (cap) cap.textContent = p.cap;
    if (save) save.style.display = p.save ? 'inline-block' : 'none';
}

function wireToggle() {
    const m = document.getElementById('tabMonthly');
    const a = document.getElementById('tabAnnual');
    if (!m || !a) return;
    function pick(plan) {
        selectedPlan = plan;
        m.classList.toggle('active', plan === 'monthly');
        a.classList.toggle('active', plan === 'annual');
        m.setAttribute('aria-selected', plan === 'monthly');
        a.setAttribute('aria-selected', plan === 'annual');
        renderPrice();
    }
    m.addEventListener('click', () => pick('monthly'));
    a.addEventListener('click', () => pick('annual'));
}

function wireFaq() {
    document.querySelectorAll('.faq-item .faq-q').forEach((q) => {
        q.addEventListener('click', () => q.closest('.faq-item').classList.toggle('open'));
    });
}

function showPremiumState(profile) {
    const btn = document.getElementById('upgradeBtn');
    const active = document.getElementById('premiumActive');
    const coming = document.getElementById('comingSoon');
    if (btn) btn.style.display = 'none';
    if (coming) coming.style.display = 'none';
    if (active) active.style.display = 'block';

    const line = document.getElementById('renewalLine');
    if (line) {
        const end = profile?.subscription_current_period_end;
        if (end) {
            const d = new Date(end);
            const nice = d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
            const canceling = profile?.subscription_status === 'canceled';
            line.textContent = canceling
                ? 'Premium is active until ' + nice + '. It will not renew.'
                : 'Renews ' + nice + '.';
        } else {
            line.textContent = 'Your subscription is active.';
        }
    }
}

async function openPortal(token) {
    const btn = document.getElementById('manageBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Opening...'; }
    try {
        const res = await fetch(PORTAL_FN, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token, 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        });
        const out = await res.json();
        if (res.ok && out.url) { window.location.href = out.url; return; }
        setMsg('Could not open the billing portal. Please email support@venturimx.co.', 'error');
    } catch (e) {
        console.error('portal error:', e);
        setMsg('Something went wrong. Please try again shortly.', 'error');
    }
    if (btn) { btn.disabled = false; btn.textContent = 'Manage billing'; }
}

async function startCheckout(c) {
    const btn = document.getElementById('upgradeBtn');
    const { data: { session: s } } = await c.auth.getSession();
    if (!s) { window.location.href = 'login.html?next=premium'; return; }

    if (btn) btn.disabled = true;
    setMsg('Redirecting to secure checkout...', 'info');
    try {
        const res = await fetch(CHECKOUT_FN, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + s.access_token,
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ plan: selectedPlan }),
        });
        const out = await res.json();
        if (res.ok && out.url) {
            window.location.href = out.url;
        } else if (out.error === 'already_premium') {
            setMsg('You already have Premium. Thank you.', 'success');
            if (btn) btn.disabled = false;
        } else {
            setMsg('Could not start checkout. Please try again, or email support@venturimx.co.', 'error');
            if (btn) btn.disabled = false;
        }
    } catch (e) {
        console.error('checkout error:', e);
        setMsg('Something went wrong. Please try again shortly.', 'error');
        if (btn) btn.disabled = false;
    }
}

(async function () {
    const btn = document.getElementById('upgradeBtn');
    const comingSoon = document.getElementById('comingSoon');

    wireToggle();
    wireFaq();
    renderPrice();

    const c = await client();
    const { data: { session } } = await c.auth.getSession();

    // Nav auth chip (mirrors forum.js so the header matches the rest of the site)
    const slot = document.getElementById('navAuthSlot');
    if (slot) {
        slot.textContent = '';
        const li = document.createElement('li');
        const a = document.createElement('a');
        if (session) {
            a.className = 'nav-user';
            const name = (session.user.user_metadata?.pilot_name || '').trim()
                || (session.user.email || '').split('@')[0] || 'Pilot';
            const dot = document.createElement('span'); dot.className = 'udot';
            a.appendChild(dot); a.appendChild(document.createTextNode(name));
            a.href = 'forum.html';
        } else {
            a.className = 'nav-cta'; a.textContent = 'Log In'; a.href = 'login.html';
        }
        li.appendChild(a); slot.appendChild(li);
    }

    // Quiet notice when the user backs out of Stripe Checkout.
    if (new URLSearchParams(window.location.search).get('canceled') === '1') {
        setMsg('Checkout canceled. You have not been charged.', 'info');
    }

    // DORMANT path: show coming-soon, keep the button inert.
    if (!BILLING_ENABLED) {
        if (comingSoon) comingSoon.style.display = 'block';
        if (btn) { btn.textContent = 'Coming Soon'; btn.disabled = true; }
        return;
    }

    // Signed out: route to login, come back to premium after.
    if (!session) {
        if (btn) {
            btn.textContent = 'Sign in to upgrade';
            btn.addEventListener('click', () => { window.location.href = 'login.html?next=premium'; });
        }
        return;
    }

    // Signed in: check current entitlement.
    const { data: profile } = await c
        .from('profiles')
        .select('subscription_tier, subscription_status, subscription_current_period_end')
        .eq('id', session.user.id)
        .single();

    if (profile?.subscription_tier === 'premium') {
        showPremiumState(profile);
        const manage = document.getElementById('manageBtn');
        if (manage) manage.addEventListener('click', () => openPortal(session.access_token));
        return;
    }

    // Signed in, free: live upgrade path.
    if (btn) btn.addEventListener('click', () => startCheckout(c));
})();
