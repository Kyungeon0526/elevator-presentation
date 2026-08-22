// 슬라이드 네비게이션
const slides = document.querySelectorAll('.slide');
const dots = document.querySelectorAll('.dot');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const progressDisplay = document.getElementById('progress');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const notesBtn = document.getElementById('notesBtn');
const presenterNotes = document.getElementById('presenterNotes');
const closeNotes = document.getElementById('closeNotes');
const notesBody = document.getElementById('notesBody');

// 헤더 네비게이션
const navItems = document.querySelectorAll('.nav-item');

// 웹사이트 iframe
const websiteIframe = document.getElementById('websiteIframe');
const iframePlaceholder = document.getElementById('iframePlaceholder');

// 라이브 시연 iframe
const webpageIframe = document.getElementById('webpageIframe');
const webpagePlaceholder = document.getElementById('webpagePlaceholder');
const phoneIframe = document.getElementById('phoneIframe');
const phonePlaceholder = document.getElementById('phonePlaceholder');

// 문제 정의 영상
const problemVideo = document.getElementById('problemVideo');
const videoPlaceholder = document.getElementById('videoPlaceholder');

// ============================================
// 웹사이트 URL 설정 (나중에 실제 URL로 변경하세요)
// ============================================
const WEBSITE_URL = ''; // 예: 'http://192.168.1.100:8080' 또는 'http://localhost:3000'

// ============================================
// 라이브 시연 URL 설정 (나중에 실제 URL로 변경하세요)
// ============================================
const WEBPAGE_URL = '';  // 우리가 만든 웹페이지 URL
const PHONE_URL = '';     // 스마트폰 중계 화면 URL (WebSocket 등)

// ============================================
// 문제 정의 영상 URL 설정 (나중에 실제 URL로 변경하세요)
// ============================================
const VIDEO_URL = ''; // 예: './problem_video.mp4' 또는 './videos/elevator_issue.mp4'

let currentSlide = 0;
const totalSlides = slides.length;

// 발표자 노트 내용
const notes = [
    "<strong>섹션 1:</strong> 문제 상황과 해결 목표를 명확히 설명하세요. 사용자가 겪는 불편함과 우리가 해결하려는 문제를 강조하세요.",

    "<strong>섹션 2:</strong> 프로젝트의 전체적인 개요를 설명하세요. ESP32-S3 Sense를 사용하는 이유와 프로젝트의 목표를 명확히 전달하세요.",

    "<strong>섹션 3:</strong> 사용한 하드웨어를 하나씩 설명하세요. ESP32-S3 Sense의 카메라 기능과 각 센서의 역할을 설명하세요.",

    "<strong>섹션 4:</strong> 닫힘 버튼 자동 누름 기능의 작동 원리를 설명하세요. 카메라로 상황을 학습하고 서브모터로 버튼을 누르는 과정을 설명하세요.",

    "<strong>섹션 5:</strong> 층수 디텍팅 기능을 자세히 설명하세요. 7-segment 숫자 인식 방식과 API 엔드포인트를 설명하세요.",

    "<strong>섹션 6:</strong> 웹사이트의 두 가지 페이지 기능을 설명하세요. 메인 페이지의 실시간 모니터링과 디버깅 페이지의 기능을 설명하세요.",

    "<strong>섹션 7:</strong> 초음파 센서 기능을 설명하세요. 문 상태 감지와 총 닫힌 횟수 계산이 어떻게 이루어지는지 설명하세요.",

    "<strong>섹션 8:</strong> 라이브 시연 섹션입니다. 실제 시연을 진행하거나 데모 영상을 보여주세요.",

    "<strong>섹션 9:</strong> 기대효과를 설명하세요. 사용자 편의성 향상과 정보 접근성, 실효성 데이터 수집의 가치를 설명하세요.",

    "<strong>섹션 10:</strong> 결론 섹션입니다. 프로젝트의 요약과 다음 단계를 설명하며 발표를 마무리하세요."
];

// 현재 슬라이드 표시
function showSlide(index) {
    // 인덱스 범위 확인
    if (index < 0) index = 0;
    if (index >= totalSlides) index = totalSlides - 1;

    currentSlide = index;

    // 슬라이드 활성/비활성
    slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
    });

    // 도트 업데이트
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });

    // 진행률 업데이트
    updateProgress(index);

    // 버튼 상태 업데이트
    updateButtons(index);

    // 발표자 노트 업데이트
    updateNotes(index);

    // 헤더 네비게이션 업데이트
    updateNavItems(index);
}

