function scheduleScrollResume(textEl, delay = SCROLL_HOLD_MS) {
    const existing = scrollTimers.get(textEl);
    if (existing) {
        clearTimeout(existing);
    }
    textEl.classList.remove('is-scrolling-active');
    if (delay <= 0) {
        textEl.classList.add('is-scrolling-active');
        scrollTimers.delete(textEl);
        return;
    }
    const timer = setTimeout(() => {
        textEl.classList.add('is-scrolling-active');
        scrollTimers.delete(textEl);
    }, delay);
    scrollTimers.set(textEl, timer);
}

function handleScrollIteration(textEl) {
    const direction = textEl.dataset.scrollDirection || 'forward';
    if (direction === 'forward') {
        textEl.dataset.scrollDirection = 'backward';
        return;
    }
    textEl.dataset.scrollDirection = 'forward';
    scheduleScrollResume(textEl, SCROLL_HOLD_MS);
}

function ensureScrollSetup(textEl) {
    if (textEl.dataset.scrollSetup) {
        return;
    }
    textEl.dataset.scrollSetup = '1';
    textEl.dataset.scrollDirection = 'forward';
    const handler = () => handleScrollIteration(textEl);
    textEl.addEventListener('animationiteration', handler);
    scrollIterationHandlers.set(textEl, handler);
    scheduleScrollResume(textEl, SCROLL_HOLD_MS);
}

function clearScrollSetup(textEl) {
    textEl.classList.remove('is-scrolling');
    textEl.classList.remove('is-scrolling-active');
    textEl.style.removeProperty('--scroll-distance');
    textEl.style.removeProperty('--scroll-duration');
    const handler = scrollIterationHandlers.get(textEl);
    if (handler) {
        textEl.removeEventListener('animationiteration', handler);
        scrollIterationHandlers.delete(textEl);
    }
    const timer = scrollTimers.get(textEl);
    if (timer) {
        clearTimeout(timer);
        scrollTimers.delete(textEl);
    }
    delete textEl.dataset.scrollSetup;
    delete textEl.dataset.scrollDirection;
}

function queueScrollRefresh() {
    if (scrollRefreshQueued) return;
    scrollRefreshQueued = true;
    requestAnimationFrame(() => {
        scrollRefreshQueued = false;
        const containers = document.querySelectorAll('.mqcont');
        let needsRetry = false;
        containers.forEach((container) => {
            const textEl = container.querySelector('.mqtext');
            if (!textEl) return;
            const containerWidth = container.clientWidth;
            if (containerWidth === 0) {
                clearScrollSetup(textEl);
                if (container.offsetParent !== null) {
                    needsRetry = true;
                }
                return;
            }
            const textWidth = textEl.scrollWidth;
            if (textWidth <= containerWidth) {
                clearScrollSetup(textEl);
                return;
            }
            const distance = containerWidth - textWidth;
            textEl.classList.add('is-scrolling');
            textEl.style.setProperty('--scroll-distance', `${distance}px`);
            const duration = Math.min(20, Math.max(6, Math.abs(distance) / 40));
            textEl.style.setProperty('--scroll-duration', `${duration.toFixed(2)}s`);
            ensureScrollSetup(textEl);
        });
        if (needsRetry && scrollRetryAttempts < 5) {
            scrollRetryAttempts += 1;
            setTimeout(queueScrollRefresh, 200);
        } else {
            scrollRetryAttempts = 0;
        }
    });
    if (!scrollResizeBound) {
        scrollResizeBound = true;
        window.addEventListener('resize', queueScrollRefresh);
    }
}

function truncate(text) {
    const truncate_max = maxtruncate();

    if (text.length <= truncate_max) {
        return `<span>${text}</span>`;
    }
    queueScrollRefresh();
    return `
        <div class="mqcont">
            <div class="mqtext">${text}</div>
        </div>
    `;
}

function act_truncate(text) {
    const truncate_max = maxtruncate();

    if (text.length <= truncate_max) {
        return text;
    }
    return text.slice(0, truncate_max) + '...';
}