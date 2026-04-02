document.addEventListener('DOMContentLoaded', () => {
    const stand = window.location.search.includes('standalone');
    if (stand) {
        const wrap = document.getElementById('i');
        const back = document.createElement('p');
        back.innerHTML = '<a href="/" style="font-size: 14px; margin-bottom: 10px; display: inline-block; color: #fff; text-decoration: underline dashed;">&#8592; Return to Voxity</a>';
        wrap.insertBefore(back, wrap.firstChild);
    }

    const bar = document.getElementById('sticky-headings');
    if (!bar) {
        return;
    }

    const actions = bar.querySelector('.sticky-actions');
    if (actions) {
        actions.classList.toggle('is-visible', stand);
    }

    const Year = bar.querySelector('.sticky-year');
    const Month = bar.querySelector('.sticky-month');
    const heads = Array.from(document.querySelectorAll('#i h1, #i h2'));
    const headings = heads.filter((h) => {
        if (h.tagName === 'H1') {
            return /^\d{4}$/.test(h.textContent.trim());
        }

        return true;
    });

    const update = () => {
        const scroll = window.scrollY + 1;
        let year = '';
        let month = '';

        for (const h of headings) {
            if (h.offsetTop <= scroll) {
                if (h.tagName === 'H1') {
                    year = h.textContent.trim();
                } else if (h.tagName === 'H2') {
                    month = h.textContent.trim();
                }
            }
        }

        Year.textContent = year;
        Month.textContent = month;
        bar.classList.toggle('is-active', Boolean(year));
    };

    const schedule = () => {
        if (schedule.frame) {
            cancelAnimationFrame(schedule.frame);
        }

        schedule.frame = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    update();
});