// 진행률 업데이트
function updateProgress(index) {
    progressDisplay.textContent = `${index + 1}/${totalSlides}`;
}

// 버튼 상태 업데이트
function updateButtons(index) {
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === totalSlides - 1;
}

// 발표자 노트 업데이트
function updateNotes(index) {
    if (notes[index]) {
        notesBody.innerHTML = `<p>${notes[index]}</p>`;
    }
}

// 헤더 네비게이션 업데이트
function updateNavItems(index) {
    navItems.forEach((item, i) => {
        item.classList.toggle('active', i === index);
    });
}

// 다음 슬라이드
function nextSlide() {
    if (currentSlide < totalSlides - 1) {
        showSlide(currentSlide + 1);
    }
}

// 이전 슬라이드
function prevSlide() {
    if (currentSlide > 0) {
        showSlide(currentSlide - 1);
    }
}

// 풀스크린 모드
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
            document.body.classList.add('fullscreen-mode');
        }).catch(err => {
            console.log('풀스크린 오류:', err);
        });
    } else {
        document.exitFullscreen().then(() => {
            document.body.classList.remove('fullscreen-mode');
        }).catch(err => {
            console.log('풀스크린 종료 오류:', err);
        });
    }
}

// 발표자 노트 토글
function toggleNotes() {
    presenterNotes.classList.toggle('show');
}

// 이벤트 리스너
prevBtn.addEventListener('click', prevSlide);
nextBtn.addEventListener('click', nextSlide);
fullscreenBtn.addEventListener('click', toggleFullscreen);
notesBtn.addEventListener('click', toggleNotes);
closeNotes.addEventListener('click', toggleNotes);

// 키보드 네비게이션
document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'ArrowRight':
            nextSlide();
            break;
        case 'ArrowLeft':
            prevSlide();
            break;
        case 'f':
        case 'F':
            toggleFullscreen();
            break;
        case 'n':
        case 'N':
            toggleNotes();
            break;
        case 'Home':
            showSlide(0);
            break;
        case 'End':
            showSlide(totalSlides - 1);
            break;
        case 'Escape':
            closeMobileMenu();
            break;
    }
});

// 모바일 메뉴 기능
const hamburgerBtn = document.getElementById('hamburgerBtn');
const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
const mobileMenuClose = document.getElementById('mobileMenuClose');
const mobileNavItems = document.querySelectorAll('.mobile-nav-item');

function openMobileMenu() {
    mobileMenuOverlay.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
    mobileMenuOverlay.classList.remove('show');
    document.body.style.overflow = '';
}

// 햄버거 버튼 클릭
hamburgerBtn.addEventListener('click', openMobileMenu);

// 닫기 버튼 클릭
mobileMenuClose.addEventListener('click', closeMobileMenu);

// 오버레이 클릭 시 닫기
mobileMenuOverlay.addEventListener('click', (e) => {
    if (e.target === mobileMenuOverlay) {
        closeMobileMenu();
    }
});

// 모바일 메뉴 아이템 클릭
mobileNavItems.forEach((item) => {
    const section = parseInt(item.dataset.section) - 1;
    item.addEventListener('click', () => {
        showSlide(section);
        closeMobileMenu();
    });
});

// 도트 클릭 이벤트
dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        showSlide(index);
    });
});

// 헤더 네비게이션 클릭 이벤트
navItems.forEach((item) => {
    if (item.dataset.section) {
        const section = parseInt(item.dataset.section) - 1;
        item.addEventListener('click', () => {
            showSlide(section);
        });
    }
});

// 풀스크린 변경 감지
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        document.body.classList.remove('fullscreen-mode');
    }
});

// 터치 스와이프 지원 (모바일)
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            nextSlide(); // 왼쪽으로 스와이프 = 다음
        } else {
            prevSlide(); // 오른쪽으로 스와이프 = 이전
        }
    }
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    initializeWebsite();
    initializeLiveDemo();
    initializeVideo();
    setupScrollEffects();
    setupNavigation();
});

// 웹사이트 iframe 초기화
function initializeWebsite() {
    if (WEBSITE_URL && WEBSITE_URL.trim() !== '') {
        websiteIframe.src = WEBSITE_URL;
        websiteIframe.classList.add('active');
        iframePlaceholder.classList.add('hidden');
    }
}

