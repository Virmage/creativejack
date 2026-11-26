import { ArcwareInit } from '@arcware-cloud/pixelstreaming-websdk';
import { attachTouchControls } from './jackcity-touch.js';

const player = document.querySelector('#stream');
const start = document.querySelector('#start-stream');
const audio = document.querySelector('#stream-audio');
const leave = document.querySelector('.leave');
const embedded = window.parent !== window;
const previewShareId = new URLSearchParams(location.search).get('share');
const shareId = player.dataset.shareId || previewShareId;
const error = document.querySelector('#stream-error');

if (embedded) leave.hidden = true;

try {
    if (!/^share-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(shareId)) {
        throw new Error('Missing or invalid share ID');
    }
    const { Application: app, PixelStreaming: stream } = ArcwareInit(
        { shareId },
        {
            initialSettings: {
                AutoConnect: false,
                AutoPlayVideo: true,
                FakeMouseWithTouches: true,
                KeyboardInput: true,
                MouseInput: true,
                StartVideoMuted: true,
                UseMic: false,
            },
        },
    );
    player.append(app.rootElement);
    attachTouchControls(stream);
    start.hidden = false;
    start.addEventListener('click', () => {
        start.hidden = true;
        stream.connect();
    });
    const showError = () => {
        error.hidden = false;
        start.hidden = false;
    };
    stream.errorHandler.add(showError);
    stream.addEventListener('webRtcFailed', showError);
    stream.addEventListener('webRtcConnecting', () => { error.hidden = true; });
    stream.addEventListener('videoInitialized', () => {
        error.hidden = true;
        audio.hidden = !player.querySelector('video');
        if (embedded) window.parent.postMessage({type: 'jackcity-video-playing'}, location.origin);
    });
    audio.addEventListener('click', () => {
        const video = player.querySelector('video');
        if (!video) return;
        video.muted = !video.muted;
        audio.textContent = video.muted ? 'Unmute' : 'Mute';
    });
    window.addEventListener('pagehide', () => stream.disconnect());
} catch (failure) {
    console.error('Unable to load JACKCITY player', failure);
    error.hidden = false;
}
