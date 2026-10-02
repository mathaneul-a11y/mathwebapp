/**
 * ========================================================
 * 자바스크립트: script.js
 * 확률과 통계 수업용 동전 던지기 시뮬레이션 및 대수의 법칙 시각화
 * ========================================================
 */

// ----------------------------------------------------
// 1. 상태 변수 정의 (전역 변수 모음)
// ----------------------------------------------------
let totalCount = 0;      // 누적 총 던진 횟수 (시행 횟수)
let headCount = 0;       // 앞면(Head)이 나온 횟수
let tailCount = 0;       // 뒷면(Tail)이 나온 횟수
const recentHistory = []; // 최근 10회 결과를 저장하는 배열 (최대 10개 유지)

let autoPlayTimer = null; // 자동 반복 실행 타이머 ID (지연 반복 실행 제어)
let isFlipping = false;   // 1회 던지기 애니메이션이 진행 중인지 여부 (중복 클릭 방지)

// ----------------------------------------------------
// 2. DOM 요소 (화면 내 태그들) 참조 가져오기
// ----------------------------------------------------
const coinElement = document.getElementById('coin');
const coinHintText = document.getElementById('coinHintText');
const lastResultBadge = document.getElementById('lastResultBadge');
const historyChipsContainer = document.getElementById('historyChips');
const historyEmptyText = document.getElementById('historyEmpty');

// 전광판 수치 요소들
const statTotalCountEl = document.getElementById('statTotalCount');
const statHeadCountEl = document.getElementById('statHeadCount');
const statTailCountEl = document.getElementById('statTailCount');
const statHeadPercentEl = document.getElementById('statHeadPercent');
const statTailPercentEl = document.getElementById('statTailPercent');
const statHeadRatioEl = document.getElementById('statHeadRatio');
const statDiffBadgeEl = document.getElementById('statDiffBadge');
const ratioProgressBar = document.getElementById('ratioProgressBar');
const statusMessageText = document.getElementById('statusMessageText');

// 조작 버튼 요소들
const btnFlip1 = document.getElementById('btnFlip1');
const btnFlip100 = document.getElementById('btnFlip100');
const btnFlip1000 = document.getElementById('btnFlip1000');
const btnAutoPlay = document.getElementById('btnAutoPlay');
const btnReset = document.getElementById('btnReset');
const autoPlayIcon = document.getElementById('autoPlayIcon');
const autoPlayText = document.getElementById('autoPlayText');

// ----------------------------------------------------
// 3. Chart.js 꺾은선 그래프 초기화 (대수의 법칙 시각화)
// ----------------------------------------------------
const ctx = document.getElementById('probabilityChart').getContext('2d');

/**
 * 차트 객체 생성: 시행 횟수에 따른 통계적 확률과 수학적 확률(0.5)을 함께 렌더링
 */
const probabilityChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [0], // X축: 총 시행 횟수
    datasets: [
      {
        label: '통계적 확률 (실험값)',
        data: [null], // 초기값 없음
        borderColor: '#4f46e5', // 선 색상 (인디고 블루)
        backgroundColor: 'rgba(79, 70, 229, 0.08)',
        borderWidth: 2,
        tension: 0.15, // 곡선 완화도 (부드러운 곡선)
        pointRadius: 2, // 데이터 점의 반지름 크기
        pointHoverRadius: 5,
        fill: false,
      },
      {
        label: '수학적 확률 (이론값 0.5)',
        data: [0.5], // 0.5 기준선 데이터
        borderColor: '#ef4444', // 빨간색 기준선
        borderWidth: 2,
        borderDash: [6, 4], // 점선 스타일 (대시 패턴)
        pointRadius: 0, // 기준선에는 점을 표시하지 않음
        fill: false,
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false, // 컨테이너 높이에 맞춰 유연하게 반응형 크기 조절
    animation: {
      duration: 300 // 그래프 갱신 애니메이션 속도(밀리초)
    },
    scales: {
      x: {
        title: {
          display: true,
          text: '총 던진 횟수 (시행 횟수, N)',
          font: { weight: 'bold', size: 12 }
        },
        ticks: {
          maxTicksLimit: 12 // 축 레이블이 너무 빽빽하지 않도록 조절
        },
        grid: {
          color: '#f1f5f9'
        }
      },
      y: {
        min: 0,
        max: 1.0, // 앞면의 비율 범위: 0.0부터 1.0까지
        title: {
          display: true,
          text: '앞면이 나온 비율 (상대도수)',
          font: { weight: 'bold', size: 12 }
        },
        ticks: {
          stepSize: 0.1, // 0.1 단위 눈금 표시
          callback: function(value) {
            return value.toFixed(1); // 소수점 한 자리로 깔끔하게 포맷
          }
        },
        grid: {
          color: function(context) {
            // 0.5 기준선 그리드를 조금 더 눈에 띄게 표시
            if (context.tick && context.tick.value === 0.5) {
              return '#fca5a5';
            }
            return '#f1f5f9';
          }
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          font: { family: "'Noto Sans KR', sans-serif", size: 12 }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            if (value === null) return '';
            return `${label}: ${value.toFixed(4)} (${(value * 100).toFixed(2)}%)`;
          }
        }
      }
    }
  }
});

