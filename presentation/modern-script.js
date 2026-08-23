// ============================================
// 모던 웹사이트 스크립트
// ============================================

// URL 설정 (나중에 실제 URL로 변경하세요)
const URLS = {
    ELEVATOR: '', // 실시간 엘리베이터 모니터링 URL
    CAMERA: '',   // 현장 카메라 URL
    VIDEO: '',    // 문제 정의 영상 URL
    WEBPAGE: '',  // 라이브 시연 웹페이지 URL
    PHONE: ''     // 스마트폰 중계 화면 URL
};

// DOM 요소
const navbar = document.querySelector('.navbar');
const navToggle = document.getElementById('navToggle');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-link');

// 라이브 대시보드 요소
const elevatorIframe = document.getElementById('elevatorIframe');
const elevatorPlaceholder = document.getElementById('elevatorPlaceholder');
const cameraIframe = document.getElementById('cameraIframe');
const cameraPlaceholder = document.getElementById('cameraPlaceholder');
const elevatorSplitIframe = document.getElementById('elevatorSplitIframe');
const elevatorSplitPlaceholder = document.getElementById('elevatorSplitPlaceholder');
const cameraSplitIframe = document.getElementById('cameraSplitIframe');
const cameraSplitPlaceholder = document.getElementById('cameraSplitPlaceholder');

// 히어로 섹션 요소
const heroIframe1 = document.getElementById('heroIframe1');
const heroPlaceholder1 = document.getElementById('heroPlaceholder1');
const heroIframe2 = document.getElementById('heroIframe2');
const heroPlaceholder2 = document.getElementById('heroPlaceholder2');

// 문제 정의 영상 요소
const problemVideo = document.getElementById('problemVideo');
const videoPlaceholder = document.getElementById('videoPlaceholder');

// ============================================
// 네비게이션 기능
// ============================================

// 스크롤 시 네비게이션 스타일 변경
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }

    // 현재 섹션 활성화
    updateActiveNavLink();
});

// 모바일 메뉴 토글
navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navMenu.classList.toggle('show');
});

