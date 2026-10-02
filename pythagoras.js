/**
 * ============================================================================
 * 피타고라스 정리와 두 점 사이의 거리 공식 인터랙티브 수업용 스크립트 (app.js)
 * ----------------------------------------------------------------------------
 * 학생과 교사가 직교좌표계 위의 두 점을 직접 드래그하며 피타고라스 정리로부터
 * 두 점 사이의 거리 공식이 자연스럽게 유도되는 과정을 직관적으로 탐구합니다.
 * ============================================================================
 */

// 1. 상태 변수 (State Variables: 프로그램의 현재 상태를 기억하는 변수들)
const state = {
  // 점 A와 점 B의 수학적 좌표 (Math Coordinates)
  pointA: { x: 0, y: 0 },
  pointB: { x: 3, y: 4 },

  // 드래그 및 호버 상태
  activePoint: null,       // 현재 마우스/터치로 잡고 있는 점 ('A' | 'B' | null)
  hoveredPoint: null,      // 마우스가 올라가 있는 점 ('A' | 'B' | null)
  isPointerDown: false,    // 마우스 버튼이나 화면 터치가 눌려 있는지 여부

  // 격자 및 뷰포트(화면 표시 영역) 설정
  gridUnit: 36,            // 모눈 1칸(정수 1단위)의 픽셀 크기
  zoom: 1.0,               // 화면 확대/축소 배율
  minZoom: 0.6,
  maxZoom: 1.8,
  originOffset: { x: 0, y: 0 }, // 캔버스 중심에서 원점(0,0)의 미세 이동 오프셋(보정값)
  snapToGrid: true,        // 정수 좌표 자석 스냅(달라붙기) 활성화 여부
  hitRadius: 28,           // 터치 및 클릭 인식 반경(Hitbox: 터치 인식 영역)
};

// 2. DOM 요소 (웹 페이지의 HTML 엘리먼트들) 캐싱
const canvas = document.getElementById('mathCanvas');
const ctx = canvas.getContext('2d');
const canvasContainer = document.getElementById('canvasContainer');

// 실시간 좌표 표시 배지
const badgeCoordA = document.getElementById('badgeCoordA');
const badgeCoordB = document.getElementById('badgeCoordB');
const badgeCoordC = document.getElementById('badgeCoordC');

// 계산판 DOM 요소들
const calcLegAFormula = document.getElementById('calcLegAFormula');
const calcLegA = document.getElementById('calcLegA');
const calcLegBFormula = document.getElementById('calcLegBFormula');
const calcLegB = document.getElementById('calcLegB');

const pythagStep1 = document.getElementById('pythagStep1');
const pythagStep2 = document.getElementById('pythagStep2');
const pythagStep3 = document.getElementById('pythagStep3');
const textCSquared = document.getElementById('textCSquared');
const textCSquaredRoot = document.getElementById('textCSquaredRoot');

const distSqrtExpr = document.getElementById('distSqrtExpr');
const finalDistanceValue = document.getElementById('finalDistanceValue');
const approxDistance = document.getElementById('approxDistance');

// 컨트롤 체크박스 및 버튼들
const snapToGridCheckbox = document.getElementById('snapToGrid');
const btnZoomIn = document.getElementById('btnZoomIn');
const btnZoomOut = document.getElementById('btnZoomOut');
const btnResetView = document.getElementById('btnResetView');

// 탐구 미션 버튼들
const btnPreset345 = document.getElementById('btnPreset345');
const btnPreset51213 = document.getElementById('btnPreset51213');
const btnPresetSquare = document.getElementById('btnPresetSquare');
const btnPresetNegative = document.getElementById('btnPresetNegative');
const btnReset = document.getElementById('btnReset');

// 도움말 모달(팝업 창) 관련 요소들
const btnHelp = document.getElementById('btnHelp');
const helpModal = document.getElementById('helpModal');
const btnCloseHelp = document.getElementById('btnCloseHelp');
const btnConfirmHelp = document.getElementById('btnConfirmHelp');


/**
 * 3. 좌표계 변환 함수 (Coordinate Transformations)
 * - 수학 좌표(예: x=3, y=4)와 브라우저 캔버스의 픽셀 좌표(px, py)를 상호 변환합니다.
 */

// 실제 모눈 1칸의 화면 픽셀 크기 계산
function getEffectiveStep() {
  return state.gridUnit * state.zoom;
}

