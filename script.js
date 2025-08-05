class HanomaKeyboard {
    constructor(options) {
        // 주요 DOM 요소
        this.display = document.getElementById(options.displayId);
        this.keyboardContainer = document.getElementById(options.keyboardContainerId);
        this.layerButtons = document.querySelectorAll(options.layerButtonSelector);
        
        // 한글 조합 상수
        this.CHOSUNG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
        this.JUNGSUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
        this.JONGSUNG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
        this.DOUBLE_FINAL = {'ㄱㅅ':'ㄳ','ㄴㅈ':'ㄵ','ㄴㅎ':'ㄶ','ㄹㄱ':'ㄺ','ㄹㅁ':'ㄻ','ㄹㅂ':'ㄼ', 'ㄹㅅ':'ㄽ','ㄹㅌ':'ㄾ','ㄹㅍ':'ㄿ', 'ㄹㅎ':'ㅀ','ㅂㅅ':'ㅄ'};
        this.REVERSE_DOUBLE_FINAL = Object.fromEntries(Object.entries(this.DOUBLE_FINAL).map(([key, val]) => [val, key.split('')]));

        // 키보드 상태
        this.state = {
            lastCharInfo: null,
            capsLock: false,
            scale: 1.0,
            activeLayer: 'KR',
            isPointerDown: false,
            pointerMoved: false,
            clickTimeout: null // 더블클릭 판별을 위한 타이머
        };
        
        this.init();
    }

    init() {
        this.loadSettings();
        this.attachEventListeners();
        this.switchLayer('KR'); // 초기 레이어 설정
    }

    loadSettings() {
        // 저장된 스케일 값 불러오기
        const savedScale = localStorage.getItem('keyboardScale');
        if (savedScale) {
            this.state.scale = parseFloat(savedScale);
            this.applyScale();
        }
    }
    
    // 모든 이벤트 리스너 등록
    attachEventListeners() {
        // 키 입력 이벤트 (클릭, 더블클릭, 드래그)
        document.querySelectorAll('[data-click]').forEach(el => {
            let startX = 0, startY = 0;

            el.addEventListener('pointerdown', e => {
                this.state.isPointerDown = true;
                this.state.pointerMoved = false;
                startX = e.clientX;
                startY = e.clientY;
            });

            el.addEventListener('pointermove', e => {
                if (this.state.isPointerDown && (Math.abs(e.clientX - startX) > 10 || Math.abs(e.clientY - startY) > 10)) {
                    this.state.pointerMoved = true;
                }
            });

            el.addEventListener('pointerup', e => {
                if (this.state.pointerMoved) {
                    // [수정] data-drag 값이 없으면 data-click 값을 사용
                    this.handleInput(el.dataset.drag || el.dataset.click);
                }
                this.state.isPointerDown = false;
            });
            
            el.addEventListener('click', e => {
                e.preventDefault();
                if (this.state.pointerMoved) {
                    return;
                }
                if (!this.state.clickTimeout) {
                    this.state.clickTimeout = setTimeout(() => {
                        this.handleInput(el.dataset.click);
                        this.state.clickTimeout = null;
                    }, 250);
                }
            });

            el.addEventListener('dblclick', e => {
                e.preventDefault();
                if (this.state.clickTimeout) {
                    clearTimeout(this.state.clickTimeout);
                    this.state.clickTimeout = null;
                }
                // [수정] data-dblclick 값이 없으면 data-click 값을 사용
                this.handleInput(el.dataset.dblclick || el.dataset.click);
            });
        });

        // 기능 버튼 이벤트
        document.getElementById('backspace').addEventListener('click', () => this.backspace());
        document.getElementById('space').addEventListener('click', () => this.handleInput(' '));
        document.getElementById('refresh-btn').addEventListener('click', () => this.clear());
        document.getElementById('copy-btn').addEventListener('click', () => this.copyToClipboard());
        document.getElementById('caps-btn').addEventListener('click', () => this.toggleCapsLock());
        document.getElementById('scale-up').addEventListener('click', () => this.setScale(this.state.scale + 0.01));
        document.getElementById('scale-down').addEventListener('click', () => this.setScale(this.state.scale - 0.01));
        document.getElementById('hand-right').addEventListener('click', () => this.setHandedness('right-handed'));
        document.getElementById('hand-left').addEventListener('click', () => this.setHandedness('left-handed'));
        
        this.layerButtons.forEach(btn => {
            btn.addEventListener('click', () => this.switchLayer(btn.dataset.layer));
        });
    }

    // 범용 입력 처리기
    handleInput(char) {
        if (typeof char !== 'string' || !char.trim() && char !== ' ') return;
        
        const isKR = this.CHOSUNG.includes(char) || this.JUNGSUNG.includes(char);

        if (this.state.activeLayer === 'KR' && isKR) {
            this.composeHangul(char);
        } else {
            // 한글, 숫자, 심볼, 영어 입력
            this.state.lastCharInfo = null; // 한글 조합 상태 초기화
            let charToInsert = char;

            if (this.state.activeLayer === 'EN' && this.state.capsLock && /^[a-z]$/.test(char)) {
                charToInsert = char.toUpperCase();
            }
            this.display.value += charToInsert;
        }
    }

    // 한글 조합
    composeHangul(char) {
        const last = this.state.lastCharInfo;
        const isChosung = this.CHOSUNG.includes(char);
        const isJungsung = this.JUNGSUNG.includes(char);

        if (isChosung) {
            if (last && last.type === 'CVJ' && this.DOUBLE_FINAL[last.jong + char]) { // 겹받침 조합
                this.removeLastChar();
                const newJong = this.DOUBLE_FINAL[last.jong + char];
                this.display.value += this.combineCode(last.cho, last.jung, newJong);
                this.state.lastCharInfo = { type: 'CVJ', cho: last.cho, jung: last.jung, jong: newJong };
            } else if (last && last.type === 'CV') { // 종성 추가
                this.removeLastChar();
                this.display.value += this.combineCode(last.cho, last.jung, char);
                this.state.lastCharInfo = { type: 'CVJ', cho: last.cho, jung: last.jung, jong: char };
            } else { // 초성 입력
                this.display.value += char;
                this.state.lastCharInfo = { type: 'C', cho: char };
            }
        } else if (isJungsung) {
            if (last?.type === 'CVJ') { // 종성 분리 후 새 글자 조합
                const double = this.REVERSE_DOUBLE_FINAL[last.jong];
                if (double) { // 겹받침 분리
                    this.removeLastChar();
                    this.display.value += this.combineCode(last.cho, last.jung, double[0]);
                    this.display.value += this.combineCode(double[1], char);
                    this.state.lastCharInfo = { type: 'CV', cho: double[1], jung: char };
                } else { // 홑받침 분리
                    this.removeLastChar();
                    this.display.value += this.combineCode(last.cho, last.jung);
                    this.display.value += this.combineCode(last.jong, char);
                    this.state.lastCharInfo = { type: 'CV', cho: last.jong, jung: char };
                }
            } else if (last?.type === 'C') { // 중성 추가
                this.removeLastChar();
                this.display.value += this.combineCode(last.cho, char);
                this.state.lastCharInfo = { type: 'CV', cho: last.cho, jung: char };
            } else { // 모음 단독 입력
                this.display.value += char;
                this.state.lastCharInfo = null;
            }
        }
    }
    
    combineCode(cho, jung, jong = '') {
        const ci = this.CHOSUNG.indexOf(cho);
        const ji = this.JUNGSUNG.indexOf(jung);
        const joi = this.JONGSUNG.indexOf(jong);
        if (ci < 0 || ji < 0) return cho + jung; // 조합 실패 시 글자 반환
        return String.fromCharCode(0xAC00 + (ci * 21 + ji) * 28 + joi);
    }
    
    // 기능 함수들
    removeLastChar() { this.display.value = this.display.value.slice(0, -1); }
    backspace() {
        this.removeLastChar();
        this.state.lastCharInfo = null; // 상태 초기화
    }
    clear() {
        this.display.value = '';
        this.state.lastCharInfo = null;
    }
    copyToClipboard() {
        if (!this.display.value) return;
        navigator.clipboard.writeText(this.display.value)
            .then(() => alert('클립보드에 복사되었습니다.'))
            .catch(err => console.error('복사 실패:', err));
    }

    /**
     * @modified
     * Caps Lock 상태를 토글합니다.
     * 이 기능은 EN(영어) 레이어에서만 Caps Lock을 '켤' 수 있습니다.
     * 다른 레이어로 전환하면 switchLayer 함수에 의해 자동으로 '꺼집니다'.
     */
    toggleCapsLock() {
        // EN 레이어가 아니고, Caps Lock이 꺼져 있는 상태에서는 활성화(켜기) 불가
        if (this.state.activeLayer !== 'EN' && !this.state.capsLock) {
            return;
        }
        this.state.capsLock = !this.state.capsLock;
        document.getElementById('caps-btn').classList.toggle('active', this.state.capsLock);
    }

    setScale(newScale) {
        this.state.scale = Math.max(0.5, Math.min(newScale, 2.0));
        localStorage.setItem('keyboardScale', this.state.scale);
        this.applyScale();
    }
    applyScale() {
        this.keyboardContainer.style.transform = `scale(${this.state.scale})`;
    }
    setHandedness(className) {
        this.keyboardContainer.classList.remove('left-handed', 'right-handed');
        this.keyboardContainer.classList.add(className);
    }
    switchLayer(layerName) {
        this.state.activeLayer = layerName;
        this.state.lastCharInfo = null; // 레이어 변경 시 조합 상태 초기화

        document.querySelectorAll('.layer').forEach(div => {
            div.classList.toggle('active', div.dataset.layer === layerName);
        });
        this.layerButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.layer === layerName);
        });

        if (layerName !== 'EN' && this.state.capsLock) {
            this.toggleCapsLock(); // EN 레이어가 아니면 Caps Lock 해제
        }
    }
}

// 키보드 인스턴스 생성
document.addEventListener('DOMContentLoaded', () => {
    new HanomaKeyboard({
        displayId: 'display',
        keyboardContainerId: 'keyboard-container',
        layerButtonSelector: 'button[data-layer]'
    });
});