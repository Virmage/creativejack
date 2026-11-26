const play = document.querySelector('.play');
const game = document.querySelector('.game');
const stream = game.querySelector('.stream');
const portfolio = document.querySelector('.portfolio-link');
const openingAudio = new URL('./opening.m4a', document.currentScript?.src ?? location.href);
if (portfolio && ['#work', '#about'].includes(location.hash)) {
    location.replace(portfolio.href + location.hash);
}
let openingCue;
const destination = new URL(play.href);
if (location.pathname === '/jackcity-preview.html') {
    const shareId = new URLSearchParams(location.search).get('share');
    if (shareId) destination.searchParams.set('share', shareId);
    play.href = destination.href;
}
if (destination.origin === location.origin && destination.pathname.endsWith('/player.html')) {
    const options = new URLSearchParams(location.search);
    if (options.get('touch') === '1') destination.searchParams.set('touch', '1');
    destination.searchParams.set('AutoConnect', 'true');
    play.href = destination.href;
}

play.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const player = document.createElement('iframe');
    player.title = 'JACKCITY streaming player';
    player.allow = 'autoplay; fullscreen; gamepad';
    player.allowFullscreen = true;
    player.src = play.href;
    stream.replaceChildren(player);
    game.showModal();
    openingCue = new Audio(openingAudio);
    openingCue.volume = 0.58;
    openingCue.play().catch(() => {});
});

window.addEventListener('message', event => {
    const player = stream.querySelector('iframe');
    if (player && event.source === player.contentWindow && event.origin === destination.origin
        && event.data?.type === 'jackcity-video-playing') {
        openingCue?.pause();
    }
});

game.querySelector('.exit-game').addEventListener('click', () => game.close());
game.addEventListener('close', () => {
    stream.replaceChildren();
    openingCue?.pause();
    openingCue = undefined;
    play.focus();
});
