(function() {
	const display = document.getElementById('display');
	let last = null; // 최근 조합 상태 기억용

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
		// 1) 이중 종성 조합용 매핑
		const DOUBLE_FINAL = {
			'ㄱㅅ':'ㄳ','ㄴㅈ':'ㄵ','ㄴㅎ':'ㄶ',
			'ㄹㄱ':'ㄺ','ㄹㅁ':'ㄻ','ㄹㅂ':'ㄼ',
			'ㄹㅅ':'ㄽ','ㄹㅌ':'ㄾ','ㄹㅍ':'ㄿ',
			'ㄹㅎ':'ㅀ','ㅂㅅ':'ㅄ'
		};
	
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
					return;  // 처리 끝
				} else {
					// 이중 종성 불가 → 종성 글자 마무리 + 새 초성 시작
					const syll = combineHangul(last.cho, last.jung, last.jong);
					display.value += syll || (last.cho + last.jung + last.jong);
					last = { type: 'C', cho: char };  // 새 글자의 초성으로 전환
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

		} else if (isJungsung(char)) {
			if (last && last.type === 'CVJ') {
				// CVJ → 새로운 CV (받침 글자 분리 + 새 글자 조합)
				removeLastChar();
				const prevSyll = combineHangul(last.cho, last.jung);
				const newSyll  = combineHangul(last.jong, char);
				display.value += (prevSyll || last.cho + last.jung) + (newSyll || last.jong + char);
				last = { type: 'CV', cho: last.jong, jung: char };

			} else if (last && last.type === 'C') {
				// C → CV 조합 (오타 수정: '-=' → '=')
				removeLastChar();
				const syll = combineHangul(last.cho, char);
				display.value += syll || (last.cho + char);
				last = { type: 'CV', cho: last.cho, jung: char };

			} else {
			// 단독 모음
			display.value += char;
			last = { type: 'V', char };
			}

		} else {
		// 기타 문자
		display.value += char;
		last = null;
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
			if (moved) insertChar(el.dataset.drag);
			else {
				clearTimeout(clickTimeout);
				clickTimeout = setTimeout(() => insertChar(el.dataset.click), 250);
			}
		});
		el.addEventListener('dblclick', e => {
			clearTimeout(clickTimeout);
			insertChar(el.dataset.dblclick);
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
	}

	document.querySelectorAll('#layer-switcher button[data-layer]').forEach(btn => {
		btn.addEventListener('click', () => switchLayer(btn.dataset.layer));
	});

	// 초기 레이어를 KR로 설정
	switchLayer('KR');

	// 키보드 클릭 이벤트 (optional)
	const containerEl = document.getElementById('keyboard-container');
	containerEl.addEventListener('click', e => {
		const key = e.target.dataset.key;
		if (!key) return;
		const activeLayer = document.querySelector('#layer-switcher button.active').dataset.layer;
		switch (activeLayer) {
			case 'KR': insertChar(key); break;
			case 'EN': display.value += key; break;
			case 'SYM': display.value += key; break;
			case 'NUM': display.value += key; break;
		}
	});
  
	// ——— Refresh 버튼 기능 ———
	const refreshBtn = document.getElementById('refresh-btn');
	refreshBtn.addEventListener('click', () => {
		display.value = '';   // 화면 클리어
		last = null;          // 상태 초기화
	});
  
	// Copy 버튼 기능
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
  
	let isCaps = false;  // 대소문자 상태 추적

	function toggleCaps() {
		isCaps = !isCaps;

		// 옵션: 시각 피드백 주고 싶으면 여기서 텍스트 변경 or 색상 변경 가능
		console.log('Caps 상태:', isCaps ? '대문자' : '소문자');
		const capsTextLeft = document.querySelector('.corner3 + text');
		const capsTextRight = document.querySelector('.corner4 + text');

		const color = isCaps ? 'red' : 'black';
		if (capsTextLeft) capsTextLeft.setAttribute('fill', color);
		if (capsTextRight) capsTextRight.setAttribute('fill', color);
	}

})();