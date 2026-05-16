(() => {
    function getServerUrls() {
        const isProd = window.location.hostname === 'voxity.dev';
        const host = isProd ? 'remote.voxity.dev' : 'localhost:3000';
        return {
            host,
            http: `${isProd ? 'https' : 'http'}://${host}`,
            ws: `${isProd ? 'wss' : 'ws'}://${host}`,
        };
    }

    const state = {
        socket: null,
        pin: null,
        status: 'disconnected',
        lastError: '',
        controlModal: null,
        joinModal: null,
        disclaimerModal: null,
        stateInterval: null,
        listenersBound: false,
        manualDisconnect: false,
    };

    const REMOTE_ACCEPT_KEY = 'acceptedRemote';

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function send(payload) {
        if (state.socket?.readyState === WebSocket.OPEN)
            state.socket.send(JSON.stringify(payload));
    }

    function closeModal(modal) {
        if (!modal) return;
        try { modal.close(); } catch {
            try { modal.overlay?.dispatchEvent(new CustomEvent('voxity:modal-close')); } catch { }
        }
    }

    function closeJoinModal() {
        closeModal(state.joinModal);
        state.joinModal = null;
    }

    function ensureRemoteAcceptanceKey() {
        if (localStorage.getItem(REMOTE_ACCEPT_KEY) == null) {
            localStorage.setItem(REMOTE_ACCEPT_KEY, '0');
        }
    }

    function hasAcceptedRemoteDisclaimer() {
        ensureRemoteAcceptanceKey();
        return localStorage.getItem(REMOTE_ACCEPT_KEY) !== '0';
    }

    const COMMANDS = {
        play_pause: 'plps',
        previous: 'prevtrack',
        next: 'nexttrack',
        forward10: 'fwd',
        reverse10: 'rwd',
        shuffle: 'shuffle',
        loop: 'loop',
    };

    function clickForCommand(command) {
        document.getElementById(COMMANDS[command])?.click();
    }

    function getPlaybackState() {
        const player = document.getElementById('player');
        return {
            title: document.getElementById('np2')?.textContent || '',
            artist: document.getElementById('artist')?.textContent || '',
            paused: player ? !!player.paused : true,
            currentTime: player ? Number(player.currentTime || 0) : 0,
            duration: player ? Number(player.duration || 0) : 0,
            volume: player ? Number(player.volume || 0) : 0,
            loop: player ? !!player.loop : false,
        };
    }

    function pushStateUpdate() {
        send({ type: 'state_update', state: getPlaybackState() });
    }

    function attachPlaybackListeners() {
        if (state.listenersBound) return;
        const player = document.getElementById('player');
        if (!player) return;

        for (const event of ['play', 'pause', 'seeked', 'volumechange', 'ratechange', 'loadedmetadata', 'ended'])
            player.addEventListener(event, pushStateUpdate);

        state.listenersBound = true;
    }

    function clearSessionRuntime() {
        clearInterval(state.stateInterval);
        state.stateInterval = null;
    }

    const STATUS_DISPLAY = {
        connected: { text: 'Connected', color: '#22c55e' },
        connecting: { text: 'Connecting...', color: '#f59e0b' },
        error: { text: 'Error', color: '#ef4444' },
        disconnected: { text: 'Disconnected', color: null },
    };

    function getRemoteTrigger() {
        return (typeof elements !== 'undefined' && elements.remoteSession)
            ? elements.remoteSession
            : document.getElementById('remote_session');
    }

    function updateRemoteButtonStatusColor() {
        const trigger = getRemoteTrigger();
        if (!trigger) return;

        if (state.status === 'disconnected') {
            trigger.style.color = '';
            return;
        }

        trigger.style.color = STATUS_DISPLAY[state.status]?.color || '';
    }

    function setStatus(status, error = '') {
        state.status = status;
        state.lastError = error;
        updateRemoteButtonStatusColor();
        renderControlModal();
    }

    function controlModalHtml() {
        const { host } = getServerUrls();
        const { text, color } = STATUS_DISPLAY[state.status] ?? STATUS_DISPLAY.disconnected;
        const canConnect = state.status === 'disconnected' || state.status === 'error';
        const canDisconnect = state.status === 'connecting' || state.status === 'connected';

        return `
            <div style="gap:0.9rem; text-align:left;">
                <strong style="color:${color};">${text}</strong>
                ${state.lastError ? `<p style="margin:0; color:#ef4444;">${escapeHtml(state.lastError)}</p>` : ''}
                <div style="padding:0.75rem; border-radius:10px; background:var(--btn-bg); text-align:center;">
                    <div style="font-size:0.85rem; opacity:0.85;">Session PIN</div>
                    <div style="font-family:monospace; font-size:1.85rem; letter-spacing:0.12em; margin-top:0.2rem;">
                        ${state.pin ? escapeHtml(state.pin) : '-------'}
                    </div>
                </div><br>
                <div style="display:flex; gap:0.6rem; flex-wrap:wrap;">
                    ${canConnect ? '<button id="remote-connect-btn" class="bu">Start session</button>' : ''}
                    ${canDisconnect ? '<button id="remote-disconnect-btn" class="bu">Disconnect session</button>' : ''}
                    ${state.pin ? '<button id="remote-copy-pin-btn" class="bu">Copy PIN</button>' : ''}
                    <button class="bu" onclick="window.open('https://${host}', '_blank')">Open remote <i class="fa-solid fa-arrow-down fa-rotate-by" style="--fa-rotate-angle: 220deg;"></i></button>
                </div>
            </div>
        `;
    }

    function bindControlModalButtons() {
        document.getElementById('remote-connect-btn')
            ?.addEventListener('click', startSession);

        document.getElementById('remote-disconnect-btn')
            ?.addEventListener('click', disconnectSession);

        const copyBtn = document.getElementById('remote-copy-pin-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', async () => {
                if (!state.pin) return;
                const original = copyBtn.textContent;
                try {
                    await navigator.clipboard.writeText(state.pin);
                    copyBtn.textContent = 'Copied';
                } catch {
                    copyBtn.textContent = 'Copy failed';
                }
                setTimeout(() => { copyBtn.textContent = original; }, 1200);
            });
        }
    }

    function renderControlModal() {
        if (!state.controlModal?.overlay?.isConnected) return;
        state.controlModal.setContent(controlModalHtml());
        state.controlModal.setTitle(state.pin ? `Remote (connected: ${state.pin})` : 'Remote');
        bindControlModalButtons();
    }

    async function showJoinRequestPrompt() {
        if (state.joinModal?.overlay?.isConnected) return;
        playUiSound(elements.message_sound);

        state.joinModal = await msg(`
            <p style="margin-top:0;">
                Another device is requesting to join your active remote session: <strong>${escapeHtml(state.pin ?? 'unknown')}</strong>
            </p>
            <div style="display:flex; gap:0.65rem; justify-content:center; flex-wrap:wrap;">
                <button id="remote-join-approve" class="bu">Approve</button>
                <button id="remote-join-deny" class="bu">Deny</button>
            </div>
        `, 'Remote', false, true);

        document.getElementById('remote-join-approve')?.addEventListener('click', () => {
            send({ type: 'remote_join_approved' });
            closeJoinModal();
        });

        document.getElementById('remote-join-deny')?.addEventListener('click', () => {
            send({ type: 'remote_join_denied' });
            closeJoinModal();
        });
    }

    async function showRemoteDisclaimerPrompt() {
        if (state.disclaimerModal?.overlay?.isConnected) return;

        state.disclaimerModal = await msg(`This is an experimental remote control for Voxity. It works by simply entering a PIN on another device. Please keep in mind:<br><br>
            <li><i class="fa-solid fa-arrow-right"></i> This is not complete and only broadcasts so much to the remote</li>
            <li><i class="fa-solid fa-arrow-right"></i> You are free to share PINs around, but please do not abuse the server... plz</li>
            <li><i class="fa-solid fa-arrow-right"></i> <strong>This could be removed at any time</strong></li>
            <li><i class="fa-solid fa-arrow-right"></i> The server source is at <a href="https://github.com/exerinity/voxity.remote" target="_blank">voxity.remote on GitHub</a></li>
            <p>Before you continue, you should probably open <a href="https://remote.voxity.dev" target="_blank">remote.voxity.dev</a> on another device.</p>
                <button id="remote-disclaimer-accept" class="bu">I understand</button>
        `, 'Remote: disclaimer');

        document.getElementById('remote-disclaimer-accept')?.addEventListener('click', () => {
            localStorage.setItem(REMOTE_ACCEPT_KEY, '1');
            closeModal(state.disclaimerModal);
            state.disclaimerModal = null;
            openRemoteControlModal();
        });
    }

    function connectSocket() {
        if (!state.pin) { setStatus('error', 'No PIN available'); return; }

        state.socket = new WebSocket(getServerUrls().ws);
        state.manualDisconnect = false;

        state.socket.addEventListener('open', () => {
            send({ type: 'voxity_connect', pin: state.pin });
        });

        state.socket.addEventListener('message', async ({ data }) => {
            let msg;
            try { msg = JSON.parse(data); } catch { return; }

            switch (msg.type) {
                case 'connected':
                    state.pin = msg.pin || state.pin;
                    setStatus('connected');
                    attachPlaybackListeners();
                    state.stateInterval = setInterval(pushStateUpdate, 2000);
                    pushStateUpdate();
                    break;

                case 'remote_join_request':
                    await showJoinRequestPrompt();
                    break;

                case 'command':
                    clickForCommand(msg.command);
                    break;

                case 'error':
                    setStatus('error', msg.message || msg.code || 'Remote server error');
                    break;
            }
        });

        state.socket.addEventListener('error', () => {
            if (state.status === 'connecting')
                setStatus('error', 'WebSocket connection error');
        });

        state.socket.addEventListener('close', () => {
            const wasManual = state.manualDisconnect;
            state.socket = null;
            state.manualDisconnect = false;
            closeJoinModal();
            clearSessionRuntime();
            setStatus(wasManual ? 'disconnected' : 'error', wasManual ? '' : 'Remote session disconnected unexpectedly');
        });
    }

    async function startSession() {
        if (!navigator.onLine) return throw_error("Go online to use this");
        if (state.socket?.readyState === WebSocket.OPEN || state.socket?.readyState === WebSocket.CONNECTING) return;

        closeJoinModal();
        setStatus('connecting');

        try {
            const res = await fetch(`${getServerUrls().http}/api/pin`, { cache: 'no-store' });
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error ?? `Server error (${res.status})`);
            if (!data?.pin) throw new Error('Remote returned an invalid PIN');
            state.pin = data.pin;
            renderControlModal();
            connectSocket();
        } catch (err) {
            setStatus('error', err?.message ?? 'The remote did not respond correctly, retry?');
        }
    }

    function disconnectSession() {
        closeJoinModal();
        if (state.socket) {
            state.manualDisconnect = true;
            try { state.socket.close(1000, 'Disconnected by user'); } catch { }
            state.socket = null;
        }
        state.pin = null;
        clearSessionRuntime();
        setStatus('disconnected');
    }

    async function openRemoteControlModal() {
        if (!navigator.onLine) return throw_error("Go online to use this");
        if (!hasAcceptedRemoteDisclaimer()) {
            await showRemoteDisclaimerPrompt();
            return;
        }

        if (state.controlModal?.overlay?.isConnected) {
            renderControlModal();
            return;
        }
        const modalPromise = msg('Loading remote controls...', 'Remote');
        window.VoxityRouter?.setModalRoute(modalPromise, '/control/remote');
        state.controlModal = await modalPromise;
        renderControlModal();
    }

    document.addEventListener('voxity:modal-closed', ({ detail }) => {
        if (detail?.modal === state.controlModal) state.controlModal = null;
        if (detail?.modal === state.joinModal) state.joinModal = null;
        if (detail?.modal === state.disclaimerModal) state.disclaimerModal = null;
    });

    function bindRemoteButton() {
        ensureRemoteAcceptanceKey();
        const trigger = getRemoteTrigger();
        trigger?.addEventListener('click', openRemoteControlModal);
        updateRemoteButtonStatusColor();
    }

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', bindRemoteButton, { once: true });
    else
        bindRemoteButton();

    window.VoxityRemote = {
        open: openRemoteControlModal,
        connect: startSession,
        disconnect: disconnectSession,
        status: () => ({ status: state.status, pin: state.pin, lastError: state.lastError }),
    };
})();
