// 质数分布可视化：乌拉姆螺旋 + 平滑增长曲线
(function () {
    'use strict';

    const canvas = document.getElementById('primeChart');
    const statsEl = document.getElementById('chartStats');
    const tooltipEl = document.getElementById('chartTooltip');
    const descEl = document.getElementById('chartDesc');
    const tabs = Array.from(document.querySelectorAll('.chart-tab'));
    const spiralControls = document.getElementById('spiralControls');
    const curveControls = document.getElementById('curveControls');
    const spiralSizeInput = document.getElementById('spiralSize');
    const spiralSizeValue = document.getElementById('spiralSizeValue');
    const rangeInput = document.getElementById('primeRange');
    const rangeValue = document.getElementById('primeRangeValue');
    const resetBtn = document.getElementById('resetChart');

    if (!canvas || !statsEl) return;

    const CURVE_HEIGHT = 360;
    const SPIRAL_HEIGHT = 460;
    const DESCS = {
        spiral: '乌拉姆螺旋：把正整数按螺旋排列，质数会沿对角线聚成明显的线条，直观揭示质数分布中的隐藏规律。',
        curve: '素数定理：不超过 N 的质数个数 π(N) 渐近于 N / ln N。横轴为对数坐标，观察 π(N) 与渐近线的吻合。'
    };

    let view = 'spiral';
    let hover = null;               // { x, y } 在画布 CSS 像素坐标系
    let raf = null;

    // ---------- 筛法与工具 ----------
    function sieve(n) {
        const isPrime = new Uint8Array(n + 1).fill(1);
        if (n >= 0) isPrime[0] = 0;
        if (n >= 1) isPrime[1] = 0;
        for (let i = 2; i * i <= n; i++) {
            if (isPrime[i]) for (let j = i * i; j <= n; j += i) isPrime[j] = 0;
        }
        return isPrime;
    }

    function prefixCount(isPrime) {
        const n = isPrime.length - 1;
        const prefix = new Uint32Array(n + 1);
        let c = 0;
        for (let i = 0; i <= n; i++) {
            if (isPrime[i]) c++;
            prefix[i] = c;
        }
        return prefix;
    }

    function niceNumber(v) {
        if (v <= 0) return 1;
        const mag = Math.pow(10, Math.floor(Math.log10(v)));
        const norm = v / mag;
        const steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
        for (const s of steps) if (norm <= s) return s * mag;
        return 10 * mag;
    }

    function formatNum(v) {
        v = Math.round(v);
        if (v >= 1000000) return (v / 1000000).toFixed(v % 1000000 === 0 ? 0 : 1) + 'M';
        if (v >= 1000) return (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + 'k';
        return String(v);
    }

    function logTicks(N) {
        const ticks = [];
        const add = (v) => { if (v >= 2 && v <= N) ticks.push(v); };
        for (let k = 0; Math.pow(10, k) <= N; k++) {
            add(Math.pow(10, k));
            add(5 * Math.pow(10, k));
        }
        if (ticks.length === 0 || ticks[ticks.length - 1] < N) ticks.push(N);
        return ticks;
    }

    // ---------- 画布基础 ----------
    function setupCanvas(height) {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const cssW = rect.width || 900;
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.height = height + 'px';
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cssW, height);
        return { ctx, cssW, cssH: height };
    }

    // ---------- 乌拉姆螺旋 ----------
    let spiralCache = null; // { side, grid, isPrime, cell, ox, oy, size }

    function buildSpiral(side) {
        const offset = (side - 1) / 2;
        const grid = new Int32Array(side * side);
        const set = (cx, cy, val) => { grid[(cy + offset) * side + (cx + offset)] = val; };
        let x = 0, y = 0, n = 1;
        set(0, 0, n++);
        let step = 1;
        const total = side * side;
        while (n <= total) {
            for (let i = 0; i < step && n <= total; i++) { x++; set(x, y, n++); }
            for (let i = 0; i < step && n <= total; i++) { y--; set(x, y, n++); }
            step++;
            for (let i = 0; i < step && n <= total; i++) { x--; set(x, y, n++); }
            for (let i = 0; i < step && n <= total; i++) { y++; set(x, y, n++); }
            step++;
        }
        return grid;
    }

    function drawSpiral() {
        let side = parseInt(spiralSizeInput.value, 10);
        if (side % 2 === 0) side += 1;
        const total = side * side;
        const isPrime = sieve(total);
        const grid = buildSpiral(side);

        const { ctx, cssW, cssH } = setupCanvas(SPIRAL_HEIGHT);
        const cell = Math.max(1, Math.floor(Math.min(cssW, cssH) / side));
        const size = cell * side;
        const ox = (cssW - size) / 2;
        const oy = (cssH - size) / 2;

        // 背景
        ctx.fillStyle = '#fbfbfc';
        ctx.fillRect(ox, oy, size, size);

        // 质数点
        let primeCount = 0, maxPrime = 2;
        for (let gy = 0; gy < side; gy++) {
            for (let gx = 0; gx < side; gx++) {
                const n = grid[gy * side + gx];
                if (n < 2 || !isPrime[n]) continue;
                primeCount++;
                if (n > maxPrime) maxPrime = n;
                const t = n / total;
                const hue = 22 - t * 22;                 // 橙 -> 深红
                const light = 56 - t * 14;
                ctx.fillStyle = `hsl(${hue.toFixed(1)}, 86%, ${light.toFixed(1)}%)`;
                const px = ox + gx * cell + cell / 2;
                const py = oy + gy * cell + cell / 2;
                const r = Math.max(1.2, cell * 0.4);
                ctx.beginPath();
                ctx.arc(px, py, r, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 悬停高亮
        if (hover && view === 'spiral') {
            const gx = Math.floor((hover.x - ox) / cell);
            const gy = Math.floor((hover.y - oy) / cell);
            if (gx >= 0 && gx < side && gy >= 0 && gy < side) {
                const n = grid[gy * side + gx];
                if (n >= 1) {
                    ctx.strokeStyle = '#1a1a1a';
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(ox + gx * cell + 1, oy + gy * cell + 1, cell - 2, cell - 2);
                    showSpiralTooltip(gx, gy);
                } else {
                    hideTooltip();
                }
            } else {
                hideTooltip();
            }
        } else {
            hideTooltip();
        }

        spiralCache = { side, grid, isPrime, cell, ox, oy, size };

        const density = (primeCount / total * 100);
        statsEl.innerHTML =
            `边长为 ${side} 的螺旋共含 ${total.toLocaleString()} 个数，其中 <b>${primeCount.toLocaleString()}</b> 个质数；` +
            `最大质数为 <b>${maxPrime.toLocaleString()}</b>；质数密度约 <b>${density.toFixed(2)}%</b>。`;
    }

    // ---------- 平滑增长曲线 ----------
    let curveCache = null; // { N, prefix, xMin, xMax, padL, padR, padT, padB, plotW, plotH, yMax }

    function drawCurve() {
        const N = parseInt(rangeInput.value, 10) || 1000;
        const isPrime = sieve(N);
        const prefix = prefixCount(isPrime);
        const piN = prefix[N];
        const approx = N / Math.log(N);
        const density = piN / N * 100;

        const { ctx, cssW, cssH } = setupCanvas(CURVE_HEIGHT);
        const padL = 54, padR = 16, padT = 16, padB = 40;
        const plotW = cssW - padL - padR;
        const plotH = cssH - padT - padB;

        const xMin = Math.log(2);
        const xMax = Math.log(N);
        const X = (x) => padL + (Math.log(x) - xMin) / (xMax - xMin) * plotW;

        const tickStep = niceNumber(piN / 5);
        const yTicks = Math.max(1, Math.ceil(piN / tickStep));
        const yMax = tickStep * yTicks;
        const Y = (y) => padT + plotH - (y / yMax) * plotH;

        // 网格 + Y 轴刻度
        ctx.font = '11px sans-serif';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'right';
        for (let i = 0; i <= yTicks; i++) {
            const val = tickStep * i;
            const yy = Y(val);
            ctx.strokeStyle = '#ececec';
            ctx.beginPath();
            ctx.moveTo(padL, yy);
            ctx.lineTo(padL + plotW, yy);
            ctx.stroke();
            ctx.fillStyle = '#888';
            ctx.fillText(formatNum(val), padL - 6, yy);
        }

        // X 轴对数刻度
        ctx.textBaseline = 'top';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#ddd';
        ctx.fillStyle = '#888';
        for (const tv of logTicks(N)) {
            const xx = X(tv);
            ctx.beginPath();
            ctx.moveTo(xx, padT + plotH);
            ctx.lineTo(xx, padT + plotH + 4);
            ctx.stroke();
            ctx.fillText(formatNum(tv), xx, padT + plotH + 8);
        }

        // 坐标轴
        ctx.strokeStyle = '#bbb';
        ctx.beginPath();
        ctx.moveTo(padL, padT);
        ctx.lineTo(padL, padT + plotH);
        ctx.lineTo(padL + plotW, padT + plotH);
        ctx.stroke();

        ctx.fillStyle = '#555';
        ctx.textAlign = 'center';
        ctx.fillText('N（对数坐标）', padL + plotW / 2, cssH - 8);
        ctx.save();
        ctx.translate(14, padT + plotH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('π(N)', 0, 0);
        ctx.restore();

        const samples = Math.max(300, Math.round(plotW * 1.2));

        // N / ln N 渐近线（虚线）
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        for (let i = 1; i <= samples; i++) {
            const x = Math.exp(xMin + (xMax - xMin) * i / samples);
            const y = x / Math.log(x);
            const xx = X(x);
            const yy = Y(Math.min(y, yMax));
            if (i === 1) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // π(N) 曲线（采样连接，对数坐标下视觉平滑）
        ctx.strokeStyle = '#d32f2f';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for (let i = 1; i <= samples; i++) {
            const x = Math.exp(xMin + (xMax - xMin) * i / samples);
            const xx = X(x);
            const yy = Y(prefix[Math.min(N, Math.floor(x))]);
            if (i === 1) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        const lastX = X(N);
        ctx.lineTo(lastX, Y(piN));
        ctx.stroke();

        // 渐变填充
        const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
        grad.addColorStop(0, 'rgba(211, 47, 47, 0.26)');
        grad.addColorStop(1, 'rgba(211, 47, 47, 0.02)');
        ctx.beginPath();
        ctx.moveTo(X(2), Y(0));
        for (let i = 1; i <= samples; i++) {
            const x = Math.exp(xMin + (xMax - xMin) * i / samples);
            ctx.lineTo(X(x), Y(prefix[Math.min(N, Math.floor(x))]));
        }
        ctx.lineTo(lastX, Y(piN));
        ctx.lineTo(lastX, Y(0));
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // 悬停十字线
        curveCache = { N, prefix, xMin, xMax, padL, padR, padT, padB, plotW, plotH, yMax, piN, approx };
        if (hover && view === 'curve') {
            const hx = hover.x;
            if (hx >= padL && hx <= padL + plotW) {
                const lx = xMin + (hx - padL) / plotW * (xMax - xMin);
                const xv = Math.exp(lx);
                const pv = prefix[Math.min(N, Math.floor(xv))];
                const xx = hx;
                ctx.strokeStyle = 'rgba(0,0,0,0.35)';
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(xx, padT);
                ctx.lineTo(xx, padT + plotH);
                ctx.stroke();
                ctx.setLineDash([]);
                const yy = Y(pv);
                ctx.beginPath();
                ctx.arc(xx, yy, 3.5, 0, Math.PI * 2);
                ctx.fillStyle = '#d32f2f';
                ctx.fill();
                showCurveTooltip(xx, yy, xv, pv);
                return;
            }
        }
        hideTooltip();

        statsEl.innerHTML =
            `在 1 ~ ${N.toLocaleString()} 范围内共有 <b>${piN.toLocaleString()}</b> 个质数；` +
            `素数定理估计 π(N) ≈ N / ln N = <b>${Math.round(approx).toLocaleString()}</b>；` +
            `质数密度约 <b>${density.toFixed(3)}%</b>。`;
    }

    // ---------- 悬停提示 ----------
    function showCurveTooltip(xx, yy, xv, pv) {
        tooltipEl.innerHTML =
            `<b>x = ${Math.round(xv).toLocaleString()}</b><br>` +
            `π(x) = ${pv.toLocaleString()}<br>` +
            `x / ln x = ${Math.round(xv / Math.log(xv)).toLocaleString()}`;
        positionTooltip(xx, yy);
    }

    function showSpiralTooltip(gx, gy) {
        if (!spiralCache) return;
        const { side, grid, isPrime, cell, ox, oy } = spiralCache;
        const n = grid[gy * side + gx];
        if (n < 1) { hideTooltip(); return; }
        const status = n < 2 ? '' : (isPrime[n] ? '质数' : '合数');
        tooltipEl.innerHTML = `<b>n = ${n.toLocaleString()}</b>${status ? '<br>' + status : ''}`;
        positionTooltip(ox + gx * cell + cell / 2, oy + gy * cell + cell / 2);
    }

    function positionTooltip(px, py) {
        tooltipEl.hidden = false;
        const r = canvas.getBoundingClientRect();
        let left = px + 12;
        let top = py - 10;
        const tw = tooltipEl.offsetWidth || 120;
        if (left + tw > r.width - 8) left = px - tw - 12;
        if (top < 4) top = 4;
        tooltipEl.style.left = left + 'px';
        tooltipEl.style.top = top + 'px';
    }

    function hideTooltip() {
        if (!tooltipEl.hidden) tooltipEl.hidden = true;
    }

    // ---------- 渲染调度 ----------
    function schedule() {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
            raf = null;
            render();
        });
    }

    function render() {
        if (view === 'spiral') {
            spiralSizeValue.textContent = spiralSizeInput.value;
            drawSpiral();
        } else {
            rangeValue.textContent = rangeInput.value;
            drawCurve();
        }
    }

    function setView(v) {
        if (view === v) return;
        view = v;
        hover = null;
        hideTooltip();
        tabs.forEach(t => {
            const active = t.dataset.view === v;
            t.classList.toggle('active', active);
            t.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        spiralControls.hidden = (v !== 'spiral');
        curveControls.hidden = (v !== 'curve');
        descEl.textContent = DESCS[v];
        render();
    }

    // ---------- 事件 ----------
    tabs.forEach(t => t.addEventListener('click', () => setView(t.dataset.view)));

    spiralSizeInput.addEventListener('input', () => { hover = null; hideTooltip(); schedule(); });
    rangeInput.addEventListener('input', () => { hover = null; hideTooltip(); schedule(); });

    resetBtn.addEventListener('click', () => {
        rangeInput.value = 1000;
        schedule();
    });

    canvas.addEventListener('mousemove', (e) => {
        const r = canvas.getBoundingClientRect();
        hover = { x: e.clientX - r.left, y: e.clientY - r.top };
        schedule();
    });
    canvas.addEventListener('mouseleave', () => {
        hover = null;
        hideTooltip();
        schedule();
    });

    window.addEventListener('resize', () => schedule());

    // 初始渲染
    setView('spiral');
})();
