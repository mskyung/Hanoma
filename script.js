class HanomaKeyboard {
    constructor(options) {
        // 주요 DOM 요소
        this.display = document.getElementById(options.displayId);
        this.displayContainer = document.getElementById(options.displayContainerId);
        this.keyboardContainer = document.getElementById(options.keyboardContainerId);
        this.layerButtons = document.querySelectorAll(options.layerButtonSelector);
		this.settingsModal = document.getElementById(options.settingsModalId);
        
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
                this.handleInput(el.dataset.dblclick || el.dataset.click);
            });
        });

        // 기능 버튼 이벤트
        document.getElementById('backspace').addEventListener('click', () => this.backspace());
        document.getElementById('space').addEventListener('click', () => this.handleInput(' '));
        document.getElementById('refresh-btn').addEventListener('click', () => this.clear());
        document.getElementById('copy-btn').addEventListener('click', () => this.copyToClipboard());
		
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
            if (event.target == this.settingsModal) {
                this.closeSettings();
            }
        });

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
            this.state.lastCharInfo = null;
            let charToInsert = char;

            // 이 부분은 그대로 유지하여 Caps Lock 상태일 때 대문자로 변환합니다.
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

        if (isChosung) {
            if (last && last.type === 'CVJ' && this.DOUBLE_FINAL[last.jong + char]) {
                this.removeLastChar();
                const newJong = this.DOUBLE_FINAL[last.jong + char];
                this.display.value += this.combineCode(last.cho, last.jung, newJong);
                this.state.lastCharInfo = { type: 'CVJ', cho: last.cho, jung: last.jung, jong: newJong };
            } else if (last && last.type === 'CV') {
                this.removeLastChar();
                this.display.value += this.combineCode(last.cho, last.jung, char);
                this.state.lastCharInfo = { type: 'CVJ', cho: last.cho, jung: last.jung, jong: char };
            } else {
                this.display.value += char;
                this.state.lastCharInfo = { type: 'C', cho: char };
            }
        } else if (isJungsung) {
            if (last?.type === 'CVJ') {
                const double = this.REVERSE_DOUBLE_FINAL[last.jong];
                if (double) {
                    this.removeLastChar();
                    this.display.value += this.combineCode(last.cho, last.jung, double[0]);
                    this.display.value += this.combineCode(double[1], char);
                    this.state.lastCharInfo = { type: 'CV', cho: double[1], jung: char };
                } else {
                    this.removeLastChar();
                    this.display.value += this.combineCode(last.cho, last.jung);
                    this.display.value += this.combineCode(last.jong, char);
                    this.state.lastCharInfo = { type: 'CV', cho: last.jong, jung: char };
                }
            } else if (last?.type === 'C') {
                this.removeLastChar();
                this.display.value += this.combineCode(last.cho, char);
                this.state.lastCharInfo = { type: 'CV', cho: last.cho, jung: char };
            } else {
                this.display.value += char;
                this.state.lastCharInfo = null;
            }
        }
    }
    
    combineCode(cho, jung, jong = '') {
        const ci = this.CHOSUNG.indexOf(cho);
        const ji = this.JUNGSUNG.indexOf(jung);
        const joi = this.JONGSUNG.indexOf(jong);
        if (ci < 0 || ji < 0) return cho + jung;
        return String.fromCharCode(0xAC00 + (ci * 21 + ji) * 28 + joi);
    }
    
    // 기능 함수들
    removeLastChar() { this.display.value = this.display.value.slice(0, -1); }
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
		this.state.lastCharInfo = null;
	}
	insertAtCursor(text) {
		const start = this.display.selectionStart;
		const end = this.display.selectionEnd;
		this.display.value = this.display.value.substring(0, start) + text + this.display.value.substring(end);
		this.display.selectionStart = this.display.selectionEnd = start + text.length;
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
	
    setScale(newScale) {
        this.state.scale = Math.max(0.5, Math.min(newScale, 2.0));
        localStorage.setItem('keyboardScale', this.state.scale);
        this.applyKeyboardTransform();
    }

	applyHorizontalPosition() {
        //this.keyboardContainer.style.left = `${this.state.horizontalOffset}px`;
		this.keyboardContainer.style.left = `calc(50% + ${this.state.horizontalOffset}px)`;
    }

    moveKeyboard(direction) {
        this.state.horizontalOffset += direction;
		this.applyHorizontalPosition();		
        localStorage.setItem('keyboardHorizontalOffset', this.state.horizontalOffset);
    }

    applyKeyboardTransform() {
        const scale = `scale(${this.state.scale})`;
		const translateX = `translateX(-50%)`; // 수평 중앙 정렬을 위한 transform
		const translateY = `translateY(${this.state.verticalOffset}px)`;
		this.keyboardContainer.style.transform = `${translateY} ${translateX} ${scale}`;
    }

    moveKeyboardVertical(direction) {
        this.state.verticalOffset += direction;
        this.applyKeyboardTransform();
        localStorage.setItem('keyboardVerticalOffset', this.state.verticalOffset);
    }
	
	//EN 키보드의 자판을 대/소문자로 변경하는 함수
    updateEnKeyCaps() {    
        const isCaps = this.state.capsLock;
        const enKeys = document.querySelectorAll('.layer[data-layer="EN"] text');

        enKeys.forEach(key => {
            const char = key.textContent;
            // 한 글자로 된 알파벳만 변경합니다.
            if (char && char.length === 1 && char.match(/[a-z]/i)) {
                key.textContent = isCaps ? char.toUpperCase() : char.toLowerCase();
            }
        });
    }
	
    switchLayer(layerName) {
        if (layerName === 'EN') {            
            if (this.state.activeLayer === 'EN') {    // 이미 'EN' 레이어가 활성 상태라면 Caps Lock 상태를 토글함
                this.state.capsLock = !this.state.capsLock;
            } else {            
                this.state.capsLock = false;   // 다른 레이어에서 'EN'으로 전환하는 경우, Caps Lock은 항상 꺼진 상태로 시작
            }
        } else {       // 'EN'이 아닌 다른 레이어로 전환하면 무조건 Caps Lock을 끔            
            this.state.capsLock = false;
        }

        // 새 레이어를 활성 상태로 설정하고 한글 조합 상태를 초기화합니다.
        this.state.activeLayer = layerName;
        this.state.lastCharInfo = null;

        // 모든 레이어의 활성 상태를 업데이트합니다.
        document.querySelectorAll('.layer').forEach(div => {
            div.classList.toggle('active', div.dataset.layer === layerName);
        });

        // 모든 버튼의 활성 상태를 업데이트합니다.
        this.layerButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.layer === layerName);
        });

        // 'EN' 버튼에 Caps Lock 활성 상태를 시각적으로 표시합니다.
        const enButton = document.querySelector('button[data-layer="EN"]');
        if (enButton) {
            enButton.classList.toggle('caps-on', this.state.capsLock);
        }
		this.updateEnKeyCaps();  // Caps Lock 상태가 변경될 때마다 키보드 UI를 업데이트
    }
	
	// 설정 창 관리
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
		settingsModalId: 'settings-modal' // 설정 창 ID 추가
    });
});