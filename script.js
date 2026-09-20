const flipAudio = new Audio('flip.mp3');
let soundEnabled = true;
let currentPage = 1;
const totalPages = 6;

// متغيرات التحكم بالزوم والتحريك
let currentScale = 1;
let minScale = 1;
let maxScale = 4;
let currentX = 0;
let currentY = 0;
let startX = 0;
let startY = 0;
let initialPinchDistance = null;
let lastTapTime = 0;

const container = document.getElementById('book-container');
const zoomWrapper = document.getElementById('zoom-wrapper');

// تفعيل الصوت عند أول تفاعل
const unlockAudio = () => {
    flipAudio.play().then(() => {
        flipAudio.pause();
        flipAudio.currentTime = 0;
    }).catch(() => {});
    document.removeEventListener('touchstart', unlockAudio);
    document.removeEventListener('click', unlockAudio);
};
document.addEventListener('touchstart', unlockAudio, { once: true });
document.addEventListener('click', unlockAudio, { once: true });

function playPaperSound() {
    if (!soundEnabled) return;
    try {
        flipAudio.currentTime = 0;
        flipAudio.play().catch(() => {});
    } catch (e) {}
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    const icon = document.getElementById('sound-icon');
    icon.className = soundEnabled ? "fa-solid fa-volume-high" : "fa-solid fa-volume-xmark";
}

// تحديث موقع وحجم المنيو
function updateTransform() {
    if (currentScale <= 1) {
        currentScale = 1;
        currentX = 0;
        currentY = 0;
    }
    container.style.transform = `translate(${currentX}px, ${currentY}px) scale(${currentScale})`;
}

// زوم الأزرار
function changeZoom(delta) {
    let newScale = currentScale + delta;
    newScale = Math.min(Math.max(minScale, newScale), maxScale);
    currentScale = newScale;
    updateTransform();
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// حظر التقليب تماماً عند التكبير
const flipbookEl = document.getElementById('flipbook');

function blockFlipWhenZoomed(e) {
    if (currentScale > 1) {
        e.stopPropagation();
    }
}

['touchstart', 'touchmove', 'touchend', 'pointerdown', 'pointermove', 'pointerup'].forEach(eventType => {
    flipbookEl.addEventListener(eventType, blockFlipWhenZoomed, { capture: true });
});

// التعامل مع لمس الشاشة (Pinch Zoom & Double Tap)
function getPinchDistance(e) {
    return Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
    );
}

zoomWrapper.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        const now = new Date().getTime();
        const timeDiff = now - lastTapTime;
        if (timeDiff < 300 && timeDiff > 0) {
            currentScale = currentScale > 1 ? 1 : 2.5;
            currentX = 0;
            currentY = 0;
            updateTransform();
            e.preventDefault();
        }
        lastTapTime = now;

        if (currentScale > 1) {
            startX = e.touches[0].clientX - currentX;
            startY = e.touches[0].clientY - currentY;
        }
    } else if (e.touches.length === 2) {
        initialPinchDistance = getPinchDistance(e);
    }
}, { passive: false });

zoomWrapper.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && initialPinchDistance) {
        e.preventDefault();
        const newDistance = getPinchDistance(e);
        const zoomFactor = newDistance / initialPinchDistance;
        
        let targetScale = currentScale * zoomFactor;
        currentScale = Math.min(Math.max(minScale, targetScale), maxScale);
        initialPinchDistance = newDistance;
        updateTransform();
    } else if (e.touches.length === 1 && currentScale > 1) {
        e.preventDefault();
        currentX = e.touches[0].clientX - startX;
        currentY = e.touches[0].clientY - startY;
        updateTransform();
    }
}, { passive: false });

zoomWrapper.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
        initialPinchDistance = null;
    }
});

// تهيئة مكتبة التقليب
document.addEventListener('DOMContentLoaded', function() {
    const pageFlip = new St.PageFlip(flipbookEl, {
        width: 450,
        height: 650,
        size: 'stretch',
        minWidth: 300,
        maxWidth: 1000,
        minHeight: 400,
        maxHeight: 1200,
        maxShadowOpacity: 0.4, 
        showCover: true, 
        usePortrait: true, 
        mobileScrollSupport: false,
        flippingTime: 600
    });

    pageFlip.loadFromHTML(document.querySelectorAll('.page'));

    const hideTutorial = () => {
        const tutorial = document.getElementById('tutorial');
        if (tutorial) tutorial.classList.add('hidden');
    };
    
    document.body.addEventListener('touchstart', hideTutorial, { once: true });
    document.body.addEventListener('mousedown', hideTutorial, { once: true });

    document.getElementById('btn-prev').addEventListener('click', () => {
        pageFlip.flipPrev();
        hideTutorial();
    });
    
    document.getElementById('btn-next').addEventListener('click', () => {
        pageFlip.flipNext();
        hideTutorial();
    });

    pageFlip.on('flip', (e) => {
        playPaperSound();
        currentPage = e.data + 1;
        document.getElementById('counter').innerText = `${currentPage} / ${totalPages}`;
    });
});