// ----------------------------------------------------
// 4. 핵심 시뮬레이션 함수군
// ----------------------------------------------------

/**
 * 단일 동전 던지기 실행 함수
 * @returns {'H' | 'T'} 'H'는 앞면(Head), 'T'는 뒷면(Tail)
 */
function flipSingleCoin() {
  // Math.random()은 0 이상 1 미만의 난수(무작위 실수)를 반환합니다.
  // 0.5 미만이면 앞면('H'), 0.5 이상이면 뒷면('T')으로 판정합니다.
  return Math.random() < 0.5 ? 'H' : 'T';
}

/**
 * 최근 10회 기록 배열 및 화면 칩 업데이트
 * @param {'H' | 'T'} result 동전 결과
 */
function updateRecentHistory(result) {
  recentHistory.unshift(result); // 배열 맨 앞에 최신 결과 추가
  if (recentHistory.length > 10) {
    recentHistory.pop(); // 최근 10개만 유지
  }

  // 화면 칩 갱신
  historyChipsContainer.innerHTML = '';
  historyEmptyText.style.display = 'none';

  recentHistory.forEach(item => {
    const chip = document.createElement('span');
    chip.classList.add('history-chip', item === 'H' ? 'head' : 'tail');
    chip.textContent = item === 'H' ? '앞' : '뒤';
    historyChipsContainer.appendChild(chip);
  });
}

/**
 * 전광판 및 통계 화면 수치 업데이트
 */
function updateDashboard() {
  statTotalCountEl.textContent = totalCount.toLocaleString(); // 세 자리마다 콤마 표시
  statHeadCountEl.textContent = headCount.toLocaleString();
  statTailCountEl.textContent = tailCount.toLocaleString();

  if (totalCount === 0) {
    statHeadPercentEl.textContent = '0.0%';
    statTailPercentEl.textContent = '0.0%';
    statHeadRatioEl.textContent = '0.000';
    statDiffBadgeEl.textContent = '0.000';
    statDiffBadgeEl.className = 'px-2 py-0.5 rounded text-xs font-bold bg-slate-200 text-slate-700';
    ratioProgressBar.style.width = '50%';
    return;
  }

  // 통계적 확률(앞면 비율) 계산
  const headRatio = headCount / totalCount;
  const tailRatio = tailCount / totalCount;
  const errorDiff = Math.abs(headRatio - 0.5); // 수학적 확률(0.5)과의 오차(차이)

  // 전광판 수치 반영 (소수점 세 자리까지 표시)
  statHeadRatioEl.textContent = headRatio.toFixed(3);
  statHeadPercentEl.textContent = (headRatio * 100).toFixed(1) + '%';
  statTailPercentEl.textContent = (tailRatio * 100).toFixed(1) + '%';
  statDiffBadgeEl.textContent = errorDiff.toFixed(3);

  // 오차 크기에 따라 배지 색상 변경 (0.01 이내로 아주 근접하면 초록색으로 칭찬 효과)
  if (errorDiff <= 0.01) {
    statDiffBadgeEl.className = 'px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-300';
    statDiffBadgeEl.textContent = `${errorDiff.toFixed(3)} (0.5에 매우 근접!)`;
  } else if (errorDiff <= 0.05) {
    statDiffBadgeEl.className = 'px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-700 border border-indigo-200';
  } else {
    statDiffBadgeEl.className = 'px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200';
  }

  // 프로그레스 바 게이지 반영 (비율 % 변환)
  const barPercent = Math.min(Math.max(headRatio * 100, 2), 98); // 양 끝 잘림 방지
  ratioProgressBar.style.width = `${barPercent}%`;

  // 상태 메시지 동적 안내
  if (totalCount < 20) {
    statusMessageText.textContent = `시행 횟수(${totalCount}회)가 적어 0.5와 편차가 크게 나타납니다. [+100회]나 [+1,000회]로 횟수를 늘려보세요!`;
  } else if (totalCount < 500) {
    statusMessageText.textContent = `시행 횟수가 ${totalCount}회로 증가했습니다. 점차 0.5 기준선에 접근하고 있나요?`;
  } else {
    statusMessageText.textContent = `[대수의 법칙 확인!] ${totalCount.toLocaleString()}회의 대량 시행으로 앞면의 비율이 수학적 확률인 0.5에 거의 수렴했습니다.`;
  }
}

/**
 * 1회 던지기 함수 (3D 동전 회전 애니메이션 포함)
 */
