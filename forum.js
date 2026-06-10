/*
 * Venturi Community Forum
 * -----------------------
 * Shared logic for forum.html, thread.html, and login.html.
 *
 * Uses the SAME Supabase project and auth as the Venturi iOS app:
 *   - signUp() passes pilot_name in user metadata; the backend trigger
 *     handle_new_user creates the same `profiles` row the app uses,
 *     so one account works in both places.
 *   - Forum tables (forum_categories / forum_threads / forum_posts) are
 *     world-readable; writes require an authenticated session (RLS).
 *
 * Pages declare themselves via <body data-page="forum|thread|login">.
 * All user content is rendered with textContent (never innerHTML) to
 * prevent XSS.
 */

const SUPABASE_URL = 'https://crkeiitgmglbcbbyncme.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Vh1Afm2RFFeK8vM0itPF-A_tyYaR81E';

let sb = null;

async function client() {
    if (sb) return sb;
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return sb;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function displayName(user) {
    return (user?.user_metadata?.pilot_name || '').trim()
        || (user?.email || '').split('@')[0]
        || 'Pilot';
}

function initials(name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'P';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function timeAgo(iso) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s / 60);
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    const d = Math.floor(h / 24);
    if (d < 30) return d + 'd ago';
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function setMsg(node, text, type) {
    if (!node) return;
    node.textContent = text;
    node.className = 'form-msg ' + (type || '');
}

// ---------------------------------------------------------------------------
// Nav auth state (runs on every forum page)
// ---------------------------------------------------------------------------

async function renderNavAuth(session) {
    const slot = document.getElementById('navAuthSlot');
    if (!slot) return;
    slot.textContent = '';

    if (session) {
        const li1 = el('li');
        const chip = el('a', 'nav-user');
        chip.href = 'forum.html';
        const dot = el('span', 'udot');
        chip.appendChild(dot);
        chip.appendChild(document.createTextNode(displayName(session.user)));
        li1.appendChild(chip);

        const li2 = el('li');
        const out = el('a', '', 'Sign Out');
        out.href = '#';
        out.addEventListener('click', async (e) => {
            e.preventDefault();
            const c = await client();
            await c.auth.signOut();
            window.location.reload();
        });
        li2.appendChild(out);

        slot.appendChild(li1);
        slot.appendChild(li2);
    } else {
        const li = el('li');
        const a = el('a', 'nav-cta', 'Log In');
        a.href = 'login.html';
        li.appendChild(a);
        slot.appendChild(li);
    }
}

// ---------------------------------------------------------------------------
// Forum home (forum.html)
// ---------------------------------------------------------------------------

async function initForumPage(session) {
    const c = await client();
    const listEl = document.getElementById('threadList');
    const chipsEl = document.getElementById('catChips');
    const newBtn = document.getElementById('newThreadBtn');
    const composer = document.getElementById('composer');
    const composerMsg = document.getElementById('composerMsg');
    const catSelect = document.getElementById('newThreadCategory');

    let categories = [];
    let activeCat = null;

    // New-thread button: composer for members, login redirect for visitors
    newBtn.addEventListener('click', () => {
        if (!session) {
            window.location.href = 'login.html?next=forum';
            return;
        }
        composer.style.display = composer.style.display === 'block' ? 'none' : 'block';
        if (composer.style.display === 'block') {
            document.getElementById('newThreadTitle').focus();
        }
    });

    // Load categories
    const { data: cats, error: catErr } = await c
        .from('forum_categories')
        .select('id, slug, name, description, sort_order')
        .order('sort_order');

    if (catErr) {
        listEl.textContent = '';
        listEl.appendChild(el('div', 'empty', 'Could not load the forum. Please try again shortly.'));
        console.error('categories error:', catErr);
        return;
    }
    categories = cats || [];

    // Category filter chips
    const allChip = el('button', 'chip active', 'All Threads');
    allChip.addEventListener('click', () => { activeCat = null; selectChip(allChip); loadThreads(); });
    chipsEl.appendChild(allChip);
    categories.forEach((cat) => {
        const chip = el('button', 'chip', cat.name);
        chip.title = cat.description;
        chip.addEventListener('click', () => { activeCat = cat.id; selectChip(chip); loadThreads(); });
        chipsEl.appendChild(chip);

        const opt = el('option', '', cat.name);
        opt.value = cat.id;
        catSelect.appendChild(opt);
    });

    function selectChip(chip) {
        chipsEl.querySelectorAll('.chip').forEach((n) => n.classList.remove('active'));
        chip.classList.add('active');
    }

    async function loadThreads() {
        listEl.textContent = '';
        listEl.appendChild(el('div', 'empty', 'Loading threads...'));

        let q = c.from('forum_threads')
            .select('id, category_id, author_name, title, is_pinned, is_locked, reply_count, created_at, last_activity_at')
            .order('is_pinned', { ascending: false })
            .order('last_activity_at', { ascending: false })
            .limit(100);
        if (activeCat) q = q.eq('category_id', activeCat);

        const { data: threads, error } = await q;
        listEl.textContent = '';

        if (error) {
            listEl.appendChild(el('div', 'empty', 'Could not load threads. Please try again shortly.'));
            console.error('threads error:', error);
            return;
        }
        if (!threads || threads.length === 0) {
            listEl.appendChild(el('div', 'empty', 'No threads yet. Be the first to start a discussion.'));
            return;
        }

        const catName = Object.fromEntries(categories.map((x) => [x.id, x.name]));
        threads.forEach((t) => {
            const row = el('a', 'thread-row glass');
            row.href = 'thread.html?id=' + encodeURIComponent(t.id);

            const top = el('div', 't-top');
            if (t.is_pinned) top.appendChild(el('span', 't-pin', 'Pinned'));
            top.appendChild(el('span', 't-cat', catName[t.category_id] || 'General'));
            top.appendChild(el('h3', '', t.title));
            row.appendChild(top);

            const meta = el('div', 't-meta');
            const author = el('strong', '', t.author_name);
            meta.appendChild(author);
            const replies = t.reply_count === 1 ? '1 reply' : t.reply_count + ' replies';
            meta.appendChild(document.createTextNode(
                ' · ' + replies + ' · last activity ' + timeAgo(t.last_activity_at)
            ));
            row.appendChild(meta);

            listEl.appendChild(row);
        });
    }

    // New thread submit
    document.getElementById('newThreadForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('newThreadTitle').value.trim();
        const body = document.getElementById('newThreadBody').value.trim();
        const categoryId = catSelect.value;
        const submit = document.getElementById('newThreadSubmit');

        if (title.length < 3) { setMsg(composerMsg, 'Please give your thread a title (at least 3 characters).', 'error'); return; }
        if (!body) { setMsg(composerMsg, 'Please write something in the body.', 'error'); return; }

        submit.disabled = true;
        setMsg(composerMsg, 'Posting...', 'info');

        const { data: { user } } = await c.auth.getUser();
        const { data, error } = await c.from('forum_threads')
            .insert({ category_id: categoryId, author_id: user.id, title, body })
            .select('id')
            .single();

        submit.disabled = false;
        if (error) {
            setMsg(composerMsg, 'Could not post your thread. Please try again.', 'error');
            console.error('new thread error:', error);
            return;
        }
        window.location.href = 'thread.html?id=' + encodeURIComponent(data.id);
    });

    await loadThreads();
}

