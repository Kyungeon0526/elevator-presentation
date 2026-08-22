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
    }
});

// 도트 클릭 이벤트
dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        showSlide(index);
    });
});

// 헤더 네비게이션 클릭 이벤트
navItems.forEach((item) => {
    const section = parseInt(item.dataset.section) - 1;
    item.addEventListener('click', () => {
        showSlide(section);
    });
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
    showSlide(0);
    updateButtons(0);
    updateNavItems(0);
});

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