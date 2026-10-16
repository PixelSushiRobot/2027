(() => {
    // One doomsday for everyone: midnight UTC, like a block timestamp
    const DEADLINE = new Date(Date.UTC(2027, 0, 1));

    // Test hook: ?simulate=2027 jumps past the deadline; ?simulate=15 starts 15 seconds before it.
    const sim = new URLSearchParams(location.search).get('simulate') ?? '';
    const offset = sim === '2027' ? DEADLINE - Date.now() + 1000
        : /^\d+$/.test(sim) ? DEADLINE - Date.now() - Number(sim) * 1000
            : 0;
    const now = () => Date.now() + offset;

    const nope = el => {
        el.classList.remove('nope');
        void el.offsetWidth;
        el.classList.add('nope');
        setTimeout(() => el.classList.remove('nope'), 450);
    };

    // ---------- Countdown + post-2027 state ----------

    let afterlife = false;
    const enterAfterlife = () => {
        if (afterlife) return;
        afterlife = true;
        document.documentElement.classList.add('is-2027');
        document.querySelector('.countdown-label').textContent = "It's 2027. Tezos may or may not still be here.";
        document.querySelector('.countdown-caption').textContent = 'Either way, we predicted something. Congratulations to all holders of nothing.';
        document.querySelectorAll('.js-acquire').forEach(btn => {
            btn.textContent = 'Too late.';
            btn.setAttribute('aria-disabled', 'true');
        });
    };

    const cd = ['cd-days', 'cd-hours', 'cd-mins', 'cd-secs'].map(id => document.getElementById(id));

    const localDoom = DEADLINE.toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    });
    document.querySelector('.countdown-caption').textContent =
        `* Assumes Tezos lasts exactly until Jan 1, 2027, 00:00 UTC (${localDoom} for you). This is generous.`;
    let cdTimer = 0;
    const tick = () => {
        const diff = DEADLINE - now();
        if (diff <= 0) {
            cd.forEach((el, i) => el.textContent = i ? '00' : '000');
            clearInterval(cdTimer);
            return enterAfterlife();
        }
        cd[0].textContent = String(Math.floor(diff / 86400000)).padStart(3, '0');
        cd[1].textContent = String(Math.floor(diff % 86400000 / 3600000)).padStart(2, '0');
        cd[2].textContent = String(Math.floor(diff % 3600000 / 60000)).padStart(2, '0');
        cd[3].textContent = String(Math.floor(diff % 60000 / 1000)).padStart(2, '0');
    };
    tick();
    if (!afterlife) cdTimer = setInterval(tick, 1000);

    // ---------- Scroll reveal ----------

    const observer = new IntersectionObserver(entries => entries.forEach(({ isIntersecting, target }) => {
        if (!isIntersecting) return;
        target.classList.add('visible');
        observer.unobserve(target);
    }), { threshold: 0.1 });
    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

    // ---------- Dialog plumbing ----------

    const dialogs = {
        pow: document.getElementById('pow'),
        paper: document.getElementById('paper'),
        waitlist: document.getElementById('waitlist'),
    };
    const hooks = {};
    let lastOpener = null;

    const showPanel = (dialog, name) => dialog.querySelectorAll('[data-panel]')
        .forEach(p => p.hidden = p.dataset.panel !== name);

    Object.entries(dialogs).forEach(([name, dialog]) => {
        dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
        dialog.addEventListener('close', () => {
            hooks[name]?.close?.();
            lastOpener?.focus();
        });
    });

    document.querySelectorAll('[data-close]').forEach(btn =>
        btn.addEventListener('click', () => btn.closest('dialog').close()));

    document.querySelectorAll('[data-action]').forEach(btn => btn.addEventListener('click', () => {
        if (afterlife && btn.classList.contains('js-acquire')) return nope(btn);
        const name = btn.dataset.action;
        lastOpener = btn;
        hooks[name]?.open?.();
        dialogs[name].showModal();
    }));

    // ---------- Proof-of-Waiting ----------

    {
        const pow = dialogs.pow;
        const $ = sel => pow.querySelector(sel);
        const stage = $('.pow-stage'), time = $('.pow-time'), fill = $('.pow-bar-fill');
        const status = $('.pow-status'), attemptsEl = $('.pow-attempts'), startBtn = $('.pow-start');
        const certTitle = $('.cert-title'), shareLink = $('.cert-share');

        const DURATION = 20270;
        const ARM_DELAY = 400;       // ignore the click that started it
        const MOVE_TOLERANCE = 12;   // px of hand tremor we forgive
        const VIOLATIONS = [
            'Inaction violated. Patience Ledger notified.',
            'You moved. The chain felt that.',
            'A true holder would not have done that.',
            'Voluntary Abstention Event revoked.',
            'Even Tezos governance moves slower than that.',
            'Please stop doing things.',
        ];
        const INPUTS = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'];

        let running = false, startT = 0, raf = 0, armTimer = 0, origin = null;
        let attempts = 0, violatedAt = 0, cert = null;

        const render = msLeft => {
            time.textContent = (msLeft / 1000).toFixed(2);
            fill.style.width = `${(1 - msLeft / DURATION) * 100}%`;
        };

        const onInput = e => {
            if (e.type === 'keydown' && e.key === 'Escape') return; // let the dialog close
            if (e.type === 'pointermove') {
                if (!origin) return void (origin = { x: e.clientX, y: e.clientY });
                if (Math.hypot(e.clientX - origin.x, e.clientY - origin.y) < MOVE_TOLERANCE) return;
            }
            violate();
        };
        const onHidden = () => { if (document.hidden) violate(); };

        const arm = () => {
            INPUTS.forEach(t => addEventListener(t, onInput, { capture: true, passive: true }));
            document.addEventListener('visibilitychange', onHidden);
            addEventListener('blur', violate);
        };
        const disarm = () => {
            clearTimeout(armTimer);
            INPUTS.forEach(t => removeEventListener(t, onInput, { capture: true }));
            document.removeEventListener('visibilitychange', onHidden);
            removeEventListener('blur', violate);
        };

        const stop = () => {
            running = false;
            cancelAnimationFrame(raf);
            disarm();
            pow.classList.remove('is-running');
        };

        const frame = t => {
            if (!running) return;
            const left = Math.min(DURATION, Math.max(0, DURATION - (t - startT)));
            render(left);
            if (left === 0) return succeed();
            raf = requestAnimationFrame(frame);
        };

        const start = e => {
            if (performance.now() - violatedAt < 500) return;
            attempts++;
            running = true;
            // Keyboard-activated clicks have no real pointer position
            origin = e.detail ? { x: e.clientX, y: e.clientY } : null;
            pow.classList.remove('is-violated');
            pow.classList.add('is-running');
            startBtn.hidden = true;
            status.textContent = 'Verifying inaction. Hands off everything.';
            stage.focus();
            startT = performance.now();
            raf = requestAnimationFrame(frame);
            armTimer = setTimeout(arm, ARM_DELAY);
        };

        const violate = () => {
            if (!running) return;
            stop();
            violatedAt = performance.now();
            render(DURATION);
            status.textContent = VIOLATIONS[(attempts - 1) % VIOLATIONS.length];
            attemptsEl.textContent = `Failed attempts: ${attempts}`;
            startBtn.textContent = 'Try doing nothing again';
            startBtn.hidden = false;
            startBtn.focus();
            pow.classList.remove('is-violated');
            void pow.offsetWidth;
            pow.classList.add('is-violated');
        };

        const succeed = () => {
            stop();
            cert = {
                serial: `VAE-${Math.random().toString(16).slice(2, 6).toUpperCase()}-2027`,
                issued: new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
                attempts: attempts === 1 ? '1 (suspiciously calm)' : String(attempts),
            };
            attempts = 0;
            document.getElementById('cert-serial').textContent = cert.serial;
            document.getElementById('cert-date').textContent = cert.issued;
            document.getElementById('cert-attempts').textContent = cert.attempts;
            const url = location.href.split(/[?#]/)[0];
            shareLink.href = 'https://x.com/intent/tweet?text=' + encodeURIComponent(
                `I did absolutely nothing for 20.27 seconds and was rewarded with nothing. Proof-of-Waiting verified. $2027 ${url}`);
            showPanel(pow, 'cert');
            certTitle.focus();
        };

        startBtn.addEventListener('click', start);
        $('.cert-download').addEventListener('click', () => cert && downloadCertificate(cert));

        hooks.pow = {
            open() {
                showPanel(pow, 'intro');
                pow.classList.remove('is-violated', 'is-running');
                render(DURATION);
                status.textContent = 'Hands off the mouse, keyboard, trackpad and tabs.';
                attemptsEl.textContent = attempts ? `Failed attempts: ${attempts}` : '';
                startBtn.textContent = "I'm ready to do nothing";
                startBtn.hidden = false;
            },
            close: stop,
        };
    }

    function downloadCertificate({ serial, issued, attempts }) {
        const c = document.createElement('canvas');
        c.width = 1200;
        c.height = 630;
        const g = c.getContext('2d');
        const display = "'Archivo Black', 'Arial Black', sans-serif";
        const body = "Rubik, 'Helvetica Neue', Arial, sans-serif";
        const fit = (text, x, y, size, family, maxW, weight = '') => {
            let s = size;
            do { g.font = `${weight} ${s}px ${family}`; s -= 2; } while (g.measureText(text).width > maxW && s > 12);
            g.fillText(text, x, y);
        };

        g.fillStyle = '#ffdc33'; g.fillRect(0, 0, 1200, 630);
        g.fillStyle = '#fff6c2'; g.fillRect(48, 48, 1104, 534);
        g.strokeStyle = '#0f0f0f';
        g.lineWidth = 10; g.strokeRect(48, 48, 1104, 534);
        g.lineWidth = 3; g.strokeRect(72, 72, 1056, 486);

        g.fillStyle = '#0f0f0f';
        g.textAlign = 'center';
        fit('PROOF-OF-WAITING™ · OFFICIAL RECORD', 600, 130, 22, body, 900, '700');
        fit('CERTIFICATE OF INACTION', 600, 222, 72, display, 960);
        fit('This certifies that one anonymous holder did absolutely nothing', 600, 290, 30, body, 960);
        fit('for 20.27 consecutive seconds.', 600, 334, 30, body, 960);
        g.fillRect(140, 378, 920, 4);

        g.textAlign = 'left';
        [['SERIAL', serial, 140], ['ISSUED', issued, 460], ['ATTEMPTS', attempts, 780]].forEach(([label, value, x]) => {
            g.fillStyle = '#555';
            fit(label, x, 428, 18, body, 280, '700');
            g.fillStyle = '#0f0f0f';
            fit(value, x, 466, 26, display, 280);
        });

        g.textAlign = 'center';
        fit('Reward: nothing, exactly as promised.  ·  $2027', 560, 530, 20, body, 560, '700');

        g.save();
        g.translate(985, 512);
        g.rotate(-0.16);
        g.globalAlpha = 0.85;
        g.strokeStyle = g.fillStyle = '#ff3535';
        g.lineWidth = 6;
        g.strokeRect(-130, -32, 260, 64);
        fit('VERIFIED IDLE', 0, 12, 32, display, 230);
        g.restore();

        c.toBlob(blob => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `2027-certificate-${serial}.png`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        });
    }

    // ---------- Beige Paper ----------

    {
        const sheet = dialogs.paper.querySelector('.paper-sheet');
        const note = dialogs.paper.querySelector('.paper-note');
        const NOPES = [
            'Page 2 unlocks January 1, 2027. Patience.',
            'Still not 2027.',
            'Clicking harder does not make 2027 arrive faster.',
            'This is the Beige Paper. All of it. For now.',
            'You have now read the Beige Paper more times than its author.',
        ];
        let clicks = 0;

        dialogs.paper.querySelector('.paper-next').addEventListener('click', () => {
            note.textContent = afterlife
                ? "It's 2027. Page 2 is also blank. We did say TBD."
                : NOPES[Math.min(clicks++, NOPES.length - 1)];
            nope(sheet);
        });

        hooks.paper = {
            open() { clicks = 0; note.textContent = ''; },
        };
    }

    // ---------- Waitlist ----------

    {
        const wl = dialogs.waitlist;
        const $ = sel => wl.querySelector(sel);
        const fill = $('.wl-fill'), pct = $('.wl-pct'), count = $('.wl-count'), note = $('.wl-note');
        const joinBtn = $('.wl-join'), pos = $('.wl-pos');
        let timers = [], joined = false, worldwide = 0;

        // Zeno's progress bar: halves the remaining distance each step, never arrives
        const setStep = n => {
            const p = n ? 100 - 100 / 2 ** n : 0;
            fill.style.width = `${p}%`;
            pct.textContent = `${p.toFixed(Math.min(Math.max(0, n - 2), 9))}%`;
        };

        joinBtn.addEventListener('click', () => {
            showPanel(wl, 'line');
            note.textContent = joined
                ? 'You rejoined the line. You are still #2,027.'
                : 'Welcome. Please do nothing while you wait.';
            joined = true;

            let n = 0;
            setStep(0);
            requestAnimationFrame(() => setStep(++n));
            timers.push(setInterval(() => { if (n < 30) setStep(++n); }, 1800));

            worldwide ||= 1900 + Math.floor(Math.random() * 120);
            count.textContent = worldwide.toLocaleString();
            timers.push(setInterval(() => {
                if (Math.random() < 0.25) {
                    worldwide--;
                    note.textContent = 'Someone checked their balance. They have been removed from the line.';
                } else {
                    worldwide += 1 + Math.floor(Math.random() * 2);
                }
                count.textContent = worldwide.toLocaleString();
            }, 3200));

            pos.focus();
        });

        hooks.waitlist = {
            open() {
                showPanel(wl, 'intro');
                joinBtn.textContent = joined ? 'Rejoin the line' : 'Join the line';
            },
            close() {
                timers.forEach(clearInterval);
                timers = [];
            },
        };
    }
})();