// 원점 (0, 0)의 캔버스 픽셀 위치 반환
function getOriginPixel() {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (rect.width / 2) + state.originOffset.x,
    y: (rect.height / 2) + state.originOffset.y,
  };
}

// 수학 좌표 -> 캔버스 픽셀 좌표 변환 (y축은 컴퓨터 화면에서 아래로 증가하므로 빼줍니다)
function mathToScreen(mathX, mathY) {
  const origin = getOriginPixel();
  const step = getEffectiveStep();
  return {
    x: origin.x + mathX * step,
    y: origin.y - mathY * step,
  };
}

// 캔버스 픽셀 좌표 -> 수학 좌표 변환
function screenToMath(screenX, screenY) {
  const origin = getOriginPixel();
  const step = getEffectiveStep();
  const rawX = (screenX - origin.x) / step;
  const rawY = (origin.y - screenY) / step;

  if (state.snapToGrid) {
    // 자석 스냅이 켜져 있으면 정수 좌표로 반올림하여 딱 맞아떨어지게 처리
    return {
      x: Math.round(rawX),
      y: Math.round(rawY),
    };
  }

  // 자석 스냅이 꺼져 있으면 소수점 첫째 자리까지 부드럽게 지원
  return {
    x: parseFloat(rawX.toFixed(1)),
    y: parseFloat(rawY.toFixed(1)),
  };
}


/**
 * 4. 캔버스 해상도 조절 (고해상도 레티나 디스플레이 지원)
 * - 모바일이나 아이패드에서 선이 흐릿해지지 않도록 기기의 픽셀 비율(Device Pixel Ratio)에 맞춰 선명하게 그립니다.
 */
function resizeCanvas() {
  const rect = canvasContainer.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1; // 기기의 화면 밀도 배율

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  // 캔버스 2D 컨텍스트의 스케일을 DPR에 맞추어 보정
  ctx.setTransform(1, 0, 0, 1, 0, 0); // 기존 변환 초기화
  ctx.scale(dpr, dpr);

  draw();
}


/**
 * 5. 수학 계산 보조 함수 (Math Helpers)
 */

// 근호(루트) 표현 및 간단한 제곱근 꼴 분해 (예: √20 -> 2√5)
function simplifySquareRoot(n) {
  const num = Math.round(n);
  if (num <= 0) return { coefficient: 0, radical: 0, isSquare: true };

  // 완전제곱수인지 먼저 확인
  const root = Math.round(Math.sqrt(num));
  if (root * root === num) {
    return { coefficient: root, radical: 1, isSquare: true };
  }

  // 완전제곱수가 아닌 경우 근호 밖으로 꺼낼 수 있는 최대 제곱수 탐색
  let maxSquareFactor = 1;
  for (let i = Math.floor(Math.sqrt(num)); i >= 2; i--) {
    if (num % (i * i) === 0) {
      maxSquareFactor = i;
      break;
    }
  }

  const remainder = num / (maxSquareFactor * maxSquareFactor);
  return {
    coefficient: maxSquareFactor,
    radical: remainder,
    isSquare: false,
  };
}


/**
 * 6. 실시간 계산판 및 UI 텍스트 갱신 (Update Dashboard)
 */
