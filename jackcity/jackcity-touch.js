// Attach phone controls once the stream player is initialized.
export function attachTouchControls(stream) {
    const touchPreview = new URLSearchParams(location.search).get('touch') === '1';
    if (!(window.matchMedia('(any-pointer: coarse)').matches || touchPreview)) return;

    const controls = document.createElement('div');
    controls.id = 'jackcity-touch';
    controls.hidden = true;
    controls.innerHTML = `
        <p class="touch-landscape">Turn your phone sideways to play</p>
        <button class="touch-toggle" type="button" aria-expanded="false">Game controls</button>
        <div class="touch-gameplay" hidden>
            <div class="touch-stick" aria-label="Move"><span></span></div>
            <p class="touch-help">Left stick to run · Drag the scene to look</p>
            <div class="touch-scroll" hidden>
                <button type="button" data-scroll="120" aria-label="Scroll up">↑</button>
                <button type="button" data-scroll="-120" aria-label="Scroll down">↓</button>
            </div>
            <div class="touch-actions">
                <button type="button" data-key="13">Enter</button>
                <button type="button" data-key="27">Menu / Back</button>
                <button type="button" data-key="77">Map</button>
                <button type="button" data-key="70">Talk / Discover</button>
                <button type="button" data-key="32">Jump</button>
                <button type="button" data-key="69">Interact</button>
            </div>
        </div>`;
    document.body.append(controls);

    const toggle = controls.querySelector('.touch-toggle');
    const gameplay = controls.querySelector('.touch-gameplay');
    const scroll = controls.querySelector('.touch-scroll');
    const stick = controls.querySelector('.touch-stick');
    const thumb = stick.firstElementChild;
    const movement = new Set();
    let stickPointer;
    const buttonKeys = new Map();
    const send = (pressed, key) => stream.toStreamerHandlers
        .get(pressed ? 'KeyDown' : 'KeyUp')?.(pressed ? [key, 0] : [key]);

    function moveWith(next) {
        for (const key of movement) {
            if (next.has(key)) continue;
            send(false, key);
            movement.delete(key);
        }
        for (const key of next) {
            if (movement.has(key)) continue;
            send(true, key);
            movement.add(key);
        }
    }

    function releaseStick() {
        stickPointer = undefined;
        thumb.style.transform = '';
        moveWith(new Set());
    }

    function releaseAll() {
        releaseStick();
        for (const key of buttonKeys.values()) send(false, key);
        buttonKeys.clear();
    }

    function moveStick(event) {
        const bounds = stick.getBoundingClientRect();
        const radius = bounds.width * 0.32;
        const x = (event.clientX - bounds.left - bounds.width / 2) / radius;
        const y = (event.clientY - bounds.top - bounds.height / 2) / radius;
        const distance = Math.hypot(x, y);
        const limit = Math.max(1, distance);
        thumb.style.transform = `translate(${radius * x / limit}px, ${radius * y / limit}px)`;
        const keys = new Set();
        if (distance >= 0.25) {
            const direction = Math.round(Math.atan2(y, x) / (Math.PI / 4));
            const octant = ((direction % 8) + 8) % 8;
            for (const key of [[68], [68, 83], [83], [83, 65], [65], [65, 87], [87], [87, 68]][octant]) {
                keys.add(key);
            }
        }
        moveWith(keys);
    }

    stick.addEventListener('pointerdown', event => {
        if (stickPointer !== undefined) return;
        event.preventDefault();
        stickPointer = event.pointerId;
        stick.setPointerCapture(stickPointer);
        moveStick(event);
    });
    stick.addEventListener('pointermove', event => {
        if (event.pointerId === stickPointer) moveStick(event);
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        stick.addEventListener(name, event => {
            if (event.pointerId === stickPointer) releaseStick();
        });
    }

    for (const button of controls.querySelectorAll('[data-key]')) {
        button.addEventListener('click', () => {
            if (buttonKeys.has(button)) return;
            const key = Number(button.dataset.key);
            if (key === 69) scroll.hidden = false;
            if (key === 27) scroll.hidden = true;
            buttonKeys.set(button, key);
            send(true, key);
            window.setTimeout(() => {
                if (!buttonKeys.delete(button)) return;
                send(false, key);
            }, 100);
        });
    }

    for (const button of scroll.querySelectorAll('button')) {
        button.addEventListener('click', () => {
            stream.toStreamerHandlers.get('MouseWheel')?.([Number(button.dataset.scroll), 32768, 32768]);
        });
    }

    toggle.addEventListener('click', () => {
        gameplay.hidden = !gameplay.hidden;
        toggle.setAttribute('aria-expanded', String(!gameplay.hidden));
        toggle.textContent = gameplay.hidden ? 'Game controls' : 'Hide controls';
        if (gameplay.hidden) {
            releaseAll();
            scroll.hidden = true;
        }
    });
    stream.addEventListener('videoInitialized', () => {
        controls.hidden = false;
        gameplay.hidden = false;
        toggle.setAttribute('aria-expanded', 'true');
        toggle.textContent = 'Hide controls';
    });
    stream.addEventListener('webRtcDisconnected', () => {
        releaseAll();
        controls.hidden = true;
    });
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) releaseAll();
    });
}