// ---------------------------------------------------------------------------
// Thread view (thread.html)
// ---------------------------------------------------------------------------

async function initThreadPage(session) {
    const c = await client();
    const threadId = new URLSearchParams(window.location.search).get('id');
    const titleEl = document.getElementById('threadTitle');
    const metaEl = document.getElementById('threadMeta');
    const postsEl = document.getElementById('posts');
    const replyBox = document.getElementById('replyBox');
    const signinPrompt = document.getElementById('signinPrompt');
    const replyMsg = document.getElementById('replyMsg');

    if (!threadId) { window.location.href = 'forum.html'; return; }

    const { data: thread, error: tErr } = await c
        .from('forum_threads')
        .select('id, category_id, author_id, author_name, title, body, is_locked, created_at, forum_categories(name)')
        .eq('id', threadId)
        .single();

    if (tErr || !thread) {
        titleEl.textContent = 'Thread not found';
        postsEl.appendChild(el('div', 'empty', 'This thread may have been removed.'));
        return;
    }

    document.title = thread.title + ' - Venturi Community';
    titleEl.textContent = thread.title;
    metaEl.textContent = '';
    metaEl.appendChild(el('span', 't-cat', thread.forum_categories?.name || 'General'));
    if (thread.is_locked) metaEl.appendChild(el('span', 't-pin', 'Locked'));

    function renderPost(author, authorId, body, createdAt, isOp, onDelete) {
        const card = el('article', 'post glass' + (isOp ? ' op' : ''));
        const head = el('div', 'post-head');
        const who = el('div', 'post-author');
        who.appendChild(el('div', 'avatar', initials(author)));
        const names = el('div');
        names.appendChild(el('div', 'a-name', author + (isOp ? ' (original post)' : '')));
        names.appendChild(el('div', 'a-time', timeAgo(createdAt)));
        who.appendChild(names);
        head.appendChild(who);

        if (session && session.user.id === authorId && onDelete) {
            const delBtn = el('button', 'btn-text danger', 'Delete');
            delBtn.addEventListener('click', onDelete);
            head.appendChild(delBtn);
        }

        card.appendChild(head);
        card.appendChild(el('div', 'post-body', body));
        return card;
    }

    async function loadPosts() {
        postsEl.textContent = '';
        postsEl.appendChild(renderPost(thread.author_name, thread.author_id, thread.body, thread.created_at, true,
            session && session.user.id === thread.author_id ? async () => {
                if (!confirm('Delete this entire thread and all replies?')) return;
                const { error } = await c.from('forum_threads').delete().eq('id', thread.id);
                if (!error) window.location.href = 'forum.html';
            } : null));

        const { data: posts, error } = await c
            .from('forum_posts')
            .select('id, author_id, author_name, body, created_at')
            .eq('thread_id', threadId)
            .order('created_at');

        if (error) {
            postsEl.appendChild(el('div', 'empty', 'Could not load replies.'));
            console.error('posts error:', error);
            return;
        }

        (posts || []).forEach((p) => {
            postsEl.appendChild(renderPost(p.author_name, p.author_id, p.body, p.created_at, false, async () => {
                if (!confirm('Delete this reply?')) return;
                const { error: dErr } = await c.from('forum_posts').delete().eq('id', p.id);
                if (!dErr) loadPosts();
            }));
        });
    }

    // Reply form vs sign-in prompt vs locked notice
    if (thread.is_locked) {
        signinPrompt.style.display = 'block';
        signinPrompt.querySelector('p').textContent = 'This thread is locked. No new replies can be added.';
        signinPrompt.querySelector('a').style.display = 'none';
    } else if (session) {
        replyBox.style.display = 'block';
        document.getElementById('replyForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const body = document.getElementById('replyBody').value.trim();
            const submit = document.getElementById('replySubmit');
            if (!body) { setMsg(replyMsg, 'Write a reply first.', 'error'); return; }

            submit.disabled = true;
            setMsg(replyMsg, 'Posting...', 'info');
            const { error } = await c.from('forum_posts')
                .insert({ thread_id: threadId, author_id: session.user.id, body });
            submit.disabled = false;

            if (error) {
                setMsg(replyMsg, 'Could not post your reply. Please try again.', 'error');
                console.error('reply error:', error);
                return;
            }
            document.getElementById('replyBody').value = '';
            setMsg(replyMsg, '', '');
            loadPosts();
        });
    } else {
        signinPrompt.style.display = 'block';
    }

    await loadPosts();
}