function updateDashboard() {
  const { pointA, pointB } = state;

  // 점 C의 좌표는 (B의 x좌표, A의 y좌표)로 정하여 직각삼각형 구성
  const pointC = { x: pointB.x, y: pointA.y };

  // 1단계: 가로 밑변(dx)과 세로 높이(dy) 길이 계산 (절댓값)
  const dx = Math.abs(pointB.x - pointA.x);
  const dy = Math.abs(pointB.y - pointA.y);

  // 상단 좌표 배지 업데이트
  badgeCoordA.textContent = `(${pointA.x}, ${pointA.y})`;
  badgeCoordB.textContent = `(${pointB.x}, ${pointB.y})`;
  badgeCoordC.textContent = `(${pointC.x}, ${pointC.y})`;

  // 가로 밑변 수식 갱신
  calcLegAFormula.textContent = `|${pointB.x} - (${pointA.x})| = `;
  calcLegA.textContent = dx % 1 === 0 ? dx : dx.toFixed(1);

  // 세로 높이 수식 갱신
  calcLegBFormula.textContent = `|${pointB.y} - (${pointA.y})| = `;
  calcLegB.textContent = dy % 1 === 0 ? dy : dy.toFixed(1);

  // 2단계: 피타고라스 정리 계산
  const aSquared = dx * dx;
  const bSquared = dy * dy;
  const cSquared = aSquared + bSquared;

  const dxDisp = dx % 1 === 0 ? dx : dx.toFixed(1);
  const dyDisp = dy % 1 === 0 ? dy : dy.toFixed(1);
  const a2Disp = aSquared % 1 === 0 ? aSquared : aSquared.toFixed(1);
  const b2Disp = bSquared % 1 === 0 ? bSquared : bSquared.toFixed(1);
  const c2Disp = cSquared % 1 === 0 ? cSquared : cSquared.toFixed(2);

  pythagStep1.textContent = `${dxDisp}² + ${dyDisp}²`;
  pythagStep2.textContent = `${a2Disp} + ${b2Disp}`;
  pythagStep3.textContent = `${c2Disp}`;
  textCSquared.textContent = `${c2Disp}`;
  if (textCSquaredRoot) textCSquaredRoot.textContent = `${c2Disp}`;

  // 3단계: 두 점 사이의 거리 공식 계산
  const actualDistance = Math.sqrt(cSquared);
  const simplified = simplifySquareRoot(cSquared);

  if (cSquared === 0) {
    distSqrtExpr.textContent = '√0';
    finalDistanceValue.textContent = '0';
    approxDistance.textContent = '(두 점이 일치함)';
  } else if (simplified.isSquare) {
    // 완전제곱수로 딱 떨어지는 경우 (예: 25 -> 5)
    distSqrtExpr.textContent = `√${c2Disp}`;
    finalDistanceValue.textContent = `${simplified.coefficient}`;
    approxDistance.textContent = '(정수로 딱 떨어짐)';
  } else {
    // 무리수인 경우 근호 표기 및 소수점 둘째 자리 표시
    let radicalText = `√${c2Disp}`;
    if (simplified.coefficient > 1) {
      radicalText = `${simplified.coefficient}√${simplified.radical}`;
    }
    distSqrtExpr.textContent = radicalText;
    finalDistanceValue.textContent = `≈ ${actualDistance.toFixed(2)}`;
    approxDistance.textContent = `(정확값: √${c2Disp} ≈ ${actualDistance.toFixed(3)}...)`;
  }
}


/**
 * 7. 메인 그리기 함수 (Main Drawing Engine)
 * - 캔버스 화면을 전체적으로 지우고 모눈, 축, 직각삼각형, 직각기호, 두 점을 순서대로 그립니다.
 */
function draw() {
  const rect = canvasContainer.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  // 이전 프레임 지우기
  ctx.clearRect(0, 0, width, height);

  const origin = getOriginPixel();
  const step = getEffectiveStep();

  // (1) 모눈종이 격자선 그리기 (Grid)
  drawGrid(width, height, origin, step);

  // (2) X축과 Y축 및 눈금 숫자 그리기
  drawAxes(width, height, origin, step);

  // (3) 직각삼각형 및 빗변(거리 선분), 직각 기호 그리기
  drawRightTriangle();

  // (4) 점 A와 점 B 그리기
  drawPoints();
}

/**
 * 모눈종이 격자 그리기
 */
function drawGrid(width, height, origin, step) {
  ctx.save();
  ctx.lineWidth = 1;

  // 캔버스 영역 내에서 보이는 모눈의 x, y 범위 계산
  const startX = origin.x % step;
  const startY = origin.y % step;

  // 연한 보조 모눈선 그리기
  ctx.strokeStyle = '#e2e8f0'; // 연한 슬레이트 회색
  ctx.beginPath();
  for (let x = startX; x <= width; x += step) {
    ctx.moveTo(Math.round(x) + 0.5, 0);
    ctx.lineTo(Math.round(x) + 0.5, height);
  }
  for (let y = startY; y <= height; y += step) {
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(width, Math.round(y) + 0.5);
  }
  ctx.stroke();

  // 5칸 단위 약간 더 진한 모눈선 그리기 (가독성 향상)
  const fiveStep = step * 5;
  const fiveStartX = origin.x % fiveStep;
  const fiveStartY = origin.y % fiveStep;

  ctx.strokeStyle = '#cbd5e1';
  ctx.beginPath();
  for (let x = fiveStartX; x <= width; x += fiveStep) {
    ctx.moveTo(Math.round(x) + 0.5, 0);
    ctx.lineTo(Math.round(x) + 0.5, height);
  }
  for (let y = fiveStartY; y <= height; y += fiveStep) {
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(width, Math.round(y) + 0.5);
  }
  ctx.stroke();

  ctx.restore();
}

