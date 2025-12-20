// Dados dos segmentos (ordem visual no sentido horário)
const segments = [
	{ label: '🎉 1 mês de IA gratuita', key: '10', color: '#4c83ff', display: '🎁' },
	{ label: '🎉 50% Desconto na prox. mensalidade', key: '50', color: '#ff5a5a', display: '🎁' },
	{ label: '🏆 Isenção de 1 mensalidade', key: '100', color: '#45c977', display: '🎁' },
	{ label: '🎉 1 mês grátis de qualquer módulo extra do sistema', key: '1m_pos', color: '#f5a623', display: '🎁' },
	{ label: '⭐ Upgrade de plano por 30 dias', key: 'vale100', color: '#8b6cff', display: '🎁' },
	{ label: '🎉 1 mês de integração POS (1 CX)', key: 'site', color: '#2ecbd2', display: '🎁' }
];

// Permitir qualquer prêmio
// const allowedKeys = ['20', '50', '100']; // DESATIVADO - agora pode cair em qualquer prêmio

// Variáveis globais
let spinning = false;
let totalTurns = 0;
let currentAngle = 0;
let segmentEls = []; // DECLARAR ANTES de usar

// Elementos do DOM - cliente
const clientModal = document.getElementById('clientModal');
const clientForm = document.getElementById('clientForm');
const clientNameInput = document.getElementById('clientName');
const clientCNPJInput = document.getElementById('clientCNPJ');
const clientInfoDiv = document.getElementById('clientInfo');
const clientInfoText = document.getElementById('clientInfoText');
const editClientBtn = document.getElementById('editClientBtn');

// Elementos do DOM - roleta
const wheelEl = document.getElementById('wheel');
const spinBtn = document.getElementById('spinBtn');
const resultEl = document.getElementById('result');

// Elementos do DOM - popup de resultado
const resultModal = document.getElementById('resultModal');
const resultClientName = document.getElementById('resultClientName');
const resultClientCNPJ = document.getElementById('resultClientCNPJ');
const resultPrize = document.getElementById('resultPrize');
const closeResultBtn = document.getElementById('closeResultBtn');
const fireworksContainer = document.getElementById('fireworksContainer');

// Bloqueio de 24h
// DESATIVADO PARA TESTES - Reativar quando em produção
// Para reativar: Descomentar os blocos "BLOQUEIO ATIVADO" e comentar os blocos "BLOQUEIO DESATIVADO"
const SPIN_LOCK_ENABLED = false; // MUDE PARA true PARA ATIVAR O BLOQUEIO DE 24h

const SPIN_LOCK_KEY = 'roleta_last_spin_at';
const SPIN_LOCK_MS = 24 * 60 * 60 * 1000; // 24 horas
// Persistência do último estado
const SPIN_LAST_ANGLE_KEY = 'roleta_last_angle_deg';
const SPIN_LAST_PRIZE_KEY = 'roleta_last_prize_key';
// Cliente
const CLIENT_NAME_KEY = 'roleta_client_name';
const CLIENT_CNPJ_KEY = 'roleta_client_cnpj';

function getLastSpinAt() {
	const raw = localStorage.getItem(SPIN_LOCK_KEY);
	const ts = raw ? parseInt(raw, 10) : NaN;
	return Number.isFinite(ts) ? ts : null;
}

function setLastSpinAt(ts = Date.now()) {
	localStorage.setItem(SPIN_LOCK_KEY, String(ts));
}

function remainingMs() {
	const last = getLastSpinAt();
	if (!last) return 0;
	const diff = Date.now() - last;
	return Math.max(0, SPIN_LOCK_MS - diff);
}

function formatRemaining(ms) {
	const h = Math.floor(ms / (60 * 60 * 1000));
	const m = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
	return `${h}h ${m}m`;
}

function isLocked() { return remainingMs() > 0; }

function getClientData() {
	const name = localStorage.getItem(CLIENT_NAME_KEY);
	const cnpj = localStorage.getItem(CLIENT_CNPJ_KEY);
	return { name, cnpj };
}

function setClientData(name, cnpj) {
	localStorage.setItem(CLIENT_NAME_KEY, name);
	localStorage.setItem(CLIENT_CNPJ_KEY, cnpj);
}

function updateClientInfoDisplay() {
	const { name, cnpj } = getClientData();
	if (name && cnpj) {
		clientInfoText.textContent = `Cliente: ${name} | CNPJ: ${cnpj}`;
		clientInfoDiv.classList.remove('hidden');
		clientModal.classList.add('hidden');
	} else {
		clientInfoDiv.classList.add('hidden');
		clientModal.classList.remove('hidden');
	}
}