// 라이브 시연 iframe 초기화
function initializeLiveDemo() {
    if (WEBPAGE_URL && WEBPAGE_URL.trim() !== '') {
        webpageIframe.src = WEBPAGE_URL;
        webpageIframe.classList.add('active');
        webpagePlaceholder.classList.add('hidden');
    }

    if (PHONE_URL && PHONE_URL.trim() !== '') {
        phoneIframe.src = PHONE_URL;
        phoneIframe.classList.add('active');
        phonePlaceholder.classList.add('hidden');
    }
}

// 문제 정의 영상 초기화
function initializeVideo() {
    if (VIDEO_URL && VIDEO_URL.trim() !== '') {
        problemVideo.src = VIDEO_URL;
        problemVideo.classList.add('active');
        videoPlaceholder.classList.add('hidden');
    }
}

// 웹사이트 URL 동적으로 변경
function setWebsiteUrl(url) {
    if (url && url.trim() !== '') {
        websiteIframe.src = url;
        websiteIframe.classList.add('active');
        iframePlaceholder.classList.add('hidden');
        console.log('웹사이트 URL이 설정되었습니다:', url);
    } else {
        websiteIframe.src = '';
        websiteIframe.classList.remove('active');
        iframePlaceholder.classList.remove('hidden');
        console.log('웹사이트 URL이 초기화되었습니다.');
    }
}

// 라이브 시연 URL 동적으로 변경
function setLiveDemoUrls(webpageUrl, phoneUrl) {
    if (webpageUrl && webpageUrl.trim() !== '') {
        webpageIframe.src = webpageUrl;
        webpageIframe.classList.add('active');
        webpagePlaceholder.classList.add('hidden');
        console.log('웹페이지 URL이 설정되었습니다:', webpageUrl);
    } else {
        webpageIframe.src = '';
        webpageIframe.classList.remove('active');
        webpagePlaceholder.classList.remove('hidden');
        console.log('웹페이지 URL이 초기화되었습니다.');
    }

    if (phoneUrl && phoneUrl.trim() !== '') {
        phoneIframe.src = phoneUrl;
        phoneIframe.classList.add('active');
        phonePlaceholder.classList.add('hidden');
        console.log('스마트폰 URL이 설정되었습니다:', phoneUrl);
    } else {
        phoneIframe.src = '';
        phoneIframe.classList.remove('active');
        phonePlaceholder.classList.remove('hidden');
        console.log('스마트폰 URL이 초기화되었습니다.');
    }
}

// 문제 정의 영상 URL 동적으로 변경
function setVideoUrl(url) {
    if (url && url.trim() !== '') {
        problemVideo.src = url;
        problemVideo.classList.add('active');
        videoPlaceholder.classList.add('hidden');
        console.log('영상 URL이 설정되었습니다:', url);
    } else {
        problemVideo.src = '';
        problemVideo.classList.remove('active');
        videoPlaceholder.classList.remove('hidden');
        console.log('영상 URL이 초기화되었습니다.');
    }
}

// 스크롤 효과 설정
function setupScrollEffects() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    slides.forEach(slide => {
        observer.observe(slide);
    });
}

// 네비게이션 설정
function setupNavigation() {
    navItems.forEach(item => {
        const section = parseInt(item.dataset.section) - 1;
        item.addEventListener('click', () => {
            const targetSlide = slides[section];
            if (targetSlide) {
                targetSlide.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// 자동 슬라이드 (옵션 - 필요시 주석 해제)
/*
let autoSlideInterval;

function startAutoSlide(interval = 5000) {
    autoSlideInterval = setInterval(() => {
        if (currentSlide < totalSlides - 1) {
            nextSlide();
        } else {
            showSlide(0); // 마지막에서 처음으로
        }
    }, interval);
}

function stopAutoSlide() {
    clearInterval(autoSlideInterval);
}

// 자동 슬라이드 시작
startAutoSlide(8000); // 8초마다 자동으로 다음 슬라이드

// 사용자 상호작용 시 자동 슬라이드 일시 중지
document.addEventListener('keydown', () => {
    stopAutoSlide();
    startAutoSlide(10000); // 상호작용 후 10초마다
});

prevBtn.addEventListener('click', () => {
    stopAutoSlide();
    startAutoSlide(10000);
});

nextBtn.addEventListener('click', () => {
    stopAutoSlide();
    startAutoSlide(10000);
});

dots.forEach((dot) => {
    dot.addEventListener('click', () => {
        stopAutoSlide();
        startAutoSlide(10000);
    });
});
*/