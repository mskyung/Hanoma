(function() {
	const display = document.getElementById('display');
	let last = null; 
	let capsLock = false; 

	const CHOSUNG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
	const JUNGSUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
	const JONGSUNG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
	const DOUBLE_FINAL = {'ㄱㅅ':'ㄳ','ㄴㅈ':'ㄵ','ㄴㅎ':'ㄶ','ㄹㄱ':'ㄺ','ㄹㅁ':'ㄻ','ㄹㅂ':'ㄼ', 'ㄹㅅ':'ㄽ','ㄹㅌ':'ㄾ','ㄹㅍ':'ㄿ', 'ㄹㅎ':'ㅀ','ㅂㅅ':'ㅄ'};
	const REVERSE_DOUBLE_FINAL = {'ㄳ': ['ㄱ','ㅅ'], 'ㄵ': ['ㄴ','ㅈ'], 'ㄶ': ['ㄴ','ㅎ'], 'ㄺ': ['ㄹ','ㄱ'], 'ㄻ': ['ㄹ','ㅁ'], 'ㄼ': ['ㄹ','ㅂ'], 'ㄽ': ['ㄹ','ㅅ'], 'ㄾ': ['ㄹ','ㅌ'], 'ㄿ': ['ㄹ','ㅍ'],	'ㅀ': ['ㄹ','ㅎ'], 'ㅄ': ['ㅂ','ㅅ']};

	function isChosung(ch) { return CHOSUNG.includes(ch); }
	function isJungsung(ch) { return JUNGSUNG.includes(ch); }
	function removeLastChar() { display.value = display.value.slice(0, -1);	}

	function combineHangul(cho, jung, jong = '') {
		const ci = CHOSUNG.indexOf(cho);
		const ji = JUNGSUNG.indexOf(jung);
		const joi = JONGSUNG.indexOf(jong);
		if (ci < 0 || ji < 0) return null;
		return String.fromCharCode(0xAC00 + (ci * 21 + ji) * 28 + joi);
	}
	
	function insertChar(char) {
		if (typeof char !== 'string' || !char.trim()) return;

		const activeLayer = document.querySelector('#layer-switcher button.active')?.dataset.layer;
		const isAlpha = /^[a-zA-Z]$/.test(char);
		const isKR = isChosung(char) || isJungsung(char);
		
		if (activeLayer === 'EN') {
			if (isAlpha && (capsLock || capMode)) {
				char = char.toUpperCase();
			}
			display.value += char;
			last = null;

			if (capMode && /^[a-z]$/.test(char)) {
				capMode = false;
				//document.getElementById('cap-btn')?.classList.remove('active');
			}
			return;
		}
		
		if (activeLayer === 'KR' && isKR) {
			if (isChosung(char)) {
				if (last && last.type === 'CVJ') {
					const pair = last.jong + char;
					if (pair in DOUBLE_FINAL) {
						removeLastChar(); 
						const newJong = DOUBLE_FINAL[pair];
						const syll = combineHangul(last.cho, last.jung, newJong);
						display.value += syll || (last.cho + last.jung + newJong);
						last = { type: 'CVJ', cho: last.cho, jung: last.jung, jong: newJong };
						return; 
					} 			
				}
				if (last && last.type === 'CV') {
					removeLastChar();
					const syll = combineHangul(last.cho, last.jung, char);
					display.value += syll || (last.cho + last.jung + char);
					last = { type: 'CVJ', cho: last.cho, jung: last.jung, jong: char };
				} else {
					display.value += char;
					last = { type: 'C', cho: char };
				}
				return;
			}	
			
			if (isJungsung(char)) {
				if (last?.type === 'CVJ') {
					const double = REVERSE_DOUBLE_FINAL[last.jong];
					if (double && CHOSUNG.includes(double[1])) {
						removeLastChar(); 
						const prevSyll = combineHangul(last.cho, last.jung, double[0]);
						const nextSyll = combineHangul(double[1], char);
						display.value += prevSyll + nextSyll;
						last = { type: 'CV', cho: double[1], jung: char };
						return;
					} else if (CHOSUNG.includes(last.jong)) {
						removeLastChar();
						const prevSyll = combineHangul(last.cho, last.jung);
						const nextSyll = combineHangul(last.jong, char);
						display.value += prevSyll + nextSyll;
						last = { type: 'CV', cho: last.jong, jung: char };
						return;
					}
				} else if (last?.type === 'C') {
					removeLastChar();
					const syll = combineHangul(last.cho, char);
					display.value += syll || (last.cho + char);
					last = { type: 'CV', cho: last.cho, jung: char };
				} else if (last?.type === 'CVJ') {
					display.value += char;
					last = { type: 'V', char };
				} else {
					display.value += char;
					last = null;
				}
				return;
			}

			if (activeLayer === 'SYM' || activeLayer === 'NUM') {
				display.value += char;
				last = null;
				return;
			}
		}
		if ((activeLayer === 'KR' && !isKR) || activeLayer === 'NUM' || activeLayer === 'SYM') {
			display.value += char;
			last = null;
			return;
		}
	}

	// 한글 조합 버튼 이벤트
	document.querySelectorAll('[data-click]').forEach(el => {
		let clickTimeout, moved = false, startX = 0, startY = 0;
		el.addEventListener('pointerdown', e => {
			moved = false;
			startX = e.clientX;
			startY = e.clientY;
		});
		
		el.addEventListener('pointermove', e => {
			if (Math.abs(e.clientX - startX) > 10 || Math.abs(e.clientY - startY) > 10) moved = true;
		});
		
		el.addEventListener('pointerup', e => {
			const activeLayer = document.querySelector('#layer-switcher button.active')?.dataset.layer;
				if (moved) {
					const dragKey = el.dataset.drag;
					if (activeLayer === 'KR') insertChar(dragKey);
					else handleKeyInput(dragKey);
				} else {
					clearTimeout(clickTimeout);
					const clickKey = el.dataset.click;
					clickTimeout = setTimeout(() => {
						if (!clickKey || clickKey.trim() === '') return;
						if (activeLayer === 'KR') {
							insertChar(clickKey);
						} else {
							handleKeyInput(clickKey);
						}
					}, 250);
				}      
		});
		el.addEventListener('dblclick', e => {
			clearTimeout(clickTimeout);
			const dblKey = el.dataset.dblclick;
			const activeLayer = document.querySelector('#layer-switcher button.active')?.dataset.layer;
			if (activeLayer === 'KR') insertChar(dblKey);
			else handleKeyInput(dblKey);      
		});
	});
  
	// 백스페이스 버튼 기능
	document.getElementById('backspace').addEventListener('click', e => {
		e.preventDefault();
		e.stopPropagation();
		removeLastChar();
		last = null;
		display.focus();
	});

	// 스페이스 버튼 기능
	document.getElementById('space').addEventListener('click', e => {
		e.preventDefault();
		e.stopPropagation();
		display.value += ' ';
		last = null;
		display.focus();
	});

	// 크기 조절 및 레이어 전환 등 나머지 설정
	let scale = 1.0;
	const savedScale = localStorage.getItem('keyboardScale');
	if (savedScale) scale = parseFloat(savedScale);
	applyScale();
	
	// 입력창 크기 설정
	function applyScale() {
		localStorage.setItem('keyboardScale', scale);
		const container = document.getElementById('keyboard-container');
		container.style.transform = `scale(${scale})`;
	}
	
	// 입력창 크기 확대
	document.getElementById('scale-up').addEventListener('click', () => {
		scale = Math.min(scale + 0.01, 2);
		applyScale();
	});
	
	// 입력창 크기 축소
	document.getElementById('scale-down').addEventListener('click', () => {
		scale = Math.max(0.5, scale - 0.01);
		applyScale();
	});
	
	// 오른손잡이
	document.getElementById('hand-right').addEventListener('click', () => {
		const containerEl = document.getElementById('keyboard-container');
		containerEl.classList.remove('left-handed');
		containerEl.classList.add('right-handed');
	});
	
	// 왼손잡이
	document.getElementById('hand-left').addEventListener('click', () => {
		const containerEl = document.getElementById('keyboard-container');
		containerEl.classList.remove('right-handed');
		containerEl.classList.add('left-handed');
	});
	
	// Caps 버튼은 EN 모드에서만 작동
	function switchLayer(target) {
		document.querySelectorAll('#layer-switcher button[data-layer]').forEach(btn => {
			btn.classList.toggle('active', btn.dataset.layer === target);
		});
		document.querySelectorAll('.layer').forEach(div => {
			div.classList.toggle('active', div.dataset.layer === target);
		});

		// Caps는 EN에서만 유효 → 레이어 바뀌면 강제 초기화
		if (target !== 'EN') {
			capMode = false;
			capsLock = false;
			document.getElementById('caps-btn')?.classList.remove('active');
		}
	}
	
	document.querySelectorAll('button[data-layer]').forEach(btn => {
		btn.addEventListener('click', () => switchLayer(btn.dataset.layer));
	});

	// 초기 레이어를 KR로 설정
	switchLayer('KR');
	
	// Refresh 버튼
	document.getElementById('refresh-btn').addEventListener('click', () => { 
		window.location.reload();
	});
	
	// Copy 버튼
	const copyBtn = document.getElementById('copy-btn');
	copyBtn.addEventListener('click', () => {
		if (!display.value) return;
  
		navigator.clipboard.writeText(display.value)
			.then(() => {
				alert('클립보드에 복사됨');
			})
			.catch(err => {
				console.error('복사 실패:', err);
			});
	});
	
	// Caps 버튼
	document.getElementById('caps-btn').addEventListener('click', () => {
		const activeLayer = document.querySelector('#layer-switcher button.active')?.dataset.layer;
		if (activeLayer !== 'EN') return;

		capsLock = !capsLock;
		document.getElementById('caps-btn').classList.toggle('active', capsLock);
		capMode = false;
	});  
  
	//document.getElementById("display").addEventListener("focus", e => e.target.blur());
  
	const containerEl = document.getElementById('keyboard-container');
	containerEl.addEventListener('mouseup', e => {
		if (!dragTarget) return;
		const target = e.target.closest('[data-drag]');
		if (target && target === dragTarget) {
			const key = target.dataset.drag;
			const activeLayer = document.querySelector('#layer-switcher button.active')?.dataset.layer;
    
			if (activeLayer !== 'KR') {
				handleKeyInput(key);
			}
		}
		dragTarget = null;
	});
  
	function handleKeyInput(key) {
		const activeLayer = document.querySelector('#layer-switcher button.active')?.dataset.layer;
		if (typeof key !== 'string' || !key.trim()) return;

		const isAlpha = /^[a-z]$/.test(key);

		if (activeLayer === 'EN') {
			if (capMode && isAlpha) {
				key = key.toUpperCase();
				capMode = false;
				//document.getElementById('caps-btn')?.classList.remove('active');
			} else if (capsLock && isAlpha) {
				key = key.toUpperCase();
			}
		}
		display.value += key;
		last = null;
	} 
})();