function applyLockState() {
	// BLOQUEIO DESATIVADO (comentar bloco abaixo e descomentar outro para ativar)
	if (!SPIN_LOCK_ENABLED) {
		spinBtn.disabled = false;
		segmentEls.forEach(el => el.classList.remove('segment-winner'));
		resultEl.textContent = ''; // limpar mensagem de bloqueio
		return;
	}

	// BLOQUEIO ATIVADO (descomentar para ativar, comentar código acima)
	/*
	const ms = remainingMs();
	if (ms > 0) {
		spinBtn.disabled = true;
		// Restaurar ângulo e mostrar último prêmio, se houver
		const lastAngleRaw = localStorage.getItem(SPIN_LAST_ANGLE_KEY);
		if (lastAngleRaw !== null) {
			const angle = parseFloat(lastAngleRaw);
			if (Number.isFinite(angle)) {
				setRotorAngle(angle);
			}
		}
		const lastPrizeKey = localStorage.getItem(SPIN_LAST_PRIZE_KEY);
		if (lastPrizeKey) {
			const idx = findIndexByKey(lastPrizeKey);
			if (idx >= 0) {
				const prizeLabel = segments[idx].label;
				highlightWinner(idx);
				resultEl.textContent = `Último prêmio: ${prizeLabel}. Tente novamente em ${formatRemaining(ms)}.`;
				return;
			}
		}
		resultEl.textContent = `Você já girou. Tente novamente em ${formatRemaining(ms)}.`;
	} else {
		spinBtn.disabled = false;
		// remover destaque quando não estiver bloqueado
		segmentEls.forEach(el => el.classList.remove('segment-winner'));
	}
	*/
}

// Utilitários matemáticos
const degToRad = (deg) => (deg - 90) * Math.PI / 180; // topo = 0°