/**
 * X축, Y축 및 눈금 숫자 그리기
 */
function drawAxes(width, height, origin, step) {
  ctx.save();
  ctx.strokeStyle = '#64748b'; // 또렷한 슬레이트 축 색상
  ctx.lineWidth = 2;

  // X축 그리기
  ctx.beginPath();
  ctx.moveTo(0, origin.y);
  ctx.lineTo(width, origin.y);
  ctx.stroke();

  // Y축 그리기
  ctx.beginPath();
  ctx.moveTo(origin.x, 0);
  ctx.lineTo(origin.x, height);
  ctx.stroke();

  // 화살표 그리기 (X축 양의 방향, Y축 양의 방향)
  ctx.fillStyle = '#64748b';
  // X축 우측 화살표
  ctx.beginPath();
  ctx.moveTo(width - 4, origin.y);
  ctx.lineTo(width - 14, origin.y - 5);
  ctx.lineTo(width - 14, origin.y + 5);
  ctx.closePath();
  ctx.fill();

  // Y축 상단 화살표
  ctx.beginPath();
  ctx.moveTo(origin.x, 4);
  ctx.lineTo(origin.x - 5, 14);
  ctx.lineTo(origin.x + 5, 14);
  ctx.closePath();
  ctx.fill();

  // 축 라벨 (x, y)
  ctx.font = 'bold 12px Pretendard, sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText('x', width - 16, origin.y + 18);
  ctx.fillText('y', origin.x - 16, 16);

  // 원점 라벨 'O'
  ctx.fillText('O', origin.x - 14, origin.y + 16);

  // 눈금 숫자 표시 (정수 좌표 눈금)
  ctx.font = '10px Pretendard, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // X축 눈금 숫자
  const minMathX = Math.floor((0 - origin.x) / step);
  const maxMathX = Math.ceil((width - origin.x) / step);
  for (let x = minMathX; x <= maxMathX; x++) {
    if (x === 0) continue;
    // 너무 조밀하지 않도록 스텝 크기에 따라 간격 조절
    if (step < 25 && x % 2 !== 0) continue;
    const px = origin.x + x * step;
    // 작은 눈금 바늘
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, origin.y - 3);
    ctx.lineTo(px, origin.y + 3);
    ctx.stroke();
    // 눈금 숫자
    ctx.fillText(`${x}`, px, origin.y + 5);
  }

  // Y축 눈금 숫자
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const minMathY = Math.floor((origin.y - height) / step);
  const maxMathY = Math.ceil(origin.y / step);
  for (let y = minMathY; y <= maxMathY; y++) {
    if (y === 0) continue;
    if (step < 25 && y % 2 !== 0) continue;
    const py = origin.y - y * step;
    // 작은 눈금 바늘
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(origin.x - 3, py);
    ctx.lineTo(origin.x + 3, py);
    ctx.stroke();
    // 눈금 숫자
    ctx.fillText(`${y}`, origin.x - 6, py);
  }

  ctx.restore();
}

/**
 * 직각삼각형, 빗변, 각 변의 길이 라벨 및 직각 기호 그리기
 */
