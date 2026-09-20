// ==========================================
// 1. المتغيرات والإعدادات العامة
// ==========================================
const flipAudio = new Audio('flip.mp3');
let soundEnabled = true;
let currentPage = 1;
const totalPages = 6;
let pageFlipInstance = null;

// متغيرات التحكم بالتحريك والتكبير (Pan & Zoom)
let scale = 1;
let minScale = 1;
let maxScale = 3.5;
let pointX = 0;
let pointY = 0;
let startX = 0;
let startY = 0;
let isPanning = false;
let initialPinchDistance = null;
let lastTapTime = 0;

const bookContainer = document.getElementById('book-container');
const zoomWrapper = document.getElementById('zoom-wrapper');
const flipbookEl = document.getElementById('flipbook');

// ==========================================
// 2. إدارة الصوت والتفاعل الأول
// ==========================================
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

// ==========================================
// 3. المحرك الاحترافي للتكبير والتحريك (Pan & Zoom Engine)
// ==========================================
function updateTransform() {
    // تقييد الحركة لكي لا تخرج الصفحة خارج حدود الشاشة عند التكبير
    if (scale <= 1) {
        scale = 1;
        pointX = 0;
        pointY = 0;
        // إعادة التفاعل لمكتبة تقليب الصفحات عند الحجم الطبيعي
        flipbookEl.style.pointerEvents = "auto";
    } else {
        // تعطيل تفاعل مكتبة التقليب تماماً عند التكبير لمنع التداخل والتقليب العشوائي
        flipbookEl.style.pointerEvents = "none";
    }

    bookContainer.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
}

function applyZoom(newScale) {
    scale = Math.min(Math.max(minScale, newScale), maxScale);
    if (scale === 1) {
        pointX = 0;
        pointY = 0;
    }
    updateTransform();
}

function changeZoom(direction) {
    let targetScale = scale + (direction > 0 ? 0.5 : -0.5);
    applyZoom(targetScale);
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

// ==========================================
// 4. معالجة إيماءات اللمس (Pinch Zoom & Double Tap & Pan)
// ==========================================
function getPinchDistance(e) {
    return Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
    );
}

zoomWrapper.addEventListener('touchstart', (e) => {
    // 1. Double Tap Zoom
    if (e.touches.length === 1) {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTapTime;

        if (tapLength < 300 && tapLength > 0) {
            e.preventDefault();
            if (scale > 1) {
                applyZoom(1);
            } else {
                applyZoom(2.2);
            }
        } else if (scale > 1) {
            // بدء التحريك عند التكبير
            isPanning = true;
            startX = e.touches[0].clientX - pointX;
            startY = e.touches[0].clientY - pointY;
        }
        lastTapTime = currentTime;
    } 
    // 2. Pinch to Zoom
    else if (e.touches.length === 2) {
        isPanning = false;
        initialPinchDistance = getPinchDistance(e);
    }
}, { passive: false });

zoomWrapper.addEventListener('touchmove', (e) => {
    // معالجة Pinch Zoom بأصبعين
    if (e.touches.length === 2 && initialPinchDistance) {
        e.preventDefault();
        const newDistance = getPinchDistance(e);
        const factor = newDistance / initialPinchDistance;
        applyZoom(scale * factor);
        initialPinchDistance = newDistance;
    } 
    // معالجة السحب والتحريك بأصبع واحد عند التكبير
    else if (e.touches.length === 1 && isPanning && scale > 1) {
        e.preventDefault();
        pointX = e.touches[0].clientX - startX;
        pointY = e.touches[0].clientY - startY;
        updateTransform();
    }
}, { passive: false });

zoomWrapper.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
        initialPinchDistance = null;
    }
    if (e.touches.length === 0) {
        isPanning = false;
    }
});

// ==========================================
// 5. تهيئة مكتبة StPageFlip
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    pageFlipInstance = new St.PageFlip(flipbookEl, {
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

    pageFlipInstance.loadFromHTML(document.querySelectorAll('.page'));

    const hideTutorial = () => {
        const tutorial = document.getElementById('tutorial');
        if (tutorial) tutorial.classList.add('hidden');
    };
    
    document.body.addEventListener('touchstart', hideTutorial, { once: true });
    document.body.addEventListener('mousedown', hideTutorial, { once: true });

    document.getElementById('btn-prev').addEventListener('click', () => {
        if (scale === 1) pageFlipInstance.flipPrev();
        hideTutorial();
    });
    
    document.getElementById('btn-next').addEventListener('click', () => {
        if (scale === 1) pageFlipInstance.flipNext();
        hideTutorial();
    });

    pageFlipInstance.on('flip', (e) => {
        playPaperSound();
        currentPage = e.data + 1;
        document.getElementById('counter').innerText = `${currentPage} / ${totalPages}`;
    });
});