function handleFlipOnce() {
  if (isFlipping) return; // 이미 회전 중인 경우 중복 클릭 방지
  isFlipping = true;

  const result = flipSingleCoin();
  totalCount += 1;
  if (result === 'H') headCount += 1;
  else tailCount += 1;

  // 동전 애니메이션 효과 적용
  coinElement.classList.add('flipping');
  coinHintText.textContent = '동전이 공중에서 회전하고 있습니다...';

  // 0.6초 후 결과에 따라 동전 면 확정 착지
  setTimeout(() => {
    coinElement.classList.remove('flipping');
    
    // 앞면이면 0도, 뒷면이면 180도 회전
    coinElement.style.transform = result === 'H' ? 'rotateY(0deg)' : 'rotateY(180deg)';
    
    // 배지 및 텍스트 갱신
    lastResultBadge.textContent = result === 'H' ? '방금 결과: 앞면(Head) ✨' : '방금 결과: 뒷면(Tail) 💫';
    lastResultBadge.className = result === 'H' 
      ? 'text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-300'
      : 'text-xs font-semibold px-2.5 py-1 bg-slate-200 text-slate-700 rounded-full border border-slate-300';

    coinHintText.textContent = `결과: [${result === 'H' ? '앞면' : '뒷면'}]이 나왔습니다!`;

    // 최근 기록 및 전광판 갱신
    updateRecentHistory(result);
    updateDashboard();

    // 그래프에 1개 데이터 포인트 추가
    const ratio = headCount / totalCount;
    probabilityChart.data.labels.push(totalCount);
    probabilityChart.data.datasets[0].data.push(ratio);
    probabilityChart.data.datasets[1].data.push(0.5); // 기준선 연장
    probabilityChart.update();

    isFlipping = false;
  }, 650);
}

/**
 * 대량 시뮬레이션 실행 함수 (+100회, +1000회 등)
 * 브라우저 렉(지연 현상) 없이 빠른 계산과 최적화된 그래프 렌더링 지원
 * @param {number} count 던질 횟수 (100 또는 1000)
 */
function handleBatchFlip(count) {
  let newHeads = 0;
  let newTails = 0;

  // 그래프가 과도하게 무거워지는 것을 방지하기 위해 샘플 간격(Step) 결정
  // 100회인 경우 5회 간격, 1000회인 경우 20회 간격으로 그래프 포인트를 수집
  const step = count >= 1000 ? 25 : 5;

  const initialTotal = totalCount;
  const initialHeads = headCount;

  for (let i = 1; i <= count; i++) {
    const isHead = Math.random() < 0.5;
    if (isHead) newHeads++;
    else newTails++;

    // 샘플링 주기에 도달했거나 마지막 회차인 경우 그래프 포인트 수집
    if (i % step === 0 || i === count) {
      const currentSimTotal = initialTotal + i;
      const currentSimHeads = initialHeads + newHeads;
      const currentRatio = currentSimHeads / currentSimTotal;

      probabilityChart.data.labels.push(currentSimTotal);
      probabilityChart.data.datasets[0].data.push(currentRatio);
      probabilityChart.data.datasets[1].data.push(0.5); // 0.5 기준선 유지
    }
  }

  // 누적 통계치 합산
  totalCount += count;
  headCount += newHeads;
  tailCount += newTails;

  // 마지막 결과 반영 및 최근 기록에 샘플 추가
  const lastCoin = Math.random() < 0.5 ? 'H' : 'T';
  updateRecentHistory(lastCoin);

  // 동전 회전 비주얼 살짝 전환
  coinElement.style.transform = lastCoin === 'H' ? 'rotateY(0deg)' : 'rotateY(180deg)';
  lastResultBadge.textContent = `+${count.toLocaleString()}회 대량 실험 완료!`;
  lastResultBadge.className = 'text-xs font-semibold px-2.5 py-1 bg-violet-100 text-violet-800 rounded-full border border-violet-300';
  coinHintText.textContent = `+${count}회를 한 번에 던졌습니다. 그래프와 전광판을 확인해 보세요!`;

  // 전광판 및 그래프 렌더링 갱신
  updateDashboard();
  probabilityChart.update();
}

/**
 * 자동 던지기 토글 함수 (수업 시연 시 교사가 자동으로 숫자가 올라가는 모습을 보여줄 때 유용)
 */