function drawRightTriangle() {
  const { pointA, pointB } = state;
  const pointC = { x: pointB.x, y: pointA.y }; // 가로-세로 직각 꼭짓점

  const posA = mathToScreen(pointA.x, pointA.y);
  const posB = mathToScreen(pointB.x, pointB.y);
  const posC = mathToScreen(pointC.x, pointC.y);

  const dx = Math.abs(pointB.x - pointA.x);
  const dy = Math.abs(pointB.y - pointA.y);

  // (1) 두 점이 같은 수평선이나 수직선에 있지 않은 일반적인 직각삼각형일 때 내부 채우기
  if (dx > 0.05 && dy > 0.05) {
    ctx.save();
    // 은은한 인디고 틴트 채우기 (삼각형 영역 시각화)
    ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
    ctx.beginPath();
    ctx.moveTo(posA.x, posA.y);
    ctx.lineTo(posC.x, posC.y);
    ctx.lineTo(posB.x, posB.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 직각 기호(ㄴ 모양) 그리기
    drawRightAngleSymbol(posA, posB, posC);
  }

  // (2) 가로 밑변 선분 (점 A와 직각점 C를 잇는 선)
  if (dx > 0.05) {
    ctx.save();
    ctx.strokeStyle = '#0284c7'; // 하늘색 밑변
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 4]); // 점선 효과로 직관적 보조선 표시
    ctx.beginPath();
    ctx.moveTo(posA.x, posA.y);
    ctx.lineTo(posC.x, posC.y);
    ctx.stroke();
    ctx.restore();

    // 밑변 길이 라벨 태그 그리기
    const midX = (posA.x + posC.x) / 2;
    const midY = posC.y + (pointB.y < pointA.y ? -18 : 20);
    drawTextPill(midX, midY, `밑변: ${dx % 1 === 0 ? dx : dx.toFixed(1)}`, '#0284c7', '#e0f2fe');
  }

  // (3) 세로 높이 선분 (직각점 C와 점 B를 잇는 선)
  if (dy > 0.05) {
    ctx.save();
    ctx.strokeStyle = '#059669'; // 초록색 높이
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 4]); // 점선 효과
    ctx.beginPath();
    ctx.moveTo(posC.x, posC.y);
    ctx.lineTo(posB.x, posB.y);
    ctx.stroke();
    ctx.restore();

    // 높이 길이 라벨 태그 그리기
    const midX = posC.x + (pointB.x < pointA.x ? -36 : 36);
    const midY = (posC.y + posB.y) / 2;
    drawTextPill(midX, midY, `높이: ${dy % 1 === 0 ? dy : dy.toFixed(1)}`, '#059669', '#d1fae5');
  }

  // (4) 빗변 (점 A와 점 B를 잇는 두 점 사이의 거리 선분)
  ctx.save();
  ctx.strokeStyle = '#7c3aed'; // 보라색 빗변
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(posA.x, posA.y);
  ctx.lineTo(posB.x, posB.y);
  ctx.stroke();
  ctx.restore();

  // 빗변 거리 라벨 태그 그리기
  const dist = Math.hypot(pointB.x - pointA.x, pointB.y - pointA.y);
  if (dist > 0.1) {
    const midX = (posA.x + posB.x) / 2;
    const midY = (posA.y + posB.y) / 2;
    
    // 선분과 겹치지 않도록 법선 벡터 방향으로 살짝 띄우기
    const angle = Math.atan2(posB.y - posA.y, posB.x - posA.x);
    const offsetDist = 18;
    const labelX = midX - Math.sin(angle) * offsetDist;
    const labelY = midY + Math.cos(angle) * offsetDist;

    const distText = dist % 1 === 0 ? `거리: ${dist}` : `거리: ≈${dist.toFixed(2)}`;
    drawTextPill(labelX, labelY, distText, '#7c3aed', '#f3e8ff', true);
  }
}

/**
 * 직각 꼭짓점 C에 정확한 직각 기호(ㄴ 모양) 그리기
 */
function drawRightAngleSymbol(posA, posB, posC) {
  const size = 12; // 직각 표시 크기(픽셀)

  // A -> C, B -> C 방향에 맞춰 사분면별 부호 결정
  const dirX = posA.x < posC.x ? -1 : 1;
  const dirY = posB.y < posC.y ? -1 : 1;

  ctx.save();
  ctx.strokeStyle = '#6366f1';
  ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(posC.x + dirX * size, posC.y);
  ctx.lineTo(posC.x + dirX * size, posC.y + dirY * size);
  ctx.lineTo(posC.x, posC.y + dirY * size);
  ctx.stroke();
  ctx.fill();

  ctx.restore();
}

/**
 * 캔버스 위에 깔끔한 둥근 알약 모양 텍스트 라벨(Pill Badge) 그리기
 */
function drawTextPill(x, y, text, textColor, bgColor, isHypot = false) {
  ctx.save();
  ctx.font = 'bold 11px Pretendard, sans-serif';
  const textMetrics = ctx.measureText(text);
  const paddingX = 8;
  const paddingY = 4;
  const boxWidth = textMetrics.width + paddingX * 2;
  const boxHeight = 20;

  const rectX = x - boxWidth / 2;
  const rectY = y - boxHeight / 2;

  // 배경 둥근 사각형 그리기
  ctx.fillStyle = bgColor;
  ctx.strokeStyle = textColor;
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.roundRect(rectX, rectY, boxWidth, boxHeight, 10);
  ctx.fill();
  ctx.stroke();

  // 텍스트 그리기
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);

  ctx.restore();
}

