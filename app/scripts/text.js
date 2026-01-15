// this file has no real functionality, im just storing stuff inside modals here

const hotkeys_content = `<ul style="list-style-type:none;padding:0;margin:0;">
    <li>
      <details style="margin-bottom:0.5em;">
        <summary style="font-size:1.1rem;font-weight:600;margin-bottom:0.2em;">Playback</summary>
        <ul style="list-style-type:none;padding-left:1em;margin-top:0.3em;line-height:1.5;">
          <li><strong>Space / K</strong>: play/pause</li>
          <li><strong>R</strong>: restart track</li>
          <li><strong>T</strong>: toggle loop</li>
          <li><strong>H</strong>: toggle shuffle</li>
        </ul>
      </details>
    </li>

    <li>
      <details style="margin-bottom:0.5em;">
        <summary style="font-size:1.1rem;font-weight:600;margin-bottom:0.2em;">Seek</summary>
        <ul style="list-style-type:none;padding-left:1em;margin-top:0.3em;line-height:1.5;">

          <li><strong>Left / Right / J / L / A / D</strong>: scrub ±10s</li>
          <li><strong>Shift + Left/Right</strong>: scrub ±1s</li>
          <li><strong>Ctrl + Left/Right</strong>: scrub ±5s</li>
          <li><strong>Alt + Left/Right</strong>: scrub ±30s</li>

          <li><strong>Numeric keys (0–9)</strong>: jump to 0–90%</li>
          <li><strong>Shift + Numeric keys (0–9)</strong>: jump to 5–95%</li>
        </ul>
      </details>
    </li>

    <li>
      <details>
        <summary style="font-size:1.1rem;font-weight:600;margin-bottom:0.2em;">Control</summary>
        <ul style="list-style-type:none;padding-left:1em;margin-top:0.3em;line-height:1.5;">
          <li><strong>W / Up</strong>: volume up</li>
          <li><strong>S / Down</strong>: volume down</li>
          <li><strong>Z</strong>: previous track</li>
          <li><strong>X</strong>: next track</li>
        </ul>
      </details>
    </li>
  </ul>
  <i style="font-size:0.9rem;color:#888;">You can also scroll over bars like volume and speed to change them</i>
  `;

const about_content = `Voxity is a modular <abbr title="Progressive Web App">PWA</abbr> music player created by <a href="https://exerinity.dev" target="_blank" rel="noopener">exerinity</a>. It is not designed to replace or compete with any native players; but rather to be a fast quick way for casual listening.</p>
        <a href="https://exerinity.com/projects/voxity" target="_blank" rel="noopener">Learn more about Voxity</a> - <a href="/i/release_notes" onclick="event.preventDefault(); changelogmsg()" style="cursor: pointer">Release notes</a><br>
                <p style="font-size:0.9rem; color:#888; margin:0.5rem 0 0;">
          ${isPWA() ? "Voxity is currently installed as a PWA, nice!" : "Tip: You should install Voxity as a PWA. <a href='/i/how_pwa' onclick='event.preventDefault(); pwamsg()' target='_blank' rel='noopener'>Learn how</a>"}
        </p>
        <hr>
        <p>Voxity uses <a href="https://github.com/aadsm/jsmediatags" target="_blank" rel="noopener">jsmediatags</a> for reading metadata, <a href="https://fontawesome.com/" target="_blank" rel="noopener">Font Awesome</a> for icons, and <a href="https://lrclib.net" target="_blank">LRCLIB</a> as a lyrics source.</p><hr>Voxity is ${uptodate === false ? '<strong style="color:orange;">out of date</strong>! Please <a href="#" onclick="window.location.href=window.location.href.split(\'?\')[0]+\'?cachebuster=\'+Date.now();return false;">refresh to update</a>.' : '<strong style="color:green;">up to date!</strong>'}
        <br><a href="https://exerinity.com/twitter" target="_blank"><i class="fa-brands fa-twitter" style="color:#1da1f2;"></i> Twitter</a> - <a href="https://exerinity.com/projects" target="_blank"><i class="fa-solid fa-globe"></i> My other projects</a> - <a href="https://github.com/exerinity/voxity" target="_blank"><i class="fa-brands fa-github"></i> GitHub</a>
        <br><small><a href="/i/reload_fa" onclick="event.preventDefault(); loadFA()">(if you do not see any icons, click here)</a></small>`;
