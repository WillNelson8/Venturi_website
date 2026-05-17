/*
 * Venturi Early Access Signup
 * ---------------------------
 * Connects the landing-page email form to Supabase.
 * Captured emails are inserted into the `early_access_emails` table.
 *
 * MODES:
 *   1. PREVIEW MODE (default) — form works visually without storing anywhere.
 *      Useful for local development before Supabase credentials are added.
 *   2. SUPABASE MODE — emails are written to your Supabase project.
 *
 * TO ENABLE SUPABASE MODE:
 *   1. Set SUPABASE_URL and SUPABASE_ANON_KEY below with your project values.
 *   2. Set USE_SUPABASE to true.
 *   3. In Supabase, make sure the `early_access_emails` table exists with at
 *      minimum the columns:
 *        - id           uuid  (primary key, default: gen_random_uuid())
 *        - email        text  (not null, unique)
 *        - created_at   timestamptz (default: now())
 *   4. Enable Row Level Security (RLS) on the table.
 *   5. Add this policy (allows public INSERT, never SELECT/UPDATE/DELETE):
 *
 *        create policy "Allow public early access inserts"
 *        on early_access_emails for insert
 *        to anon
 *        with check (true);
 *
 * The anon public key is safe to expose in frontend code as long as RLS is
 * properly configured. Never expose the service_role key.
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const USE_SUPABASE = false;  // set to true once Supabase credentials are filled in

const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';            // e.g. https://abc123.supabase.co
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';  // the public anon key

// ============================================================================
// FORM HANDLING
// ============================================================================

(function () {
    const form = document.getElementById('signupForm');
    const emailInput = document.getElementById('signupEmail');
    const submitButton = document.getElementById('signupSubmit');
    const messageEl = document.getElementById('signupMessage');

    if (!form || !emailInput || !submitButton || !messageEl) return;

    let supabaseClient = null;

    async function loadSupabase() {
        if (supabaseClient) return supabaseClient;
        if (!USE_SUPABASE) return null;

        const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return supabaseClient;
    }

    function setMessage(text, type) {
        messageEl.textContent = text;
        messageEl.className = 'signup-message ' + (type || '');
    }

    function setLoading(loading) {
        submitButton.disabled = loading;
        submitButton.textContent = loading ? 'Sending…' : 'Get Early Access';
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    async function handleSubmit(event) {
        event.preventDefault();
        const email = emailInput.value.trim().toLowerCase();

        if (!isValidEmail(email)) {
            setMessage('Please enter a valid email address.', 'error');
            return;
        }

        setLoading(true);
        setMessage('', '');

        try {
            if (USE_SUPABASE) {
                const client = await loadSupabase();
                const { error } = await client
                    .from('early_access_emails')
                    .insert([{ email: email }]);

                if (error) {
                    // Friendly handling of duplicate email (unique violation)
                    if (error.code === '23505') {
                        setMessage("You're already on the list. We'll be in touch.", 'success');
                        form.reset();
                    } else {
                        throw error;
                    }
                } else {
                    setMessage("You're on the list. We'll be in touch shortly.", 'success');
                    form.reset();
                }
            } else {
                // Preview mode — simulate success without storing
                await new Promise(resolve => setTimeout(resolve, 400));
                console.log('[Venturi preview mode] Email captured:', email);
                setMessage("You're on the list. We'll be in touch shortly.", 'success');
                form.reset();
            }
        } catch (err) {
            console.error('Signup error:', err);
            setMessage('Something went wrong. Please try again, or email support@venturimx.co.', 'error');
        } finally {
            setLoading(false);
        }
    }

    form.addEventListener('submit', handleSubmit);
})();
