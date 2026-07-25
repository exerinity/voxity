# Voxity - plays music.
Voxity is a bizarre, feature-rich, semi-advanced PWA desktop music player written entirely in vanilla JavaScript that supports any file format your browser does.

[![](https://cologne.exerinity.com/voxity.png)](https://cologne.exerinity.com/voxity.png)

## Quick links
- Try now: https://voxity.dev
- Release notes: https://voxity.dev/releases
- Download an Electron wrapper: https://github.com/exerinity/voxity.electron/releases
- More info: https://exerinity.com/projects/voxity

## List of features
- Online lyric searching and displaying, with click-to-jump lines from [LRCLIB](https://lrclib.net) or [Musixmatch (experimental)](https://www.musixmatch.com)
- LRCLIB is configurable: you can query by Strict (artist, title, album, duration) or Lax (artist and title)
- A queue with an intelligent shuffle system and drag-to-reorder
- Metadata parsing and displaying, courtesy of jsmediatags
- 10+ themes
- 3 responsive visualizers with variable FPS
- Many many hotkeys (see [#hotkeys](#hotkeys) or the hotkeys button in the app)
- Integration with the Media Session API
- Supports WebVTT, SubRip, and LRC as lyrics (just drag the file in)
- A basic sleep timer
- Sound effects for finished queue, error, welcome, and more
- System notifications when a new song begins (requires permission)
- Precise input modals that can be opened by clicking the corresponding slider's label, for example, clicking the "Volume" label opens a modal where you can type in the exact volume you want instead of dragging the slider
- Click to copy metadata fields, for example, clicking the artist name copies it to your clipboard
- Variable accent color which applies to the entire UI and visualizer
- Automatic accent color generation based on album art
- A settings area with many options, with more to come
- A lyrics browser and editor
- A rotating tab title which shows various information about the current song in the tab name to avoid clutter/truncation
- An error/success toast system in the bottom right corner with an intuitive timer and pause-on-hover
- Levenshtein-distance inspired searching function for the queue (CTRL+F, the dedicated button, or middle-click the queue header)
- Sliders support mouse wheel scrolling
- Wake lock holder
- Clicking the duration in the scrubber toggles between elapsed and remaining time
- A two level cover art viewer: clicking the cover art opens a larger view, and clicking that opens the full-size image in a new tab
- A modular, explorable and breakable codebase, creating "plugins" or browser extensions (etc) should be fairly easy (allegedly)
- Works offline after the first load with a respectful update strategy; when a new update is available, it asks if you want to update, and if you say no, nothing happens
- A linear text scrolling animation system for very long text (scrolls, retracts, pauses, repeat)

and more!

## Hotkeys
| Key                  | Action                        | Details / modifiers |
|---------------------------|-------------------------------|---------------------|
| `Space` or `K`            | Play / pause                  | - |
| `Escape`                  | Close modal                   | closest open modal, stacks |
| `R`                       | Restart track                 | from 0 |
| `Ctrl + F`            | Open queue search             | - |
| `T`                       | Toggle loop                   | - |
| `H`                       | Toggle shuffle                | - |
| `Z`                       | Previous track                | - |
| `X`                       | Next track                    | - |
| `←` `J` `A`               | Scrub backward                | default: **-10s**<br>Alt: **-30s**<br>Shift: **-1s**<br>Ctrl: **-5s** |
| `→` `L` `D`               | Scrub forward                 | same as above, only + |
| `↑` `W`                   | Volume up                     | +1% |
| `↓` `S`                   | Volume down                   | -1% |
| `0` to `9`                   | Jump to percentage            | `0` = 0%, `1` = 10%, ..., `9` = 90%<br>`Shift` = half-jump; so `Shift` + `1` = 5% |

## About this repository
The code here is 1:1 of what you receive when loading the app in your browser. This repository is available mostly as-is, or in other words, I will probably not accept pull requests, feature requests, ideas or contributions unless it's *really* good. Nevertheless, if you can make a cool fork of Voxity, go ahead! I would love to see it!
## Other repositories
There is a simple Electron wrapper that exposes & obeys MPRIS control on Linux and works with [Music Presence for Discord](https://musicpresence.app): https://github.com/exerinity/voxity.electron

The source code for the archived and now-removed remote control server is: https://github.com/exerinity/voxity.remote

## License
This project is released under the Unlicense, which is a public domain dedication. See the [license](LICENSE) file for details.

(*this does not apply to Font Awesome icons, jsmediatags, Twemoji, or any other third party things used*)

## Browser?
One of the best things about Voxity (and basically any PWA) is you don't need to install it, you only need a browser. But which browser works best with it? Well, from my personal testing:

## Best - Chrome (and close derivatives)
Chrome has the best PWA support, playback support, and pretty much the most stable for Voxity. For an even better experience, use Ungoogled Chromium or Helium and install Voxity as a PWA

## 2nd best - Firefox
Firefox is also pretty solid and boring with Voxity, and even allows MPRIS control (e.g., changing the volume), however, playback speed is a bit janky: at 0.1% the audio completely stops, and it can only go up to 8x before going silent (as opposed to Chrome allowing 14x) (not sure who is listening to music that fast but still noteworthy)

Firefox, however, does not have the same PWA support as Chrome, and the closest way of that is the "Add tab to taskbar" button in the omnibox

Ultimately, if you don't plan on installing as a PWA nor doing much, both Firefox and Chrome will work pretty much identically

## Things used
- **jsmediatags**: https://github.com/aadsm/jsmediatags
- **Font Awesome**: https://fontawesome.com

## Ascendants
Voxity was birthed in July 2025 after combining these three projects:
### Basic player
- A basic video/audio player with the same ethos as Voxity; the speed-volume-scrub sliders and controls // 
https://player.exerinity.com / https://github.com/exerinity/basic-player

### Visualizer
- A... visualizer //
https://visualizer.exerinity.com

### Doom/Incompetech player
- A concept of a song picker and player, two variants for DOOM and Incompetech (Kevin MacLeod) // 
https://exerinity.com/doom/ost and https://demo.player.exerinity.com/

### Also, inspirations where credit is due!
- **Windows Media Player** for the rotating tab title logic, in the mini player
- **Winamp** for the status bar system (https://files.exerinity.com/Voxity_20260224_203314.mp4)
- **VLC media player** for the notifications (...kinda)
- **foobar2000** for the tagline "plays music." (it is a carbon copy from its buttons found at https://www.foobar2000.org/support) (im sorry) and other minor things here and there

## Donate
Please do not (ask how to) donate to me, as Voxity is not a financially demanding project to maintain. The only thing that costs me anything is the domain, which is ~$20 a year. I don't know, it hasn't been the second period. Voxity doesn't cost me anything to code or host.

Instead, I urge you to donate to:

- [The Tim Bergling Foundation](https://www.timberglingfoundation.org/donationer)
- [LRCLIB](https://github.com/sponsors/tranxuanthang)

I'm not affiliated with these, but LRCLIB is a major component within Voxity and the Tim Bergling Foundation is the charity founded in the name of my childhood hero, so...

## Well what about mobile?
Simple answer: **No.**

Voxity is not intended to be used on mobile, however, from my personal experience, it *might* work. On Android in landscape mode, it works perfectly fine (if you ignore the tiny fucking screen), on iPhone it's a bit finicky, but the reason I discourage mobile use is the design of Voxity. Voxity is a "two panel" or "two sided" player, information is split up into two sides on the screen, which is difficult (for me) to make work correctly on mobile, in portrait. That's not saying tablets won't run it fine, but nobody uses tablets anymore. Making Voxity mobile friendly would probably fundamentally change what it is and nevertheless simply not something I am interested in. Because your phone 100% has dozens of better music players that are native.

Please do not make a pull request or an issue about mobile in any concern. Whether something is not working on mobile (but does on desktop), requests to modify for mobile friendliness, whatever, **it will be ignored, closed or rejected**. Voxity is strictly a desktop player **only**.