// 네비게이션 링크 클릭
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href');
        const targetSection = document.querySelector(targetId);

        if (targetSection) {
            // 모바일 메뉴 닫기
            navToggle.classList.remove('active');
            navMenu.classList.remove('show');

            // 부드러운 스크롤
            const offsetTop = targetSection.offsetTop - 80; // 네비게이션 높이 고려
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// 현재 섹션 감지 및 활성화
function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const scrollPos = window.scrollY + 100;

    sections.forEach(section => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        const id = section.getAttribute('id');

        if (scrollPos >= top && scrollPos < top + height) {
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${id}`) {
                    link.classList.add('active');
                }
            });
        }
    });
}

// ============================================
// 탭 기능
// ============================================

const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;

        // 버튼 활성화
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // 콘텐츠 표시
        tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === `${tabId}-tab`) {
                content.classList.add('active');
            }
        });
    });
});

// ============================================
// Iframe 초기화 및 관리
// ============================================

function initializeIframe(iframe, placeholder, url) {
    if (url && url.trim() !== '') {
        iframe.src = url;
        iframe.classList.add('active');
        if (placeholder) {
            placeholder.classList.add('hidden');
        }
    }
}

function initializeVideo(video, placeholder, url) {
    if (url && url.trim() !== '') {
        video.src = url;
        video.classList.add('active');
        if (placeholder) {
            placeholder.classList.add('hidden');
        }
    }
}

// URL 설정 함수
function setUrl(type, url) {
    URLS[type] = url;
    console.log(`${type} URL이 설정되었습니다:`, url);
}

// URL 동적 변경 함수
function updateElevatorUrl(url) {
    if (url && url.trim() !== '') {
        elevatorIframe.src = url;
        elevatorSplitIframe.src = url;

        elevatorIframe.classList.add('active');
        elevatorSplitIframe.classList.add('active');

        elevatorPlaceholder.classList.add('hidden');
        elevatorSplitPlaceholder.classList.add('hidden');
    } else {
        elevatorIframe.src = '';
        elevatorSplitIframe.src = '';

        elevatorIframe.classList.remove('active');
        elevatorSplitIframe.classList.remove('active');

        elevatorPlaceholder.classList.remove('hidden');
        elevatorSplitPlaceholder.classList.remove('hidden');
    }
}

function updateCameraUrl(url) {
    if (url && url.trim() !== '') {
        cameraIframe.src = url;
        cameraSplitIframe.src = url;

        cameraIframe.classList.add('active');
        cameraSplitIframe.classList.add('active');

        cameraPlaceholder.classList.add('hidden');
        cameraSplitPlaceholder.classList.add('hidden');
    } else {
        cameraIframe.src = '';
        cameraSplitIframe.src = '';

        cameraIframe.classList.remove('active');
        cameraSplitIframe.classList.remove('active');

        cameraPlaceholder.classList.remove('hidden');
        cameraSplitPlaceholder.classList.remove('hidden');
    }
}

function updateVideoUrl(url) {
    if (url && url.trim() !== '') {
        problemVideo.src = url;
        problemVideo.classList.add('active');
        videoPlaceholder.classList.add('hidden');
    } else {
        problemVideo.src = '';
        problemVideo.classList.remove('active');
        videoPlaceholder.classList.remove('hidden');
    }
}

function updateHeroUrls(elevatorUrl, cameraUrl) {
    if (elevatorUrl && elevatorUrl.trim() !== '') {
        heroIframe1.src = elevatorUrl;
        heroIframe1.classList.add('active');
        heroPlaceholder1.classList.add('hidden');
    } else {
        heroIframe1.src = '';
        heroIframe1.classList.remove('active');
        heroPlaceholder1.classList.remove('hidden');
    }

    if (cameraUrl && cameraUrl.trim() !== '') {
        heroIframe2.src = cameraUrl;
        heroIframe2.classList.add('active');
        heroPlaceholder2.classList.add('hidden');
    } else {
        heroIframe2.src = '';
        heroIframe2.classList.remove('active');
        heroPlaceholder2.classList.remove('hidden');
    }
}

// ============================================
// 실시간 데이터 시뮬레이션
// ============================================

function simulateLiveData() {
    // 현재 층 (1~15층 랜덤)
    const currentFloor = Math.floor(Math.random() * 15) + 1;
    document.getElementById('currentFloor').textContent = currentFloor + '층';

    // 방향 (상행/하행/정지)
    const directions = ['상행', '하행', '정지'];
    const direction = directions[Math.floor(Math.random() * directions.length)];
    document.getElementById('direction').textContent = direction;

    // 문 상태 (열림/닫힘)
    const doorStates = ['열림', '닫힘'];
    const doorState = doorStates[Math.floor(Math.random() * doorStates.length)];
    document.getElementById('doorStatus').textContent = doorState;

    // 오늘 운행 횟수
    const todayRuns = Math.floor(Math.random() * 200) + 100;
    document.getElementById('todayRuns').textContent = todayRuns + '회';
}

// 실시간 데이터 업데이트 (5초마다)
setInterval(simulateLiveData, 5000);

// 초기 데이터 설정
simulateLiveData();

// ============================================
// 스크롤 애니메이션
// ============================================

// 요소가 화면에 들어올 때 애니메이션
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

// 애니메이션 적용할 요소 선택
const animatedElements = document.querySelectorAll(
    '.problem-card, .hardware-card, .feature-block, .benefit-card, .future-item'
);

animatedElements.forEach(el => {
    observer.observe(el);
});

// CSS 애니메이션 클래스 추가
const style = document.createElement('style');
style.textContent = `
    .problem-card, .hardware-card, .feature-block, .benefit-card, .future-item {
        opacity: 0;
        transform: translateY(30px);
        transition: all 0.6s ease;
    }

    .problem-card.visible, .hardware-card.visible, .feature-block.visible,
    .benefit-card.visible, .future-item.visible {
        opacity: 1;
        transform: translateY(0);
    }

    .problem-card.visible:nth-child(1), .hardware-card.visible:nth-child(1) {
        transition-delay: 0.1s;
    }

    .problem-card.visible:nth-child(2), .hardware-card.visible:nth-child(2) {
        transition-delay: 0.2s;
    }

    .problem-card.visible:nth-child(3), .hardware-card.visible:nth-child(3) {
        transition-delay: 0.3s;
    }

    .problem-card.visible:nth-child(4), .hardware-card.visible:nth-child(4) {
        transition-delay: 0.4s;
    }
`;
document.head.appendChild(style);

// ============================================
// 부드러운 스크롤
// ============================================

// 링크 클릭 시 부드러운 스크롤
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offsetTop = target.offsetTop - 80; // 네비게이션 높이 고려
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// ============================================
// 초기화
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // URL이 설정되어 있으면 iframe 초기화
    if (URLS.ELEVATOR) {
        initializeIframe(elevatorIframe, elevatorPlaceholder, URLS.ELEVATOR);
        initializeIframe(elevatorSplitIframe, elevatorSplitPlaceholder, URLS.ELEVATOR);
    }

    if (URLS.CAMERA) {
        initializeIframe(cameraIframe, cameraPlaceholder, URLS.CAMERA);
        initializeIframe(cameraSplitIframe, cameraSplitPlaceholder, URLS.CAMERA);
    }

    // 문제 정의 영상 로드 처리
    if (problemVideo) {
        problemVideo.addEventListener('loadeddata', () => {
            console.log('문제 정의 영상이 로드되었습니다.');
            if (videoPlaceholder) {
                videoPlaceholder.style.display = 'none';
            }
            problemVideo.style.display = 'block';
        });

        problemVideo.addEventListener('error', () => {
            console.error('영상 로드 실패');
            if (videoPlaceholder) {
                videoPlaceholder.style.display = 'block';
                videoPlaceholder.querySelector('h4').textContent = '영상을 찾을 수 없습니다';
                videoPlaceholder.querySelector('p').textContent = '피지컬AI_오프닝영상.mp4 파일을 확인하세요';
            }
        });
    }

    // 히어로 섹션 URLs
    if (URLS.ELEVATOR) {
        initializeIframe(heroIframe1, heroPlaceholder1, URLS.ELEVATOR);
    }

    if (URLS.CAMERA) {
        initializeIframe(heroIframe2, heroPlaceholder2, URLS.CAMERA);
    }

    console.log('스마트 엘리베이터 자동화 시스템 웹사이트가 초기화되었습니다.');
    console.log('URL을 설정하려면 다음 함수를 사용하세요:');
    console.log('setUrl("ELEVATOR", "your-url")');
    console.log('setUrl("CAMERA", "your-url")');
    console.log('setUrl("VIDEO", "your-url")');
});

// ============================================
// API 인터페이스 (외부에서 호출 가능)
// ============================================

// 전역 객체로 노출
window.SmartElevatorApp = {
    setUrl,
    updateElevatorUrl,
    updateCameraUrl,
    updateVideoUrl,
    updateHeroUrls,
    simulateLiveData
};

// 콘솔 안내
console.log('%c스마트 엘리베이터 자동화 시스템', 'color: #2563eb; font-size: 20px; font-weight: bold;');
console.log('%c웹사이트 API가 로드되었습니다.', 'color: #64748b; font-size: 14px;');