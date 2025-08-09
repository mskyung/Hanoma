class HanomaKeyboard {
    constructor(options) {
        // 주요 DOM 요소
        this.display = document.getElementById(options.displayId);
        this.displayContainer = document.getElementById(options.displayContainerId);
        this.keyboardContainer = document.getElementById(options.keyboardContainerId);
        this.layerButtons = document.querySelectorAll(options.layerButtonSelector);
        this.settingsModal = document.getElementById(options.settingsModalId);

        // 한글 조합 상수
        this.CHOSUNG = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
        this.JUNGSUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
        this.JONGSUNG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
        this.DOUBLE_FINAL = { 'ㄱㅅ': 'ㄳ', 'ㄴㅈ': 'ㄵ', 'ㄴㅎ': 'ㄶ', 'ㄹㄱ': 'ㄺ', 'ㄹㅁ': 'ㄻ', 'ㄹㅂ': 'ㄼ', 'ㄹㅅ': 'ㄽ', 'ㄹㅌ': 'ㄾ', 'ㄹㅍ': 'ㄿ', 'ㄹㅎ': 'ㅀ', 'ㅂㅅ': 'ㅄ' };
        this.REVERSE_DOUBLE_FINAL = Object.fromEntries(Object.entries(this.DOUBLE_FINAL).map(([key, val]) => [val, key.split('')]));
		this.COMPLEX_VOWEL = { 'ㅗㅏ': 'ㅘ', 'ㅗㅐ': 'ㅙ', 'ㅗㅣ': 'ㅚ', 'ㅜㅓ': 'ㅝ', 'ㅜㅔ': 'ㅞ', 'ㅜㅣ': 'ㅟ', 'ㅡㅣ': 'ㅢ', 'ㅓㅣ':'ㅔ', 'ㅕㅣ':'ㅖ', 'ㅏㅣ':'ㅐ', 'ㅑㅣ':'ㅒ' };


        // 키보드 상태
        this.state = {
            lastCharInfo: null,
            capsLock: false,
            scale: 1.0,
            activeLayer: 'KR',
            isPointerDown: false,
            pointerMoved: false,
            clickTimeout: null,
            horizontalOffset: 0,
            verticalOffset: 0
        };

        this.init();
    }

    init() {
        this.loadSettings();
        this.attachEventListeners();
        this.switchLayer('KR');
    }

    loadSettings() {
        const savedScale = localStorage.getItem('keyboardScale');
        if (savedScale) {
            this.state.scale = parseFloat(savedScale);
        }
        const savedHorizontalOffset = localStorage.getItem('keyboardHorizontalOffset');
        if (savedHorizontalOffset) {
            this.state.horizontalOffset = parseInt(savedHorizontalOffset, 10);
            this.applyHorizontalPosition();
        }
        const savedVerticalOffset = localStorage.getItem('keyboardVerticalOffset');
        if (savedVerticalOffset) {
            this.state.verticalOffset = parseInt(savedVerticalOffset, 10);
        }

        this.applyKeyboardTransform();
    }

    // 모든 이벤트 리스너 등록
    attachEventListeners() {
        // 키보드 키 이벤트
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
                    this.handleInput(el.dataset.drag || el.dataset.click);
                }
                this.state.isPointerDown = false;
            });
            
            el.addEventListener('click', e => {
                e.preventDefault();
                if (this.state.pointerMoved) return;
                
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
                this.handleInput(el.dataset.dblclick || el.dataset.click);
            });
        });
        
        // 텍스트 영역(display) 이벤트 (커서 이동 시 조합 상태 초기화)
        this.display.addEventListener('click', () => this.resetComposition());
        this.display.addEventListener('keyup', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
                this.resetComposition();
            }
        });

        // 기능 버튼 이벤트
        document.getElementById('backspace').addEventListener('click', () => this.backspace());
        document.getElementById('space').addEventListener('click', () => this.handleInput(' '));
        document.getElementById('refresh-btn').addEventListener('click', () => this.clear());
        document.getElementById('copy-btn').addEventListener('click', () => this.copyToClipboard());
		document.getElementById('enter').addEventListener('click', () => this.handleEnter());

        // 설정 창 내 버튼 이벤트
        document.getElementById('scale-up').addEventListener('click', () => this.setScale(this.state.scale + 0.01));
        document.getElementById('scale-down').addEventListener('click', () => this.setScale(this.state.scale - 0.01));
        document.getElementById('hand-left').addEventListener('click', () => this.moveKeyboard(-10));
        document.getElementById('hand-right').addEventListener('click', () => this.moveKeyboard(10));
        document.getElementById('position-up').addEventListener('click', () => this.moveKeyboardVertical(-10));
        document.getElementById('position-down').addEventListener('click', () => this.moveKeyboardVertical(10));

        // 설정 창 열기/닫기 이벤트
        document.getElementById('settings-btn').addEventListener('click', () => this.openSettings());
        document.querySelector('.close-button').addEventListener('click', () => this.closeSettings());
        window.addEventListener('click', (event) => {
            if (event.target == this.settingsModal) this.closeSettings();
        });

        // 레이어 전환 버튼 이벤트
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
            this.resetComposition();
            let charToInsert = char;
            if (this.state.activeLayer === 'EN' && this.state.capsLock && /^[a-z]$/.test(char)) {
                charToInsert = char.toUpperCase();
            }
            this.insertAtCursor(charToInsert);
        }
    }

    // 한글 조합
    composeHangul(char) {
        const last = this.state.lastCharInfo;
        const isChosung = this.CHOSUNG.includes(char);
        const isJungsung = this.JUNGSUNG.includes(char);
        
        const start = this.display.selectionStart;
        const end = this.display.selectionEnd;

        if (start !== end) {
            this.resetComposition();
        }

        // 자음 입력 처리
        if (isChosung) {
            // 종성 결합 (예: '가' + 'ㄱ' -> '각')
            if (last && last.type === 'CV' && this.JONGSUNG.includes(char)) {
                const newChar = this.combineCode(last.cho, last.jung, char);
                this.replaceTextBeforeCursor(1, newChar);
                this.state.lastCharInfo = { type: 'CVJ', cho: last.cho, jung: last.jung, jong: char };
            // 겹받침 결합 (예: '각' + 'ㅅ' -> '갃')
            } else if (last && last.type === 'CVJ' && this.DOUBLE_FINAL[last.jong + char]) {
                const newJong = this.DOUBLE_FINAL[last.jong + char];
                const newChar = this.combineCode(last.cho, last.jung, newJong);
                this.replaceTextBeforeCursor(1, newChar);
                this.state.lastCharInfo = { type: 'CVJ', cho: last.cho, jung: last.jung, jong: newJong };
            } else {
                this.insertAtCursor(char);
                this.state.lastCharInfo = { type: 'C', cho: char };
            }
        // 모음 입력 처리
        } else if (isJungsung) {
            // 초성 + 모음 결합 (예: 'ㄱ' + 'ㅏ' -> '가')
            if (last && last.type === 'C') {
                const newChar = this.combineCode(last.cho, char);
                this.replaceTextBeforeCursor(1, newChar);
                this.state.lastCharInfo = { type: 'CV', cho: last.cho, jung: char };
            // 이중모음 결합 (예: '오' + 'ㅏ' -> '와')
            } else if (last && last.type === 'CV' && this.COMPLEX_VOWEL[last.jung + char]) {
                const newVowel = this.COMPLEX_VOWEL[last.jung + char];
                const newChar = this.combineCode(last.cho, newVowel);
                this.replaceTextBeforeCursor(1, newChar);
                this.state.lastCharInfo = { type: 'CV', cho: last.cho, jung: newVowel };
            // 종성 분리 후 결합 (예: '각' + 'ㅏ' -> '가' + '가')
            } else if (last && last.type === 'CVJ') {
                const doubleJong = this.REVERSE_DOUBLE_FINAL[last.jong];
                let char1, char2;
                if (doubleJong) { // 겹받침인 경우 (예: '갃' + 'ㅏ' -> '각사')
                    char1 = this.combineCode(last.cho, last.jung, doubleJong[0]);
                    char2 = this.combineCode(doubleJong[1], char);
                    this.state.lastCharInfo = { type: 'CV', cho: doubleJong[1], jung: char };
                } else { // 홑받침인 경우 (예: '각' + 'ㅏ' -> '가' + '가')
                    char1 = this.combineCode(last.cho, last.jung);
                    char2 = this.combineCode(last.jong, char);
                    this.state.lastCharInfo = { type: 'CV', cho: last.jong, jung: char };
                }
                this.replaceTextBeforeCursor(1, char1 + char2);
            } else {
                this.insertAtCursor(char);
                this.resetComposition();
            }
        }
    }
    
    combineCode(cho, jung, jong = '') {
        const ci = this.CHOSUNG.indexOf(cho);
        const ji = this.JUNGSUNG.indexOf(jung);
        const joi = this.JONGSUNG.indexOf(jong);
        if (ci < 0 || ji < 0) return cho + (jung || '') + (jong || '');
        return String.fromCharCode(0xAC00 + (ci * 21 + ji) * 28 + joi);
    }
    
    // 기능 함수들
    backspace() {
        const start = this.display.selectionStart;
        const end = this.display.selectionEnd;

        if (start === 0 && end === 0) return;

        if (start === end) {
            this.display.value = this.display.value.substring(0, start - 1) + this.display.value.substring(start);
            this.display.selectionStart = this.display.selectionEnd = start - 1;
        } else {
            this.display.value = this.display.value.substring(0, start) + this.display.value.substring(end);
            this.display.selectionStart = this.display.selectionEnd = start;
        }
        this.resetComposition();
    }
    
	handleEnter() {
        this.insertAtCursor('\n');
        this.resetComposition();
    }
	
    insertAtCursor(text) {
        const start = this.display.selectionStart;
        const end = this.display.selectionEnd;
        this.display.value = this.display.value.substring(0, start) + text + this.display.value.substring(end);
        this.display.selectionStart = this.display.selectionEnd = start + text.length;
        this.display.focus();
    }
    
    replaceTextBeforeCursor(charsToRemove, textToInsert) {
        const start = this.display.selectionStart;
        if (start < charsToRemove) return;

        const before = this.display.value.substring(0, start - charsToRemove);
        const after = this.display.value.substring(start);

        this.display.value = before + textToInsert + after;
        
        const newCursorPos = before.length + textToInsert.length;
        this.display.selectionStart = this.display.selectionEnd = newCursorPos;
        this.display.focus();
    }

    clear() {
        this.display.value = '';
        this.resetComposition();
    }

    copyToClipboard() {
        if (!this.display.value) return;
        navigator.clipboard.writeText(this.display.value)
            .then(() => alert('클립보드에 복사되었습니다.'))
            .catch(err => console.error('복사 실패:', err));
    }
    
    resetComposition() {
        this.state.lastCharInfo = null;
    }

    setScale(newScale) {
        this.state.scale = Math.max(0.5, Math.min(newScale, 2.0));
        localStorage.setItem('keyboardScale', this.state.scale);
        this.applyKeyboardTransform();
    }

    applyHorizontalPosition() {
        this.keyboardContainer.style.left = `calc(50% + ${this.state.horizontalOffset}px)`;
    }

    moveKeyboard(direction) {
        this.state.horizontalOffset += direction;
        this.applyHorizontalPosition();
        localStorage.setItem('keyboardHorizontalOffset', this.state.horizontalOffset);
    }

    applyKeyboardTransform() {
        const scale = `scale(${this.state.scale})`;
        const translateX = `translateX(-50%)`;
        const translateY = `translateY(${this.state.verticalOffset}px)`;
        this.keyboardContainer.style.transform = `${translateY} ${translateX} ${scale}`;
    }

    moveKeyboardVertical(direction) {
        this.state.verticalOffset += direction;
        this.applyKeyboardTransform();
        localStorage.setItem('keyboardVerticalOffset', this.state.verticalOffset);
    }

    updateEnKeyCaps() {
        const isCaps = this.state.capsLock;
        const enKeys = document.querySelectorAll('.layer[data-layer="EN"] text');

        enKeys.forEach(key => {
            const char = key.textContent;
            if (char && char.length === 1 && char.match(/[a-z]/i)) {
                key.textContent = isCaps ? char.toUpperCase() : char.toLowerCase();
            }
        });
    }

    switchLayer(layerName) {
        if (layerName === 'EN') {
            if (this.state.activeLayer === 'EN') {
                this.state.capsLock = !this.state.capsLock;
            } else {
                this.state.capsLock = false;
            }
        } else {
            this.state.capsLock = false;
        }

        this.state.activeLayer = layerName;
        this.resetComposition();

        document.querySelectorAll('.layer').forEach(div => {
            div.classList.toggle('active', div.dataset.layer === layerName);
        });

        this.layerButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.layer === layerName);
        });

        const enButton = document.querySelector('button[data-layer="EN"]');
        if (enButton) {
            enButton.classList.toggle('caps-on', this.state.capsLock);
        }
        this.updateEnKeyCaps();
    }

    openSettings() {
        this.settingsModal.style.display = 'block';
    }

    closeSettings() {
        this.settingsModal.style.display = 'none';
    }
}

// 키보드 인스턴스 생성
document.addEventListener('DOMContentLoaded', () => {
    new HanomaKeyboard({
        displayId: 'display',
        displayContainerId: 'display-container',
        keyboardContainerId: 'keyboard-container',
        layerButtonSelector: 'button[data-layer]',
        settingsModalId: 'settings-modal'
    });
});