/**
 * 점 A와 점 B를 그리고, 마우스 호버/활성화 상태에 따른 시각 피드백 부여
 */
function drawPoints() {
  const posA = mathToScreen(state.pointA.x, state.pointA.y);
  const posB = mathToScreen(state.pointB.x, state.pointB.y);

  // 점 A 그리기 (파란색)
  drawPointHandle(posA.x, posA.y, 'A', state.pointA, '#2563eb', state.activePoint === 'A', state.hoveredPoint === 'A');

  // 점 B 그리기 (장미색)
  drawPointHandle(posB.x, posB.y, 'B', state.pointB, '#e11d48', state.activePoint === 'B', state.hoveredPoint === 'B');
}

/**
 * 개별 점 핸들(원형 조작점) 그리기
 */
function drawPointHandle(x, y, label, coords, color, isActive, isHovered) {
  ctx.save();

  const radius = isActive ? 10 : isHovered ? 9 : 8;

  // 마우스가 올라가 있거나 드래그 중일 때 은은한 외부 펄스 링 효과
  if (isActive || isHovered) {
    ctx.beginPath();
    ctx.arc(x, y, radius + 8, 0, Math.PI * 2);
    ctx.fillStyle = color.replace(')', ', 0.2)').replace('rgb', 'rgba').replace('#', '');
    // 색상 헥스코드를 rgba로 처리
    ctx.fillStyle = isActive ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.15)';
    ctx.fill();
  }

  // 점 내부 원 채우기
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // 하얀색 테두리
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  // 점 상단 좌표 및 이름 말풍선
  ctx.font = 'bold 12px Pretendard, sans-serif';
  const tagText = `${label}(${coords.x}, ${coords.y})`;
  const tagMetrics = ctx.measureText(tagText);
  const tagWidth = tagMetrics.width + 12;
  const tagHeight = 22;
  const tagX = x;
  const tagY = y - radius - 16;

  // 말풍선 배경
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'; // 짙은 네이비
  ctx.beginPath();
  ctx.roundRect(tagX - tagWidth / 2, tagY - tagHeight / 2, tagWidth, tagHeight, 6);
  ctx.fill();

  // 말풍선 텍스트
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tagText, tagX, tagY);

  ctx.restore();
}


/**
 * 8. 마우스 & 터치 인터랙션 이벤트 핸들러 (Pointer Events API)
 * - 데스크톱 마우스 및 모바일/아이패드/태블릿 터치를 동시에 원활하게 지원합니다.
 */