function toggleAutoPlay() {
  if (autoPlayTimer) {
    // 자동 던지기 중지
    clearInterval(autoPlayTimer);
    autoPlayTimer = null;
    autoPlayIcon.textContent = '▶️';
    autoPlayText.textContent = '자동 던지기 시작';
    btnAutoPlay.classList.remove('bg-indigo-600', 'text-white');
    btnAutoPlay.classList.add('bg-slate-100', 'text-slate-700');
  } else {
    // 자동 던지기 시작 (0.15초마다 1회씩 빠르게 연속 시행)
    autoPlayIcon.textContent = '⏸️';
    autoPlayText.textContent = '일시 정지';
    btnAutoPlay.classList.remove('bg-slate-100', 'text-slate-700');
    btnAutoPlay.classList.add('bg-indigo-600', 'text-white');

    autoPlayTimer = setInterval(() => {
      const result = flipSingleCoin();
      totalCount += 1;
      if (result === 'H') headCount += 1;
      else tailCount += 1;

      // 5회마다 또는 처음 10회 동안은 매번 그래프 업데이트
      const shouldUpdateChart = totalCount <= 20 || totalCount % 5 === 0;

      if (shouldUpdateChart) {
        updateRecentHistory(result);
        updateDashboard();

        const ratio = headCount / totalCount;
        probabilityChart.data.labels.push(totalCount);
        probabilityChart.data.datasets[0].data.push(ratio);
        probabilityChart.data.datasets[1].data.push(0.5);
        probabilityChart.update('none'); // 애니메이션 없이 즉시 갱신 (부드러운 연속 재생)
      }
    }, 120);
  }
}

/**
 * 모든 데이터 초기화 (Reset)
 */
function handleReset() {
  if (autoPlayTimer) {
    toggleAutoPlay(); // 실행 중인 자동 재생 중지
  }

  totalCount = 0;
  headCount = 0;
  tailCount = 0;
  recentHistory.length = 0; // 배열 비우기

  // 동전 회전 리셋
  coinElement.style.transform = 'rotateY(0deg)';
  coinElement.classList.remove('flipping');
  lastResultBadge.textContent = '준비 상태';
  lastResultBadge.className = 'text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full';
  coinHintText.textContent = '아래의 버튼을 눌러 동전을 던져보세요!';

  // 최근 기록 UI 초기화
  historyChipsContainer.innerHTML = '';
  historyEmptyText.style.display = 'inline';

  // 전광판 초기화
  updateDashboard();

  // 그래프 초기화
  probabilityChart.data.labels = [0];
  probabilityChart.data.datasets[0].data = [null];
  probabilityChart.data.datasets[1].data = [0.5];
  probabilityChart.update();

  statusMessageText.textContent = '실험 데이터가 초기화되었습니다. 새로운 실험을 시작해보세요!';
}

// ----------------------------------------------------
// 5. 이벤트 리스너(Event Listener) 등록
// ----------------------------------------------------

// 버튼 클릭 이벤트 연결
btnFlip1.addEventListener('click', handleFlipOnce);
btnFlip100.addEventListener('click', () => handleBatchFlip(100));
btnFlip1000.addEventListener('click', () => handleBatchFlip(1000));
btnAutoPlay.addEventListener('click', toggleAutoPlay);
btnReset.addEventListener('click', handleReset);

// 동전 자체를 직접 클릭해도 1회 던져지도록 편의 기능 제공
coinElement.addEventListener('click', handleFlipOnce);

// 수업용 질문 상자 힌트 토글 아코디언 동작 구현
const hintButtons = document.querySelectorAll('.toggle-hint-btn');
hintButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-target');
    const targetEl = document.getElementById(targetId);
    const arrowIcon = btn.querySelector('span:last-child');

    if (targetEl.classList.contains('hidden')) {
      targetEl.classList.remove('hidden');
      if (arrowIcon) arrowIcon.style.transform = 'rotate(180deg)';
    } else {
      targetEl.classList.add('hidden');
      if (arrowIcon) arrowIcon.style.transform = 'rotate(0deg)';
    }
  });
});

// 최초 실행 시 대시보드 0값 셋팅
updateDashboard();

/* ========================================================
   6. 모드 전환 탭 (동전 던지기 <-> 주사위 굴리기) 로직
   ======================================================== */

// 모드 전환 탭 요소 참조
const tabCoin = document.getElementById('tabCoin');
const tabDice = document.getElementById('tabDice');
const coinModeSection = document.getElementById('coinModeSection');
const diceModeSection = document.getElementById('diceModeSection');
const modeDescriptionText = document.getElementById('modeDescriptionText');

/**
 * 활성 탭 전환 함수
 * @param {'coin' | 'dice'} mode 전환할 모드
 */
