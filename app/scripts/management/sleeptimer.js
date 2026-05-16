const SLEEP_TIMER_PRESETS = [
    { label: '+1 min', seconds: 60 },
    { label: '+5 min', seconds: 300 },
    { label: '+15 min', seconds: 900 },
    { label: '+45 min', seconds: 2700 },
];

const sleepTimerState = {
    expiresAt: null,
    timeoutId: null,
    intervalId: null,
};

function getSleepTimerRemainingMs() {
    if (!sleepTimerState.expiresAt) return 0;
    return Math.max(0, sleepTimerState.expiresAt - Date.now());
}

function formatSleepTimerClock(ms) {
    if (ms <= 0) return '00:00';
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatSleepTimerDuration(ms) {
    if (ms <= 0) return '0s';
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [];
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    if (seconds || parts.length === 0) parts.push(`${seconds}s`);
    return parts.join(' ');
}

function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function resetSleepTimerState() {
    if (sleepTimerState.timeoutId) {
        clearTimeout(sleepTimerState.timeoutId);
        sleepTimerState.timeoutId = null;
    }
    if (sleepTimerState.intervalId) {
        clearInterval(sleepTimerState.intervalId);
        sleepTimerState.intervalId = null;
    }
    sleepTimerState.expiresAt = null;
}

function updateSleepTimerUi() {
    const remainingMs = getSleepTimerRemainingMs();
    const active = Boolean(sleepTimerState.expiresAt && remainingMs > 0);
    const countdownEl = document.getElementById('sleep_timer_countdown');
    if (countdownEl) {
        countdownEl.textContent = active ? formatSleepTimerClock(remainingMs) : '--:--';
    }
    const stateEl = document.getElementById('sleep_timer_state');
    if (stateEl) {
        stateEl.textContent = active
            ? `Ongoing`
            : 'Not running';
    }
    const expiresEl = document.getElementById('sleep_timer_expires');
    if (expiresEl) {
        if (active) {
            const expiresDate = new Date(sleepTimerState.expiresAt);
            const now = new Date();
            const differentDay = expiresDate.getFullYear() !== now.getFullYear()
                || expiresDate.getMonth() !== now.getMonth()
                || expiresDate.getDate() !== now.getDate();
            const timeString = expiresDate.toLocaleTimeString([], { hour12: true });
            const dateSuffix = differentDay ? ` on ${formatLocalDate(expiresDate)}` : '';
            expiresEl.innerHTML = `Finishes at <strong>${timeString}${dateSuffix}</strong>`;
        } else {
            expiresEl.textContent = '';
        }
    }
    const activeSection = document.getElementById('sleep_timer_active_section');
    if (activeSection) {
        activeSection.style.display = active ? 'flex' : 'none';
    }
    const startSection = document.getElementById('sleep_timer_start_section');
    if (startSection) {
        startSection.style.display = active ? 'none' : 'flex';
    }
    const cancelBtn = document.getElementById('sleep_timer_cancel');
    if (cancelBtn) {
        cancelBtn.style.display = active ? 'inline-flex' : 'none';
    }
    const inlineBtnLabel = document.getElementById('sleep_timer_button_label');
    if (inlineBtnLabel) {
        inlineBtnLabel.textContent = active
            ? formatSleepTimerClock(remainingMs)
            : '';
    }
}

function ensureSleepTimerTicker() {
    if (sleepTimerState.intervalId) return;
    sleepTimerState.intervalId = setInterval(() => {
        if (!sleepTimerState.expiresAt) {
            clearInterval(sleepTimerState.intervalId);
            sleepTimerState.intervalId = null;
            return;
        }
        const remaining = getSleepTimerRemainingMs();
        if (remaining <= 0) {
            completeSleepTimer();
            return;
        }
        updateSleepTimerUi();
    }, 500);
}

function scheduleSleepTimerFinishTimeout() {
    if (sleepTimerState.timeoutId) {
        clearTimeout(sleepTimerState.timeoutId);
        sleepTimerState.timeoutId = null;
    }
    if (!sleepTimerState.expiresAt) return;
    const remaining = Math.max(0, sleepTimerState.expiresAt - Date.now());
    sleepTimerState.timeoutId = setTimeout(() => {
        sleepTimerState.timeoutId = null;
        completeSleepTimer();
    }, remaining);
    ensureSleepTimerTicker();
}

function startSleepTimer(seconds) {
    const secs = Math.round(Number(seconds));
    if (!Number.isFinite(secs) || secs <= 0) {
        throw_error('Must be at least 1 second');
        return false;
    }
    sleepTimerState.expiresAt = Date.now() + (secs * 1000);
    scheduleSleepTimerFinishTimeout();
    updateSleepTimerUi();
    const remaining = getSleepTimerRemainingMs();
    stat_up(`<i class="fa-solid fa-moon"></i> Sleep timer set (${formatSleepTimerDuration(remaining)} remaining)`);
    return true;
}

function extendSleepTimer(seconds) {
    const secs = Math.round(Number(seconds));
    if (!Number.isFinite(secs) || secs <= 0) {
        return false;
    }
    if (!sleepTimerState.expiresAt) {
        return startSleepTimer(secs);
    }
    sleepTimerState.expiresAt += secs * 1000;
    scheduleSleepTimerFinishTimeout();
    updateSleepTimerUi();
    const remaining = getSleepTimerRemainingMs();
    stat_up(`<i class="fa-solid fa-moon"></i> Sleep timer extended (${formatSleepTimerDuration(secs * 1000)} added, ${formatSleepTimerDuration(remaining)} left)`);
    return true;
}

function cancelSleepTimer(showFeedback = true) {
    if (!sleepTimerState.expiresAt) {
        return false;
    }
    resetSleepTimerState();
    updateSleepTimerUi();
    if (showFeedback) {
        stat_up('<i class="fa-solid fa-moon"></i> Sleep timer cancelled');
    }
    return true;
}

function completeSleepTimer() {
    if (!sleepTimerState.expiresAt) {
        resetSleepTimerState();
        updateSleepTimerUi();
        return;
    }
    resetSleepTimerState();
    updateSleepTimerUi();
    try {
        elements.player.pause();
    } catch { }
    const timerSoundEnabled = typeof shouldPlaySoundEffects === 'function'
        ? shouldPlaySoundEffects()
        : true;
    if (timerSoundEnabled) {
        try {
            if (elements.time_sound) {
                elements.time_sound.volume = elements.player.volume || 1; // to avoid blasting someone sound asleep hahah
                if (typeof playUiSound === 'function') {
                    playUiSound(elements.time_sound);
                } else {
                    elements.time_sound.currentTime = 0;
                    elements.time_sound.play();
                }
            }
        } catch { }
    }
    try {
        msg('Your sleep timer has reached zero, <a href="/i/sleep_timer" onclick="event.preventDefault(); closeTopModal(); openSleepTimerModal();">but you can always add more time</a>', "Time's up");
    } catch { }
}

async function openSleepTimerModal() {
    const quickButtons = SLEEP_TIMER_PRESETS.map(btn => `<button type="button" class="sleep-timer-quick-button" data-sleep-timer-add="${btn.seconds}">${btn.label}</button>`).join('');
    const modal = await msg(`
        <div class="sleep-timer-modal">
            <div id="sleep_timer_active_section" class="sleep-timer-card">
                <p id="sleep_timer_state" class="sleep-timer-state">No sleep timer active</p>
                <div id="sleep_timer_countdown" class="sleep-timer-countdown">--:--</div>
                <small id="sleep_timer_expires" class="sleep-timer-expires"></small>
            </div>
            <div id="sleep_timer_start_section" class="sleep-timer-card">
                <label for="sleep_timer_minutes" class="sleep-timer-label">How long?</label>
                <div class="sleep-timer-input-row">
                    <input id="sleep_timer_minutes" class="sleep-timer-input" type="number" min="1" value="15">
                    <span class="sleep-timer-input-suffix">minutes</span>
                </div>
                <button id="sleep_timer_start" type="button" class="sleep-timer-primary-btn">Start</button>
            </div>
            <div class="sleep-timer-card">
                <p class="sleep-timer-quick-label">Add (more) time</p>
                <div id="sleep_timer_quick_add" class="sleep-timer-quick-grid">
                    ${quickButtons}
                </div>
            </div>
            <button id="sleep_timer_cancel" type="button" class="sleep-timer-cancel-btn">Cancel sleep timer</button>
        </div>
    `, 'Sleep timer');
    window.VoxityRouter?.setModalRoute(modal, '/control/sleep');

    setTimeout(() => {
        const root = modal?.overlay || document;
        const minutesInput = root.querySelector('#sleep_timer_minutes');
        const startBtn = root.querySelector('#sleep_timer_start');
        const quickBtns = root.querySelectorAll('[data-sleep-timer-add]');
        const cancelBtn = root.querySelector('#sleep_timer_cancel');

        const handleStart = () => {
            if (!minutesInput) return;
            const minutes = parseFloat(minutesInput.value);
            if (isNaN(minutes) || minutes <= 0) {
                throw_error('Must be at least 1 minute');
                minutesInput.focus();
                return;
            }
            startSleepTimer(minutes * 60);
            updateSleepTimerUi();
            try { minutesInput.blur(); } catch { }
        };

        if (startBtn && minutesInput) {
            startBtn.addEventListener('click', handleStart);
            minutesInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleStart();
                }
            });
        }

        quickBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const seconds = Number(btn.getAttribute('data-sleep-timer-add')) || 0;
                extendSleepTimer(seconds);
                updateSleepTimerUi();
            });
        });

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                const cancelled = cancelSleepTimer();
                if (!cancelled) {
                    throw_error('No sleep timer to cancel - this button should not be visible currently, but whatever.');
                }
                updateSleepTimerUi();
            });
        }

        updateSleepTimerUi();
        if (minutesInput && !sleepTimerState.expiresAt) {
            minutesInput.focus();
        }
    }, 0);
}

const sleepTimerTrigger = document.getElementById('open_sleep_timer_modal');
if (sleepTimerTrigger) {
    sleepTimerTrigger.addEventListener('click', debounce(() => {
        openSleepTimerModal();
    }));
}

updateSleepTimerUi();