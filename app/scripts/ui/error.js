const max = 5;
const c = document.createElement('div');
c.style.position = 'fixed';
c.style.top = '20px';
c.style.right = '20px';
c.style.display = 'flex';
c.style.flexDirection = 'column-reverse';
c.style.gap = '10px';
c.style.zIndex = '2147483647';
document.body.appendChild(c);

function throw_error(msg, ok = false) {
    const dur = 13000;

    const type = ok === true ? 'success' : ok === 2 ? 'info' : 'error';
    const cfg = {
        error:   { bg: '#da0000ff', icon: 'fa-triangle-exclamation', live: 'assertive' },
        success: { bg: '#047500ff', icon: 'fa-check',                 live: 'polite'    },
        info:    { bg: '#0068c8ff', icon: 'fa-circle-info',           live: 'polite'    },
    }[type];

    const box = document.createElement('div');
    box.className = 'error-box';
    box.style.background = cfg.bg;
    box.style.color = 'white';
    box.style.padding = '12px 36px 16px 16px';
    box.style.borderRadius = '8px';
    box.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.25)';
    box.style.opacity = '1';
    box.style.transition = 'opacity 1s ease, transform 160ms ease, max-height 200ms ease';
    box.style.overflow = 'hidden';
    box.style.maxHeight = '72px';
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', cfg.live);

    const cnt = document.createElement('div');
    cnt.className = 'error-content';
    cnt.style.display = 'flex';
    cnt.style.alignItems = 'flex-start';
    cnt.style.gap = '10px';

    const ico = document.createElement('i');
    ico.className = `fa-solid ${cfg.icon}`;
    ico.style.marginTop = '2px';

    const txt = document.createElement('span');
    txt.className = 'error-message';
    txt.innerHTML = msg;
    txt.style.userSelect = 'none';
    txt.style.display = '-webkit-box';
    txt.style.webkitBoxOrient = 'vertical';
    txt.style.overflow = 'hidden';
    txt.style.webkitLineClamp = '2';

    cnt.appendChild(ico);
    cnt.appendChild(txt);

    const x = document.createElement('button');
    x.className = 'error-close';
    x.setAttribute('aria-label', 'Dismiss notification');
    x.innerHTML = '&times;';
    x.style.position = 'absolute';
    x.style.top = '6px';
    x.style.right = '6px';
    x.style.width = '24px';
    x.style.height = '24px';
    x.style.border = '0';
    x.style.background = 'transparent';
    x.style.color = 'white';
    x.style.opacity = '0.85';
    x.style.cursor = 'pointer';
    x.style.borderRadius = '4px';

    const prog = document.createElement('div');
    prog.className = 'error-progress';
    prog.style.position = 'absolute';
    prog.style.left = '0';
    prog.style.right = '0';
    prog.style.bottom = '0';
    prog.style.height = '3px';
    prog.style.background = '#ffffff20';
    const bar = document.createElement('span');
    bar.style.display = 'block';
    bar.style.height = '100%';
    bar.style.width = '100%';
    bar.style.background = '#ffffff';
    bar.style.opacity = '0.85';
    bar.style.transformOrigin = 'left';
    bar.style.transform = 'scaleX(1)';
    prog.appendChild(bar);

    box.appendChild(x);
    box.appendChild(cnt);
    box.appendChild(prog);

    c.appendChild(box);

    let paus = false;
    let raf = null;
    let el = 0;
    let last = performance.now();

    const step = (now) => {
        if (!paus) {
            el += now - last;
            const rem = Math.max(0, dur - el);
            const sc = rem / dur;
            bar.style.transform = `scaleX(${sc})`;
            if (rem <= 0) {
                bye();
                return;
            }
        }
        last = now;
        raf = requestAnimationFrame(step);
    };

    const bye = () => {
        if (raf) cancelAnimationFrame(raf);
        box.style.opacity = '0';
        setTimeout(() => {
            box.remove();
        }, 1000);
    };

    box.addEventListener('mouseenter', () => {
        paus = true;
        box.style.maxHeight = '600px';
        txt.style.webkitLineClamp = 'unset';
    });
    box.addEventListener('mouseleave', () => {
        paus = false;
        last = performance.now();
        box.style.maxHeight = '72px';
        txt.style.webkitLineClamp = '2';
    });

    x.addEventListener('click', (e) => {
        e.stopPropagation();
        paus = false;
        bye();
    });

    requestAnimationFrame((t) => {
        last = t;
        step(t);
    });

    if (c.children.length > max) {
        c.firstChild?.remove();
    }

    if (type === 'error') {
        if (typeof playUiSound === 'function') {
            playUiSound(elements.error_sound);
        } else {
            try {
                elements.error_sound.currentTime = 0;
                elements.error_sound.play();
            } catch { }
        }
        console.error(msg);
    } else if (type === 'info') {
        if (typeof playUiSound === 'function') {
            playUiSound(elements.message_sound);
        } else {
            try {
                elements.message_sound.currentTime = 0;
                elements.message_sound.play();
            } catch { }
        }
    }
}