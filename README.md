# Voxity - plays music.
A modern, opinionated, fast, PWA local music player written entirely in JavaScript

![](https://i.exerinity.com/Voxity_20260218_223009.png)

## Links
- Try now: https://voxity.dev
- Release notes: https://voxity.dev/i/release_notes
- Download: https://github.com/exerinity/voxity.electron/releases
- More info: https://exerinity.com/projects/voxity

## Features
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

## To do / Roadmap
(Items ending in an asterisk are purely ideas and may never actually happen)
- Tie the routes to actually open modals on load, for example, loading https://voxity.dev/settings should open the settings modal
- Reduce CPU strain (it is pretty heavy on weaker CPUs, my laptops i5-6300U does not like it much)
- Add a miniplayer which (asks to) open(s) when you unfocus, minimize, or otherwise leave the main window (especially in the Electron version)\*
- Rewrite the "Modify lyrics" button from a text-area to a full toolkit with a timing editor\*
- DOCUMENTATION!!! (of how to use the actual code and do your own things with it)

### Electron
- Local file browsing and opening\*

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
The code here is 1:1 of what you receive when loading the app in your browser. This repository is available mostly as-is, or in other words, I will probably not accept pull requests, feature requests, ideas or contributions unless it's *really* good. 
## Other repositories
There is also an Electron version of Voxity, available for Windows and some Linux distros (AppImage and deb), which has some extra features like an application menu and more to come to it. 

https://github.com/exerinity/voxity.electron

The proxy used for fetching lyrics from Musixmatch is due to be released. It's really just a basic Express server, that pretends to be a Musixmatch desktop app user... nothing special

## License
This project is licensed under the MIT license. See the [license](LICENSE) file for details.

## Things used
- ~~**Twemoji**: https://twemoji.twitter.com~~ *removed as of v85a\**
- **jsmediatags**: https://github.com/aadsm/jsmediatags
- **Font Awesome**: https://fontawesome.com

\*- what good is an emoji library in a music player? especially with Font Awesome present?

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
- **foobar2000** for the tagline "plays music." (it is a carbon copy from its buttons found at https://www.foobar2000.org/support) (im sorry)

## Donate
Instead of donating to me, you should donate to

- [The Tim Bergling Foundation](https://www.timberglingfoundation.org/donationer)
- [LRCLIB](https://github.com/sponsors/tranxuanthang)

I'm not affiliated with these, but, developing Voxity does not cost me anything, so I should not receive anything back for it
