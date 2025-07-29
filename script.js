(function() {
	const display = document.getElementById('display');
	let last = null; // 최근 조합 상태 기억용
	let capMode = false; // Cap 버튼
	let capsLock = false; // CapsLock 상태
	let lastClickTime = 0;
	let clickSuppressed = false;

	const CHOSUNG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
	const JUNGSUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
	const JONGSUNG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

	function isChosung(ch) { return CHOSUNG.includes(ch); }
	function isJungsung(ch) { return JUNGSUNG.includes(ch); }

	function combineHangul(cho, jung, jong = '') {
		const ci = CHOSUNG.indexOf(cho);
		const ji = JUNGSUNG.indexOf(jung);
		const joi = JONGSUNG.indexOf(jong);
		if (ci < 0 || ji < 0) return null;
		return String.fromCharCode(0xAC00 + (ci * 21 + ji) * 28 + joi);
	}

	function removeLastChar() {
		display.value = display.value.slice(0, -1);
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
				document.getElementById('cap-btn')?.classList.remove('active');
			}
			return;
		}
		
		if (activeLayer === 'KR' && isKR) {
			if (isChosung(char)) {
				// 2) CVJ 상태에서 이중 종성 처리 시도
				if (last && last.type === 'CVJ') {
					const pair = last.jong + char;
					if (pair in DOUBLE_FINAL) {
						removeLastChar();  // 이전 글자(예: '갑') 지우고
						const newJong = DOUBLE_FINAL[pair];
						const syll = combineHangul(last.cho, last.jung, newJong);
						display.value += syll || (last.cho + last.jung + newJong);
						last = { type: 'CVJ', cho: last.cho, jung: last.jung, jong: newJong };
						return; 
					} 			
				}
				// 3) 단일 종성(CV → CVJ)
				if (last && last.type === 'CV') {
					removeLastChar();
					const syll = combineHangul(last.cho, last.jung, char);
					display.value += syll || (last.cho + last.jung + char);
					last = { type: 'CVJ', cho: last.cho, jung: last.jung, jong: char };
				} else {
					// 그 외는 새로운 초성으로
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
					// 초성 + 중성 → CV 구성
					removeLastChar();
					const syll = combineHangul(last.cho, char);
					display.value += syll || (last.cho + char);
					last = { type: 'CV', cho: last.cho, jung: char };
				} else if (last?.type === 'CVJ') {
					display.value += char;
					last = { type: 'V', char };
				} else {
					// 기타 문자
					display.value += char;
					last = null;
				}
				return;
			}

			// SYM, NUM: 그냥 문자 추가
			if (activeLayer === 'SYM' || activeLayer === 'NUM') {
				display.value += char;
				last = null;
				return;
			}
		}
		// 핵심 추가 부분: KR이더라도 자모가 아니면 그냥 입력
		if ((activeLayer === 'KR' && !isKR) || activeLayer === 'NUM' || activeLayer === 'SYM') {
			display.value += char;
			last = null;
			return;
		}
	}
	
	const DOUBLE_FINAL = {'ㄱㅅ':'ㄳ','ㄴㅈ':'ㄵ','ㄴㅎ':'ㄶ','ㄹㄱ':'ㄺ','ㄹㅁ':'ㄻ','ㄹㅂ':'ㄼ',
		'ㄹㅅ':'ㄽ','ㄹㅌ':'ㄾ','ㄹㅍ':'ㄿ', 'ㄹㅎ':'ㅀ','ㅂㅅ':'ㅄ'
	};
	
	const REVERSE_DOUBLE_FINAL = {'ㄳ': ['ㄱ','ㅅ'], 'ㄵ': ['ㄴ','ㅈ'], 'ㄶ': ['ㄴ','ㅎ'], 'ㄺ': ['ㄹ','ㄱ'], 'ㄻ': ['ㄹ','ㅁ'], 
		'ㄼ': ['ㄹ','ㅂ'], 'ㄽ': ['ㄹ','ㅅ'], 'ㄾ': ['ㄹ','ㅌ'], 'ㄿ': ['ㄹ','ㅍ'],	'ㅀ': ['ㄹ','ㅎ'], 'ㅄ': ['ㅂ','ㅅ']
	};

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

	document.getElementById('scale-up').addEventListener('click', () => {
		scale = Math.min(scale + 0.01, 2);
		applyScale();
	});
	document.getElementById('scale-down').addEventListener('click', () => {
		scale = Math.max(0.5, scale - 0.01);
		applyScale();
	});

	function applyScale() {
		localStorage.setItem('keyboardScale', scale);
		const container = document.getElementById('keyboard-container');
		container.style.transform = `scale(${scale})`;
	}

	document.getElementById('hand-right').addEventListener('click', () => {
		const containerEl = document.getElementById('keyboard-container');
		containerEl.classList.remove('left-handed');
		containerEl.classList.add('right-handed');
	});
	document.getElementById('hand-left').addEventListener('click', () => {
		const containerEl = document.getElementById('keyboard-container');
		containerEl.classList.remove('right-handed');
		containerEl.classList.add('left-handed');
	});

	function switchLayer(target) {
		document.querySelectorAll('#layer-switcher button[data-layer]').forEach(btn => {
			btn.classList.toggle('active', btn.dataset.layer === target);
		});
		document.querySelectorAll('.layer').forEach(div => {
			div.classList.toggle('active', div.dataset.layer === target);
		});

		// Cap, Caps는 EN에서만 유효 → 레이어 바뀌면 강제 초기화
		if (target !== 'EN') {
			capMode = false;
			capsLock = false;
			document.getElementById('cap-btn')?.classList.remove('active');
			document.getElementById('caps-btn')?.classList.remove('active');
		}
	}

	//document.querySelectorAll('#layer-switcher button[data-layer]').forEach(btn => {
	document.querySelectorAll('button[data-layer]').forEach(btn => {
		btn.addEventListener('click', () => switchLayer(btn.dataset.layer));
	});

	// 초기 레이어를 KR로 설정
	switchLayer('KR');
  
	// ——— Refresh 버튼 기능 ———
	const refreshBtn = document.getElementById('refresh-btn');
	refreshBtn.addEventListener('click', () => {
		display.value = '';   // 화면 클리어
		last = null;          // 상태 초기화
		switchLayer('KR');
		capMode = false;
		capsLock = false;
		document.getElementById('cap-btn').classList.remove('active');
		document.getElementById('caps-btn').classList.remove('active');
	});
  
	// ——— Copy 버튼 기능 ———
	const copyBtn = document.getElementById('copy-btn');
	copyBtn.addEventListener('click', () => {
		// 빈 값일 땐 복사하지 않게
		if (!display.value) return;
  
		navigator.clipboard.writeText(display.value)
			.then(() => {
				// 복사 완료 피드백 (원하면 alert 대신 토스트 UI로 바꿔도 좋아요)
				alert('텍스트가 클립보드에 복사되었어! ✨');
			})
			.catch(err => {
				console.error('복사 실패:', err);
			});
	});
  
	document.getElementById('cap-btn').addEventListener('click', () => {
		const activeLayer = document.querySelector('#layer-switcher button.active')?.dataset.layer;
		if (activeLayer !== 'EN') return;

		capMode = !capMode;
		console.log('🔁 Cap Toggled:', capMode);

		document.getElementById('cap-btn').classList.toggle('active', capMode);

		if (capMode) {
			capsLock = false;
			document.getElementById('caps-btn').classList.remove('active');
		}
	});

	document.getElementById('caps-btn').addEventListener('click', () => {
		const activeLayer = document.querySelector('#layer-switcher button.active')?.dataset.layer;
		if (activeLayer !== 'EN') return;

		capsLock = !capsLock;

		// ✅ Caps 상태 반영
		document.getElementById('caps-btn').classList.toggle('active', capsLock);

		// ✅ Cap은 무조건 해제
		capMode = false;
		document.getElementById('cap-btn').classList.remove('active');
	});  
  
	document.getElementById("display").addEventListener("focus", e => e.target.blur());
  
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
				document.getElementById('cap-btn')?.classList.remove('active');
			} else if (capsLock && isAlpha) {
				key = key.toUpperCase();
			}
		}
		display.value += key;
		last = null;
	} 
})();