function switchMode(mode) {
  // 모드 변경 시 혹시 실행 중인 자동 반복 실행(타이머)이 있다면 중지
  if (autoPlayTimer) toggleAutoPlay();
  if (diceAutoPlayTimer) toggleDiceAutoPlay();

  if (mode === 'coin') {
    // 동전 모드 활성화 스타일 적용
    tabCoin.className = 'flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-bold text-sm transition-all shadow-sm bg-white text-indigo-700';
    tabDice.className = 'flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm transition-all text-slate-600 hover:text-slate-900';

    coinModeSection.classList.remove('hidden');
    diceModeSection.classList.add('hidden');
    modeDescriptionText.textContent = '동전을 던져 앞/뒷면의 상대도수가 0.5로 수렴하는 과정을 관찰합니다.';
  } else {
    // 주사위 모드 활성화 스타일 적용
    tabDice.className = 'flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-bold text-sm transition-all shadow-sm bg-white text-emerald-700';
    tabCoin.className = 'flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm transition-all text-slate-600 hover:text-slate-900';

    diceModeSection.classList.remove('hidden');
    coinModeSection.classList.add('hidden');
    modeDescriptionText.textContent = '주사위를 굴려 1~6 눈금의 상대도수가 1/6(약 16.7%)로 균등하게 맞춰지는 모습을 관찰합니다.';

    // 주사위 차트 크기 재계산 (화면 표시 전환 시 렌더링 최적화)
    if (diceProbabilityChart) {
      diceProbabilityChart.resize();
    }
  }
}

tabCoin.addEventListener('click', () => switchMode('coin'));
tabDice.addEventListener('click', () => switchMode('dice'));


/* ========================================================
   7. 3D 주사위 굴리기 시뮬레이션 상태 및 DOM 참조
   ======================================================== */

// 주사위 시뮬레이션 상태 변수
let diceTotalCount = 0; // 주사위를 굴린 총 횟수 (누적 시행 횟수)
const diceCounts = [0, 0, 0, 0, 0, 0]; // 1의 눈부터 6의 눈까지 각각 나온 횟수 (인덱스 0 = 1의 눈)
const recentDiceHistory = []; // 최근 10회 주사위 결과 저장 배열
let isDiceRolling = false; // 주사위 굴리기 애니메이션 진행 중 플래그(중복 클릭 방지)
let diceAutoPlayTimer = null; // 주사위 자동 굴리기 반복 타이머 ID

// 주사위 인터랙션 및 전광판 DOM 요소 참조
const diceCubeEl = document.getElementById('diceCube');
const diceLastResultBadgeEl = document.getElementById('diceLastResultBadge');
const diceHintTextEl = document.getElementById('diceHintText');
const diceHistoryChipsEl = document.getElementById('diceHistoryChips');
const diceHistoryEmptyEl = document.getElementById('diceHistoryEmpty');
const statDiceTotalCountEl = document.getElementById('statDiceTotalCount');
const statDiceMaxDiffBadgeEl = document.getElementById('statDiceMaxDiffBadge');
const diceStatusMessageTextEl = document.getElementById('diceStatusMessageText');

// 주사위 6개 눈 전광판 개별 요소 참조 (1~6번)
const statDiceCountEls = [
  document.getElementById('statDiceCount1'),
  document.getElementById('statDiceCount2'),
  document.getElementById('statDiceCount3'),
  document.getElementById('statDiceCount4'),
  document.getElementById('statDiceCount5'),
  document.getElementById('statDiceCount6')
];

const statDicePercentEls = [
  document.getElementById('statDicePercent1'),
  document.getElementById('statDicePercent2'),
  document.getElementById('statDicePercent3'),
  document.getElementById('statDicePercent4'),
  document.getElementById('statDicePercent5'),
  document.getElementById('statDicePercent6')
];

const statDiceBarEls = [
  document.getElementById('statDiceBar1'),
  document.getElementById('statDiceBar2'),
  document.getElementById('statDiceBar3'),
  document.getElementById('statDiceBar4'),
  document.getElementById('statDiceBar5'),
  document.getElementById('statDiceBar6')
];

// 주사위 조작 버튼 참조
const btnDiceRoll1 = document.getElementById('btnDiceRoll1');
const btnDiceRoll100 = document.getElementById('btnDiceRoll100');
const btnDiceRoll1000 = document.getElementById('btnDiceRoll1000');
const btnDiceAutoPlay = document.getElementById('btnDiceAutoPlay');
const btnDiceReset = document.getElementById('btnDiceReset');
const diceAutoPlayIcon = document.getElementById('diceAutoPlayIcon');
const diceAutoPlayText = document.getElementById('diceAutoPlayText');


/* ========================================================
   8. Chart.js 주사위 막대 그래프 (균등 분포 시각화)
   ======================================================== */
const diceCtx = document.getElementById('diceProbabilityChart').getContext('2d');

/**
 * 주사위 6개 눈의 상대도수 막대 그래프 초기화
 * 각 눈의 통계적 확률 막대와 함께 1/6 (16.67%) 이론값 기준선을 함께 표시
 */