// ---------------------------------------------------------------------------
// Login / signup (login.html)
// ---------------------------------------------------------------------------

async function initLoginPage(session) {
    const c = await client();
    const msg = document.getElementById('authMsg');

    // Already signed in: bounce to the forum
    if (session && !window.location.hash.includes('type=recovery')) {
        window.location.href = 'forum.html';
        return;
    }

    const tabs = { signin: document.getElementById('tabSignin'), signup: document.getElementById('tabSignup') };
    const panels = { signin: document.getElementById('panelSignin'), signup: document.getElementById('panelSignup') };

    function showTab(which) {
        Object.keys(tabs).forEach((k) => {
            tabs[k].classList.toggle('active', k === which);
            panels[k].style.display = k === which ? 'block' : 'none';
        });
        setMsg(msg, '', '');
    }
    tabs.signin.addEventListener('click', () => showTab('signin'));
    tabs.signup.addEventListener('click', () => showTab('signup'));
    if (new URLSearchParams(window.location.search).get('mode') === 'signup') showTab('signup');

    // Password recovery flow (link from reset email lands here)
    c.auth.onAuthStateChange(async (event) => {
        if (event === 'PASSWORD_RECOVERY') {
            const newPass = prompt('Enter a new password for your Venturi account (minimum 8 characters):');
            if (newPass && newPass.length >= 8) {
                const { error } = await c.auth.updateUser({ password: newPass });
                setMsg(msg, error ? 'Could not update password. Try requesting a new reset link.' : 'Password updated. You are signed in.', error ? 'error' : 'success');
                if (!error) setTimeout(() => { window.location.href = 'forum.html'; }, 1200);
            }
        }
    });

    if (new URLSearchParams(window.location.search).get('confirmed') === '1') {
        setMsg(msg, 'Email confirmed. Sign in below to join the discussion.', 'success');
    }

    // Sign in
    document.getElementById('signinForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signinEmail').value.trim().toLowerCase();
        const password = document.getElementById('signinPassword').value;
        const btn = document.getElementById('signinSubmit');

        btn.disabled = true;
        setMsg(msg, 'Signing in...', 'info');
        const { error } = await c.auth.signInWithPassword({ email, password });
        btn.disabled = false;

        if (error) {
            const friendly = /confirm/i.test(error.message)
                ? 'Please confirm your email first. Check your inbox for the confirmation link.'
                : 'Incorrect email or password.';
            setMsg(msg, friendly, 'error');
            console.error('signin error:', error);
            return;
        }
        window.location.href = 'forum.html';
    });

    // Create account (same account as the iOS app)
    document.getElementById('signupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value.trim();
        const email = document.getElementById('signupEmail').value.trim().toLowerCase();
        const password = document.getElementById('signupPassword').value;
        const btn = document.getElementById('signupSubmit');

        if (name.length < 2) { setMsg(msg, 'Please enter your name.', 'error'); return; }
        if (password.length < 8) { setMsg(msg, 'Password must be at least 8 characters.', 'error'); return; }

        btn.disabled = true;
        setMsg(msg, 'Creating your account...', 'info');
        const { data, error } = await c.auth.signUp({
            email,
            password,
            options: {
                data: { pilot_name: name },
                emailRedirectTo: window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'login.html?confirmed=1'
            }
        });
        btn.disabled = false;

        if (error) {
            const friendly = /already registered/i.test(error.message)
                ? 'An account with this email already exists. Use the Sign In tab.'
                : 'Could not create your account. Please try again.';
            setMsg(msg, friendly, 'error');
            console.error('signup error:', error);
            return;
        }

        if (data.session) {
            // Email confirmation disabled in project settings: signed in immediately
            window.location.href = 'forum.html';
        } else {
            setMsg(msg, 'Account created. Check your email for a confirmation link, then sign in. This same login works in the Venturi app.', 'success');
        }
    });

    // Forgot password
    document.getElementById('forgotBtn').addEventListener('click', async () => {
        const email = document.getElementById('signinEmail').value.trim().toLowerCase();
        if (!email) { setMsg(msg, 'Enter your email above first, then tap Forgot Password.', 'error'); return; }
        const { error } = await c.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'login.html'
        });
        setMsg(msg, error ? 'Could not send the reset email. Please try again.' : 'Password reset email sent. Check your inbox.', error ? 'error' : 'success');
    });
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

(async function () {
    const page = document.body.dataset.page;
    const c = await client();
    const { data: { session } } = await c.auth.getSession();

    await renderNavAuth(session);

    if (page === 'forum') await initForumPage(session);
    else if (page === 'thread') await initThreadPage(session);
    else if (page === 'login') await initLoginPage(session);
})();