function polarToCartesian(cx, cy, r, deg) {
	const rad = degToRad(deg);
	return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// Função utilitária: retorna índice do segmento por chave
function findIndexByKey(key) {
	return segments.findIndex(s => s.key === key);
}

// Constrói a roda em SVG com fatias e textos curvos
function buildWheelSVG(container, size) {
	const svgNS = 'http://www.w3.org/2000/svg';
	const svg = document.createElementNS(svgNS, 'svg');
	svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
	svg.classList.add('wheel-svg');

	const rotor = document.createElementNS(svgNS, 'g');
	rotor.setAttribute('id', 'wheel-rotor');
	rotor.setAttribute('transform', `rotate(0 ${size/2} ${size/2})`);
	svg.appendChild(rotor);

	const cx = size / 2;
	const cy = size / 2;
	const rOuter = size * 0.48;
	const rText = size * 0.32; // AJUSTADO: mais próximo do centro para não cortar texto
	const perDeg = 360 / segments.length; // 60°

	// Separadores visuais
	for (let i = 0; i < segments.length; i++) {
		const deg = i * perDeg;
		const p1 = polarToCartesian(cx, cy, rOuter, deg);
		const line = document.createElementNS(svgNS, 'line');
		line.setAttribute('x1', cx);
		line.setAttribute('y1', cy);
		line.setAttribute('x2', p1.x);
		line.setAttribute('y2', p1.y);
		line.classList.add('separator');
		rotor.appendChild(line);
	}

	// Fatias e textos
	segments.forEach((seg, i) => {
		const startDeg = i * perDeg;
		const endDeg = (i + 1) * perDeg;
		const pStart = polarToCartesian(cx, cy, rOuter, startDeg);
		const pEnd = polarToCartesian(cx, cy, rOuter, endDeg);

		const path = document.createElementNS(svgNS, 'path');
		const d = [
			`M ${cx} ${cy}`,
			`L ${pStart.x} ${pStart.y}`,
			`A ${rOuter} ${rOuter} 0 0 1 ${pEnd.x} ${pEnd.y}`,
			'Z'
		].join(' ');
		path.setAttribute('d', d);
		path.setAttribute('fill', seg.color);
		path.setAttribute('opacity', '0.95');
		path.setAttribute('stroke', 'rgba(255,255,255,0.1)');
		path.setAttribute('stroke-width', '1');
		rotor.appendChild(path);
		segmentEls.push(path);

		// Trilha do texto (arco interno) - AJUSTADO para não cortar
		const arcStart = polarToCartesian(cx, cy, rText, startDeg + 5); // mais margem
		const arcEnd = polarToCartesian(cx, cy, rText, endDeg - 5); // mais margem
		const arc = document.createElementNS(svgNS, 'path');
		const arcId = `arc-${i}`;
		arc.setAttribute('id', arcId);
		const arcD = `M ${arcStart.x} ${arcStart.y} A ${rText} ${rText} 0 0 1 ${arcEnd.x} ${arcEnd.y}`;
		arc.setAttribute('d', arcD);
		arc.setAttribute('fill', 'none');
		rotor.appendChild(arc);

		const text = document.createElementNS(svgNS, 'text');
		text.classList.add('segment-title');
		const textPath = document.createElementNS(svgNS, 'textPath');
		textPath.setAttribute('href', `#${arcId}`);
		textPath.setAttribute('startOffset', '50%');
		textPath.setAttribute('text-anchor', 'middle');
		textPath.textContent = seg.display || seg.label;
		text.appendChild(textPath);
		rotor.appendChild(text);
	});

	// Hub central
	const hub = document.createElementNS(svgNS, 'circle');
	hub.setAttribute('cx', cx);
	hub.setAttribute('cy', cy);
	hub.setAttribute('r', size * 0.12);
	hub.setAttribute('fill', 'url(#hubGrad)');
	hub.classList.add('hub');
	svg.appendChild(hub);

	// Definições (gradiente do hub)
	const defs = document.createElementNS(svgNS, 'defs');
	const lg = document.createElementNS(svgNS, 'linearGradient');
	lg.setAttribute('id', 'hubGrad');
	lg.setAttribute('x1', '0%'); lg.setAttribute('y1', '0%');
	lg.setAttribute('x2', '0%'); lg.setAttribute('y2', '100%');
	const stop1 = document.createElementNS(svgNS, 'stop'); stop1.setAttribute('offset', '0%'); stop1.setAttribute('stop-color', '#2b3356');
	const stop2 = document.createElementNS(svgNS, 'stop'); stop2.setAttribute('offset', '100%'); stop2.setAttribute('stop-color', '#20263f');
	lg.appendChild(stop1); lg.appendChild(stop2);
	defs.appendChild(lg);
	svg.appendChild(defs);

	container.innerHTML = '';
	container.appendChild(svg);
	return { svg, rotor };
}

// Construir SVG da roda com tamanho seguro
let size = Math.min(wheelEl.clientWidth, wheelEl.clientHeight);
if (size <= 0) {
	size = 400; // fallback para tamanho padrão se clientWidth for 0
}
const { rotor } = buildWheelSVG(wheelEl, size);
// Restaurar último ângulo e aplicar estado de bloqueio na carga
restoreLastAngle();
applyLockState();

// Inicializar dados do cliente
updateClientInfoDisplay();

// Event listeners do formulário de cliente
clientForm.addEventListener('submit', (e) => {
	e.preventDefault();
	const name = clientNameInput.value.trim();
	const cnpj = clientCNPJInput.value.trim();
	if (name && cnpj) {
		setClientData(name, cnpj);
		updateClientInfoDisplay();
	}
});

editClientBtn.addEventListener('click', () => {
	clientNameInput.value = getClientData().name || '';
	clientCNPJInput.value = getClientData().cnpj || '';
	clientModal.classList.remove('hidden');
});

// Fechar popup de resultado
closeResultBtn.addEventListener('click', () => {
	resultModal.classList.add('hidden');
	fireworksContainer.innerHTML = ''; // limpar fogos ao fechar
});

// Função para criar fogos de artifício
function createFireworks() {
	const colors = ['#4c83ff', '#ff5a5a', '#45c977', '#f5a623', '#8b6cff', '#2ecbd2', '#ffd167'];
	const particleCount = 60; // número de partículas por explosão
	const explosions = 4; // número de explosões

	fireworksContainer.innerHTML = ''; // limpar fogos anteriores

	for (let e = 0; e < explosions; e++) {
		setTimeout(() => {
			const centerX = Math.random() * 100; // posição aleatória X (%)
			const centerY = Math.random() * 100; // posição aleatória Y (%)

			for (let i = 0; i < particleCount; i++) {
				const particle = document.createElement('div');
				particle.classList.add('firework');
				
				const angle = (Math.PI * 2 * i) / particleCount;
				const velocity = 80 + Math.random() * 120; // velocidade da partícula
				const tx = Math.cos(angle) * velocity;
				const ty = Math.sin(angle) * velocity;
				
				particle.style.left = centerX + '%';
				particle.style.top = centerY + '%';
				particle.style.background = colors[Math.floor(Math.random() * colors.length)];
				particle.style.setProperty('--tx', `${tx}px`);
				particle.style.setProperty('--ty', `${ty}px`);
				particle.style.animationDelay = `${Math.random() * 0.1}s`;
				
				fireworksContainer.appendChild(particle);
			}
		}, e * 300); // espaçamento entre explosões
	}
}

// Easing helpers - AJUSTADO PARA MAIS ACELERAÇÃO E DESACELERAÇÃO
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
// Novo easing para mais desaceleração no final
const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

function setRotorAngle(angleDeg) {
	currentAngle = angleDeg;
	rotor.setAttribute('transform', `rotate(${angleDeg} ${size/2} ${size/2})`);
}

function highlightWinner(index) {
	segmentEls.forEach(el => el.classList.remove('segment-winner'));
	if (index >= 0 && segmentEls[index]) {
		segmentEls[index].classList.add('segment-winner');
	}
}

function restoreLastAngle() {
	const raw = localStorage.getItem(SPIN_LAST_ANGLE_KEY);
	if (raw !== null) {
		const ang = parseFloat(raw);
		if (Number.isFinite(ang)) {
			setRotorAngle(ang);
		}
	}
}

function animate(from, to, durationMs, easing = easeInOutCubic) {
	return new Promise((resolve) => {
		const start = performance.now();
		const step = (now) => {
			const elapsed = now - start;
			const t = Math.min(elapsed / durationMs, 1);
			const k = easing(t);
			const angle = from + (to - from) * k;
			setRotorAngle(angle);
			if (t < 1) {
				requestAnimationFrame(step);
			} else {
				resolve();
			}
		};
		requestAnimationFrame(step);
	});
}

function spinControlled() {
	if (spinning) return;
	// BLOQUEIO DESATIVADO (remova este bloco e descomente o outro para ativar)
	// Guardar: se bloqueado, prevenir giro e informar
	// if (isLocked()) {
	// 	applyLockState();
	// 	return;
	// }

	spinning = true;
	spinBtn.disabled = true;
	// Registrar início do bloqueio de 24h (desativado para testes)
	// setLastSpinAt();

	// Escolher aleatoriamente qualquer prêmio
	const targetIndex = Math.floor(Math.random() * segments.length);
	const targetKey = segments[targetIndex].key;

	// Cada segmento = 60°, centro do segmento = i*60 + 30
	const perDeg = 360 / segments.length; // 60
	const targetCenterDeg = targetIndex * perDeg + perDeg / 2; // i*60 + 30

	// Ponteiro está no topo (0°). Para cair no target, definimos ângulo final com múltiplas voltas
	// GIRO RÁPIDO DE 15 SEGUNDOS: calcular quantas voltas são necessárias
	const fastSpinDuration = 15000; // 15 segundos de giro rápido
	const decelDuration = 3000; // 3 segundos de desaceleração
	const rotationsPerSecond = 3; // 3 voltas por segundo durante o giro rápido
	const fastTurns = (fastSpinDuration / 1000) * rotationsPerSecond; // total de voltas em 15s
	const fastSpinDeg = fastTurns * 360; // graus no giro rápido
	const finalDeg = -(fastSpinDeg + targetCenterDeg); // posição final

	// Leve blur durante giro
	rotor.style.filter = 'blur(1.1px)';

	// FASE 1: Giro rápido constante por 30 segundos (linear)
	animate(currentAngle, currentAngle - fastSpinDeg, fastSpinDuration, (t) => t) // linear
		.then(() => {
			// FASE 2: Desaceleração até o prêmio
			return animate(currentAngle, finalDeg, decelDuration, easeOutQuart);
		})
		.then(() => {
			// Remover blur e aplicar pequeno bounce de inércia
			rotor.style.filter = 'none';
			const overshoot = (Math.random() > 0.5 ? 1 : -1) * 6; // ±6°
			return animate(finalDeg, finalDeg + overshoot, 340, easeOutCubic)
				.then(() => animate(finalDeg + overshoot, finalDeg, 280, easeOutCubic));
		})
		.then(() => {
			const prize = segments[targetIndex].label;
			resultEl.textContent = `Parabéns! Você ganhou: ${prize} na mensalidade do próximo mês.`;
			
			// Exibir popup com resultado
			const { name, cnpj } = getClientData();
			resultClientName.textContent = name || 'Cliente não informado';
			resultClientCNPJ.textContent = cnpj || 'CNPJ não informado';
			resultPrize.textContent = prize;
			resultModal.classList.remove('hidden');
			
			// Disparar fogos de artifício
			createFireworks();
			
			// Persistir estado final
			localStorage.setItem(SPIN_LAST_ANGLE_KEY, String(finalDeg));
			localStorage.setItem(SPIN_LAST_PRIZE_KEY, targetKey);
			highlightWinner(targetIndex);
			spinning = false; // Mantém desativado para respeitar 1 giro por indicação
			// Re-habilitar botão para novos testes (desativado para testes)
			spinBtn.disabled = false;
			// Estado de bloqueio permanece até expirar (24h)
			applyLockState();
		});
}

// LISTENER DO BOTÃO
spinBtn.addEventListener('click', spinControlled);