const diceProbabilityChart = new Chart(diceCtx, {
  type: 'bar',
  data: {
    labels: ['1의 눈', '2의 눈', '3의 눈', '4의 눈', '5의 눈', '6의 눈'],
    datasets: [
      {
        type: 'bar',
        label: '통계적 확률 (실험값, %)',
        data: [0, 0, 0, 0, 0, 0],
        backgroundColor: [
          'rgba(239, 68, 68, 0.75)',  // 1의 눈: 붉은색 강조
          'rgba(16, 185, 129, 0.75)', // 2의 눈: 에메랄드
          'rgba(20, 184, 166, 0.75)', // 3의 눈: 틸
          'rgba(6, 182, 212, 0.75)',  // 4의 눈: 시안
          'rgba(14, 165, 233, 0.75)', // 5의 눈: 스카이블루
          'rgba(99, 102, 241, 0.75)'  // 6의 눈: 인디고
        ],
        borderColor: [
          '#ef4444',
          '#10b981',
          '#14b8a6',
          '#06b6d4',
          '#0ea5e9',
          '#6366f1'
        ],
        borderWidth: 1.5,
        borderRadius: 8,
        barPercentage: 0.6
      },
      {
        type: 'line',
        label: '수학적 확률 (1/6 ≈ 16.67%)',
        data: [16.67, 16.67, 16.67, 16.67, 16.67, 16.67], // 16.67% 수평 기준선
        borderColor: '#ef4444',
        borderWidth: 2,
        borderDash: [6, 4], // 점선 표시
        pointRadius: 0,
        fill: false
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 250 // 차트 부드러운 갱신 속도
    },
    scales: {
      x: {
        title: {
          display: true,
          text: '주사위 눈금',
          font: { weight: 'bold', size: 12 }
        },
        grid: { color: '#f1f5f9' }
      },
      y: {
        min: 0,
        max: 40, // 40%까지 표시하여 초반 변동 및 기준선 비교 용이
        title: {
          display: true,
          text: '나온 비율 (%)',
          font: { weight: 'bold', size: 12 }
        },
        ticks: {
          callback: function(value) {
            return value + '%';
          }
        },
        grid: {
          color: function(context) {
            // 16.7% 근처 그리드 구분을 부드럽게 유지
            return '#f1f5f9';
          }
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          font: { family: "'Noto Sans KR', sans-serif", size: 12 }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value.toFixed(2)}%`;
          }
        }
      }
    }
  }
});


/* ========================================================
   9. 주사위 회전 각도 및 대시보드 갱신 함수군
   ======================================================== */

/**
 * 1부터 6까지의 눈금에 맞춰 정면을 향하도록 하는 3차원 회전 변환(Transform) 문자열 반환
 * @param {number} face 주사위 눈금 (1 ~ 6)
 * @returns {string} CSS transform 속성값
 */
function getDiceTransform(face) {
  // 정육면체 면 매핑:
  // 1번(앞): rotateX(0) rotateY(0)
  // 6번(뒤): rotateY(180deg)
  // 2번(우): rotateY(-90deg)
  // 5번(좌): rotateY(90deg)
  // 3번(상): rotateX(-90deg)
  // 4번(하): rotateX(90deg)
  switch (face) {
    case 1: return 'rotateX(0deg) rotateY(0deg)';
    case 2: return 'rotateX(0deg) rotateY(-90deg)';
    case 3: return 'rotateX(-90deg) rotateY(0deg)';
    case 4: return 'rotateX(90deg) rotateY(0deg)';
    case 5: return 'rotateX(0deg) rotateY(90deg)';
    case 6: return 'rotateX(0deg) rotateY(180deg)';
    default: return 'rotateX(0deg) rotateY(0deg)';
  }
}

/**
 * 주사위 최근 10회 기록 배열 및 화면 배지 칩 갱신
 * @param {number} face 나온 주사위 눈 (1~6)
 */
function updateRecentDiceHistory(face) {
  recentDiceHistory.unshift(face); // 최근 결과를 맨 앞에 삽입
  if (recentDiceHistory.length > 10) {
    recentDiceHistory.pop(); // 최근 10개만 유지
  }

  diceHistoryChipsEl.innerHTML = '';
  diceHistoryEmptyEl.style.display = 'none';

  recentDiceHistory.forEach(num => {
    const chip = document.createElement('span');
    chip.classList.add('dice-history-chip');
    if (num === 1) chip.classList.add('num-1');
    chip.textContent = num;
    diceHistoryChipsEl.appendChild(chip);
  });
}

/**
 * 주사위 전광판 및 통계 화면 수치 업데이트
 */
function updateDiceDashboard() {
  statDiceTotalCountEl.textContent = diceTotalCount.toLocaleString();

  if (diceTotalCount === 0) {
    // 시행 횟수가 0일 때 초기화 상태 표시
    for (let i = 0; i < 6; i++) {
      statDiceCountEls[i].textContent = '0';
      statDicePercentEls[i].textContent = '0.0%';
      statDiceBarEls[i].style.width = '0%';
    }
    statDiceMaxDiffBadgeEl.textContent = '오차: 0.0%';
    statDiceMaxDiffBadgeEl.className = 'inline-block px-3 py-1 rounded-lg text-xs font-bold bg-slate-200 text-slate-700';
    return;
  }

  const theoreticalProb = 1 / 6; // 이론적 수학적 확률 (약 0.166667)
  let maxDiff = 0;
  const chartPercentages = [];

  for (let i = 0; i < 6; i++) {
    const count = diceCounts[i];
    const ratio = count / diceTotalCount;
    const percent = ratio * 100;
    chartPercentages.push(percent);

    // 개별 눈 수치 및 비율 텍스트 반영
    statDiceCountEls[i].textContent = count.toLocaleString();
    statDicePercentEls[i].textContent = percent.toFixed(1) + '%';

    // 미니 프로그레스 바 너비 설정 (최대 40% 기준 대비 비율 계산)
    const barWidth = Math.min((percent / 35) * 100, 100);
    statDiceBarEls[i].style.width = `${barWidth}%`;

    // 이론값과의 최대 편차(차이) 계산
    const diff = Math.abs(ratio - theoreticalProb);
    if (diff > maxDiff) {
      maxDiff = diff;
    }
  }

  // 최대 오차 배지 업데이트 (% 변환)
  const maxDiffPercent = (maxDiff * 100).toFixed(1);
  if (maxDiff <= 0.02) {
    statDiceMaxDiffBadgeEl.className = 'inline-block px-3 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-300';
    statDiceMaxDiffBadgeEl.textContent = `최대 오차: ${maxDiffPercent}% (매우 균등!)`;
  } else if (maxDiff <= 0.05) {
    statDiceMaxDiffBadgeEl.className = 'inline-block px-3 py-1 rounded-lg text-xs font-bold bg-teal-100 text-teal-700 border border-teal-200';
    statDiceMaxDiffBadgeEl.textContent = `최대 오차: ${maxDiffPercent}%`;
  } else {
    statDiceMaxDiffBadgeEl.className = 'inline-block px-3 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200';
    statDiceMaxDiffBadgeEl.textContent = `최대 오차: ${maxDiffPercent}%`;
  }

  // 상태 메시지 안내
  if (diceTotalCount < 30) {
    diceStatusMessageTextEl.textContent = `시행 횟수(${diceTotalCount}회)가 적어 눈금별로 나온 횟수의 편차가 큽니다. [+100회]나 [+1,000회]를 눌러보세요!`;
  } else if (diceTotalCount < 500) {
    diceStatusMessageTextEl.textContent = `시행 횟수가 ${diceTotalCount}회로 늘어나며 6개 눈의 비율이 점차 16.7% 기준선에 가까워지고 있습니다.`;
  } else {
    diceStatusMessageTextEl.textContent = `[대수의 법칙 확인!] ${diceTotalCount.toLocaleString()}회의 대량 시행으로 6가지 눈의 비율이 모두 약 16.7% 균등 분포로 수렴했습니다.`;
  }

  // 차트 데이터 갱신
  diceProbabilityChart.data.datasets[0].data = chartPercentages;
  diceProbabilityChart.update('none'); // 지연 없이 즉각 부드럽게 갱신
}


/* ========================================================
   10. 주사위 굴리기 핵심 핸들러군
   ======================================================== */

/**
 * 1회 주사위 굴리기 (데굴데굴 굴러가는 3D 애니메이션 적용)
 */
function handleDiceRollOnce() {
  if (isDiceRolling) return; // 이미 주사위가 굴러가는 중이면 중복 클릭 방지
  isDiceRolling = true;

  // 1부터 6까지 난수(무작위 정수) 생성
  const rolledNumber = Math.floor(Math.random() * 6) + 1;
  diceTotalCount += 1;
  diceCounts[rolledNumber - 1] += 1;

  // 1. 3D 구르는 애니메이션 클래스 부여
  diceCubeEl.classList.add('rolling');
  diceHintTextEl.textContent = '주사위가 데굴데굴 공중에서 굴러가고 있습니다... 🎲';

  // 2. 800ms 동안 애니메이션 실행 후 최종 눈금 각도로 정확히 착지
  setTimeout(() => {
    diceCubeEl.classList.remove('rolling');

    // 나온 눈금에 맞는 3차원 축 각도 설정
    diceCubeEl.style.transform = getDiceTransform(rolledNumber);

    // 결과 배지 갱신
    diceLastResultBadgeEl.textContent = `방금 결과: ${rolledNumber}의 눈 🎯`;
    diceLastResultBadgeEl.className = rolledNumber === 1
      ? 'text-xs font-semibold px-2.5 py-1 bg-red-100 text-red-700 rounded-full border border-red-300'
      : 'text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300';

    diceHintTextEl.textContent = `[${rolledNumber}의 눈]이 나왔습니다! 다시 굴려보세요.`;

    // 최근 기록 및 대시보드 갱신
    updateRecentDiceHistory(rolledNumber);
    updateDiceDashboard();

    isDiceRolling = false;
  }, 800);
}

/**
 * 대량 주사위 굴리기 함수 (+100회, +1000회 등)
 * 브라우저 렉(지연 현상) 없이 초고속 계산 및 통계 반영
 * @param {number} count 굴릴 횟수 (100 또는 1000)
 */
function handleDiceBatchRoll(count) {
  let lastRoll = 1;

  for (let i = 0; i < count; i++) {
    const rolled = Math.floor(Math.random() * 6) + 1;
    diceCounts[rolled - 1] += 1;
    lastRoll = rolled;
  }

  diceTotalCount += count;

  // 마지막 결과로 주사위 면 회전 및 기록 배지 추가
  diceCubeEl.style.transform = getDiceTransform(lastRoll);
  updateRecentDiceHistory(lastRoll);

  diceLastResultBadgeEl.textContent = `+${count.toLocaleString()}회 대량 실험 완료!`;
  diceLastResultBadgeEl.className = 'text-xs font-semibold px-2.5 py-1 bg-teal-100 text-teal-800 rounded-full border border-teal-300';
  diceHintTextEl.textContent = `+${count}회를 한 번에 굴렸습니다. 막대 그래프의 높이가 평평해졌는지 확인해 보세요!`;

  // 전광판 및 차트 즉시 갱신
  updateDiceDashboard();
}

/**
 * 주사위 자동 굴리기 토글 함수
 */
function toggleDiceAutoPlay() {
  if (diceAutoPlayTimer) {
    // 자동 굴리기 중지
    clearInterval(diceAutoPlayTimer);
    diceAutoPlayTimer = null;
    diceAutoPlayIcon.textContent = '▶️';
    diceAutoPlayText.textContent = '자동 굴리기 시작';
    btnDiceAutoPlay.classList.remove('bg-emerald-600', 'text-white');
    btnDiceAutoPlay.classList.add('bg-slate-100', 'text-slate-700');
  } else {
    // 자동 굴리기 시작 (0.12초마다 빠르게 연속 시행)
    diceAutoPlayIcon.textContent = '⏸️';
    diceAutoPlayText.textContent = '일시 정지';
    btnDiceAutoPlay.classList.remove('bg-slate-100', 'text-slate-700');
    btnDiceAutoPlay.classList.add('bg-emerald-600', 'text-white');

    diceAutoPlayTimer = setInterval(() => {
      const rolled = Math.floor(Math.random() * 6) + 1;
      diceTotalCount += 1;
      diceCounts[rolled - 1] += 1;

      // 주사위 면 가볍게 갱신
      diceCubeEl.style.transform = getDiceTransform(rolled);

      // 일정 주기마다 UI 대시보드 갱신 (성능 최적화)
      if (diceTotalCount <= 20 || diceTotalCount % 4 === 0) {
        updateRecentDiceHistory(rolled);
        updateDiceDashboard();
      }
    }, 120);
  }
}

/**
 * 주사위 실험 데이터 초기화 (Reset)
 */
function handleDiceReset() {
  if (diceAutoPlayTimer) {
    toggleDiceAutoPlay(); // 실행 중인 자동 재생 중지
  }

  diceTotalCount = 0;
  for (let i = 0; i < 6; i++) {
    diceCounts[i] = 0;
  }
  recentDiceHistory.length = 0; // 배열 비우기

  // 주사위 회전 기본 상태(1의 눈 정면)로 리셋
  diceCubeEl.style.transform = 'rotateX(0deg) rotateY(0deg)';
  diceCubeEl.classList.remove('rolling');

  diceLastResultBadgeEl.textContent = '준비 상태';
  diceLastResultBadgeEl.className = 'text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full';
  diceHintTextEl.textContent = '주사위를 직접 클릭하거나 아래 버튼을 눌러 데굴데굴 굴려보세요!';

  // 최근 기록 칩 초기화
  diceHistoryChipsEl.innerHTML = '';
  diceHistoryEmptyEl.style.display = 'inline';

  // 전광판 및 차트 초기화
  updateDiceDashboard();

  diceStatusMessageTextEl.textContent = '주사위 데이터가 초기화되었습니다. 새로운 실험을 시작해보세요!';
}


/* ========================================================
   11. 주사위 이벤트 리스너(Event Listener) 등록
   ======================================================== */

// 버튼 클릭 이벤트 연결
btnDiceRoll1.addEventListener('click', handleDiceRollOnce);
btnDiceRoll100.addEventListener('click', () => handleDiceBatchRoll(100));
btnDiceRoll1000.addEventListener('click', () => handleDiceBatchRoll(1000));
btnDiceAutoPlay.addEventListener('click', toggleDiceAutoPlay);
btnDiceReset.addEventListener('click', handleDiceReset);

// 주사위 큐브 자체를 직접 클릭해도 굴러가는 인터랙션 지원
diceCubeEl.addEventListener('click', handleDiceRollOnce);

// 최초 실행 시 주사위 대시보드 0값 초기화
updateDiceDashboard();

