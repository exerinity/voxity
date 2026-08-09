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
          <li><strong>Ctrl + F</strong>: open search</li>
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

          <li><strong>Numeric keys (0-9)</strong>: jump to 0-90%</li>
          <li><strong>Shift + Numeric keys (0-9)</strong>: jump to 5-95%</li>
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

    <li>
      <details>
        <summary style="font-size:1.1rem;font-weight:600;margin-bottom:0.2em;">Miscellaneous</summary>
        <ul style="list-style-type:none;padding-left:1em;margin-top:0.3em;line-height:1.5;">
          <li><strong>Ctrl + Shift + Alt + V</strong>: this song is ass</li>
        </ul>
      </details>
    </li>
  </ul>
  <i style="font-size:0.9rem">While not a hot<u>key</u>, per se, you can also scroll your mousewheel over sliders to move them</i>
  `;

const days_since_release = Math.floor((Date.now() - new Date(2025, 6, 11).getTime()) / 86400000);

const about_content = `Voxity is a modular <abbr title="Progressive Web App">PWA</abbr> music player created by <a href="https://exerinity.com" target="_blank" rel="noopener">exerinity</a>, written in vanilla JavaScript.</p>
<p>Voxity was incepted in July 2025 and first released on the 11th as "Music player" - ${days_since_release.toLocaleString()} days ago. It was renamed to <a href="/releases#v25" target="_blank"><strong>Audion</strong> on the 25th of August</a>, <a href="/releases#v59" target="_blank">then <strong>Voxity</strong> on the 13th of October</a>.</p>
        <a href="/git/README.md" target="_blank" rel="noopener">More about Voxity</a> - <a href="/releases" onclick="event.preventDefault(); relnote()" style="cursor: pointer">Release notes</a> - <a href="https://xebrine.exerinity.com" target="_blank">Also try Xebrine!</a><br>
                <p style="font-size:0.9rem; color:#888; margin:0.5rem 0 0;">
          ${typeof isElectron === 'function' && isElectron()
    ? "You are running the Electron version of Voxity"
    : isPWA()
        ? "Voxity is currently installed as a PWA, nice!"
        : "Tip: You should install Voxity as a PWA. <a href='/install' onclick='event.preventDefault(); pwamsg()' target='_blank' rel='noopener'>Show me...</a>"}
        </p>
        <hr>
        <p>Voxity uses <a href="https://github.com/aadsm/jsmediatags" target="_blank" rel="noopener">jsmediatags</a> for reading metadata, <a href="https://fontawesome.com/" target="_blank" rel="noopener">Font Awesome</a> for icons, <a href="https://fonts.google.com/specimen/Google+Sans+Flex" target="_blank" rel="noopener">Google Sans Flex</a> for the font, and <a href="https://lrclib.net" target="_blank">LRCLIB</a>/<a href="https://www.musixmatch.com/" target="_blank" rel="noopener">Musixmatch</a> for lyrics. Voxity is <a href="https://github.com/exerinity/voxity/tree/main#license">public domain software</a>.</p><hr>Voxity is ${uptodate === false ? '<strong style="color:orange;">out of date</strong>! Please <a href="#" onclick="window.location.href=window.location.href.split(\'?\')[0]+\'?cachebuster=\'+Date.now();return false;">refresh to update</a>.' : '<strong style="color:green;">up to date!</strong>'}
        <br><a href="https://exerinity.com/twitter" target="_blank"><i class="fa-brands fa-twitter" style="color:#1da1f2;"></i> Follow me on Twitter</a> - <a href="https://github.com/exerinity/voxity" target="_blank"><i class="fa-brands fa-github"></i> Voxity on GitHub</a>
        <br><small><a href="/i/reload_fa" onclick="event.preventDefault(); loadFA()">Icons are not showing...</a> - <a href="/i/welcome" onclick="event.preventDefault();closeTopModal(); welcome()">Show welcome modal</a></small><br><br>
        <a href="https://exerinity.com/projects/voxity/88x31" target="_blank"><img src="https://cologne.exerinity.com/voxity.gif"></a> <a href="https://exerinity.com/projects/voxity/88x31" target="_blank"><img src="https://cologne.exerinity.com/voxitygreen.gif"></a> <a href="https://exerinity.com/projects/voxity/88x31" target="_blank"><img src="https://cologne.exerinity.com/voxitynow_purp.gif"></a>`;