// 포인터 위치를 캔버스 기준 좌표(px, py)로 계산
function getCanvasPointerPos(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

// 점 A 또는 B 근처를 클릭/터치했는지 검사하는 함수
function findTargetPoint(pointerX, pointerY) {
  const posA = mathToScreen(state.pointA.x, state.pointA.y);
  const posB = mathToScreen(state.pointB.x, state.pointB.y);

  const distA = Math.hypot(pointerX - posA.x, pointerY - posA.y);
  const distB = Math.hypot(pointerX - posB.x, pointerY - posB.y);

  if (distA <= state.hitRadius && distA <= distB) {
    return 'A';
  } else if (distB <= state.hitRadius) {
    return 'B';
  }
  return null;
}

// 포인터 누름 (마우스 클릭 또는 터치 시작)
function handlePointerDown(event) {
  event.preventDefault();
  const pointerPos = getCanvasPointerPos(event);
  const target = findTargetPoint(pointerPos.x, pointerPos.y);

  if (target) {
    state.activePoint = target;
    state.isPointerDown = true;
    canvas.classList.remove('cursor-grab', 'cursor-pointer');
    canvas.classList.add('cursor-grabbing');
    draw();
  }
}

// 포인터 이동 (마우스 움직임 또는 터치 드래그)
function handlePointerMove(event) {
  const pointerPos = getCanvasPointerPos(event);

  if (state.isPointerDown && state.activePoint) {
    // 현재 잡고 있는 점을 포인터 위치에 맞춰 이동
    const newMathCoords = screenToMath(pointerPos.x, pointerPos.y);

    if (state.activePoint === 'A') {
      state.pointA = newMathCoords;
    } else if (state.activePoint === 'B') {
      state.pointB = newMathCoords;
    }

    updateDashboard();
    draw();
  } else {
    // 호버 상태 체크 (마우스가 올라갔을 때 손가락 커서 변경)
    const hoverTarget = findTargetPoint(pointerPos.x, pointerPos.y);
    if (hoverTarget !== state.hoveredPoint) {
      state.hoveredPoint = hoverTarget;
      if (hoverTarget) {
        canvas.classList.add('cursor-grab');
      } else {
        canvas.classList.remove('cursor-grab');
      }
      draw();
    }
  }
}

// 포인터 뗌 (클릭/터치 종료)
function handlePointerUp() {
  if (state.isPointerDown) {
    state.isPointerDown = false;
    state.activePoint = null;
    canvas.classList.remove('cursor-grabbing');
    if (state.hoveredPoint) {
      canvas.classList.add('cursor-grab');
    }
    draw();
  }
}


/**
 * 9. 탐구 미션 및 프리셋 적용 함수
 */
function applyPreset(coordA, coordB) {
  state.pointA = { ...coordA };
  state.pointB = { ...coordB };
  updateDashboard();
  draw();
}


/**
 * 10. 질문 상자 아코디언 토글 전역 함수
 */
window.toggleAccordion = function(contentId, buttonElement) {
  const content = document.getElementById(contentId);
  const chevron = buttonElement.querySelector('.chevron');

  if (content.classList.contains('hidden')) {
    content.classList.remove('hidden');
    if (chevron) chevron.classList.add('rotate-180');
  } else {
    content.classList.add('hidden');
    if (chevron) chevron.classList.remove('rotate-180');
  }
};


/**
 * 11. 초기화 및 이벤트 리스너 등록
 */
function init() {
  // 캔버스 크기 초기화 및 리사이즈 감지
  window.addEventListener('resize', resizeCanvas);

  // 포인터 이벤트 등록 (마우스와 터치 모두 처리)
  canvas.addEventListener('pointerdown', handlePointerDown);
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);
  window.addEventListener('pointercancel', handlePointerUp);

  // 자석 스냅 토글 체크박스
  snapToGridCheckbox.addEventListener('change', (e) => {
    state.snapToGrid = e.target.checked;
    if (state.snapToGrid) {
      // 켜질 때 현재 좌표도 정수로 스냅
      state.pointA = { x: Math.round(state.pointA.x), y: Math.round(state.pointA.y) };
      state.pointB = { x: Math.round(state.pointB.x), y: Math.round(state.pointB.y) };
      updateDashboard();
      draw();
    }
  });

  // 줌인/줌아웃 및 원점 리셋 버튼
  btnZoomIn.addEventListener('click', () => {
    state.zoom = Math.min(state.maxZoom, state.zoom + 0.15);
    draw();
  });

  btnZoomOut.addEventListener('click', () => {
    state.zoom = Math.max(state.minZoom, state.zoom - 0.15);
    draw();
  });

  btnResetView.addEventListener('click', () => {
    state.zoom = 1.0;
    state.originOffset = { x: 0, y: 0 };
    draw();
  });

  // 탐구 미션 프리셋 버튼 이벤트
  btnPreset345.addEventListener('click', () => {
    applyPreset({ x: 0, y: 0 }, { x: 3, y: 4 });
  });

  btnPreset51213.addEventListener('click', () => {
    applyPreset({ x: -2, y: -4 }, { x: 3, y: 8 });
  });

  btnPresetSquare.addEventListener('click', () => {
    applyPreset({ x: 1, y: 1 }, { x: 5, y: 5 });
  });

  btnPresetNegative.addEventListener('click', () => {
    applyPreset({ x: -4, y: -3 }, { x: 2, y: 5 });
  });

  btnReset.addEventListener('click', () => {
    applyPreset({ x: 0, y: 0 }, { x: 3, y: 4 });
    state.zoom = 1.0;
    state.originOffset = { x: 0, y: 0 };
  });

  // 도움말 모달 토글
  btnHelp.addEventListener('click', () => {
    helpModal.classList.remove('hidden');
  });

  const closeHelp = () => {
    helpModal.classList.add('hidden');
  };
  btnCloseHelp.addEventListener('click', closeHelp);
  btnConfirmHelp.addEventListener('click', closeHelp);
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) closeHelp();
  });

  // 최초 캔버스 사이즈 설정 및 화면 그리기
  resizeCanvas();
  updateDashboard();
}

// 브라우저 DOM 준비 완료 시 시작
document.addEventListener('DOMContentLoaded', init);
