// 质数分布可视化图表
(function () {
    'use strict';

    const canvas = document.getElementById('primeChart');
    const rangeInput = document.getElementById('primeRange');
    const rangeValue = document.getElementById('primeRangeValue');
    const resetBtn = document.getElementById('resetChart');
    const statsEl = document.getElementById('chartStats');

    if (!canvas || !rangeInput || !statsEl) return;

    const DEFAULT_N = 1000;
    const CHART_HEIGHT = 360;

    // 埃拉托斯特尼筛法：返回 isPrime[0..n]
    function sieve(n) {
        const isPrime = new Uint8Array(n + 1).fill(1);
        if (n >= 0) isPrime[0] = 0;
        if (n >= 1) isPrime[1] = 0;
        for (let i = 2; i * i <= n; i++) {
            if (isPrime[i]) {
                for (let j = i * i; j <= n; j += i) isPrime[j] = 0;
            }
        }
        return isPrime;
    }

    // 前缀和：prefix[i] = 不超过 i 的质数个数
    function primeCountPrefix(isPrime) {
        const n = isPrime.length - 1;
        const prefix = new Uint32Array(n + 1);
        let count = 0;
        for (let i = 0; i <= n; i++) {
            if (isPrime[i]) count++;
            prefix[i] = count;
        }
        return prefix;
    }

    // 计算“好看”的数值（步长/上限）：使用更细的步进，避免纵轴大幅跳动
    function niceNumber(v) {
        if (v <= 0) return 1;
        const mag = Math.pow(10, Math.floor(Math.log10(v)));
        const norm = v / mag;
        const steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
        for (const s of steps) {
            if (norm <= s) return s * mag;
        }
        return 10 * mag;
    }

    function formatNum(v) {
        v = Math.round(v);
        if (v >= 1000000) return (v / 1000000).toFixed(v % 1000000 === 0 ? 0 : 1) + 'M';
        if (v >= 1000) return (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + 'k';
        return String(v);
    }

    function render(N) {
        const isPrime = sieve(N);
        const pi = primeCountPrefix(isPrime);
        const piN = pi[N];
        const approx = N / Math.log(N); // 素数定理：π(N) ~ N / ln N
        const density = (piN / N) * 100;

        statsEl.innerHTML =
            `在 1 ~ ${N.toLocaleString()} 范围内共有 <b>${piN.toLocaleString()}</b> 个质数；` +
            `素数定理估计 π(N) ≈ N / ln N = <b>${Math.round(approx).toLocaleString()}</b>；` +
            `质数密度约为 <b>${density.toFixed(3)}%</b>。`;

        drawChart(pi, N);
    }

    function drawChart(pi, N) {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const cssW = rect.width || 900;
        const cssH = CHART_HEIGHT;

        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        canvas.style.height = cssH + 'px';

        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cssW, cssH);

        const padL = 56, padR = 16, padT = 16, padB = 40;
        const plotW = cssW - padL - padR;
        const plotH = cssH - padT - padB;

        const rawMax = pi[N];
        const targetTicks = 5;
        const tickStep = niceNumber(rawMax / targetTicks);   // 好看的刻度步长
        const yTicks = Math.max(1, Math.ceil(rawMax / tickStep));
        const yMax = tickStep * yTicks;

        function X(x) { return padL + (x / N) * plotW; }
        function Y(y) { return padT + plotH - (y / yMax) * plotH; }

        // 网格与 Y 轴刻度
        ctx.strokeStyle = '#e8e8e8';
        ctx.fillStyle = '#888';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i <= yTicks; i++) {
            const val = tickStep * i;
            const yy = Y(val);
            ctx.beginPath();
            ctx.moveTo(padL, yy);
            ctx.lineTo(padL + plotW, yy);
            ctx.stroke();
            ctx.fillText(formatNum(val), padL - 6, yy);
        }

        // X 轴刻度
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const xTicks = 6;
        for (let i = 0; i <= xTicks; i++) {
            const val = (N / xTicks) * i;
            const xx = X(val);
            ctx.beginPath();
            ctx.moveTo(xx, padT + plotH);
            ctx.lineTo(xx, padT + plotH + 4);
            ctx.stroke();
            ctx.fillText(formatNum(val), xx, padT + plotH + 8);
        }

        // 坐标轴
        ctx.strokeStyle = '#bbb';
        ctx.beginPath();
        ctx.moveTo(padL, padT);
        ctx.lineTo(padL, padT + plotH);
        ctx.lineTo(padL + plotW, padT + plotH);
        ctx.stroke();

        // 坐标轴标签
        ctx.fillStyle = '#555';
        ctx.textAlign = 'center';
        ctx.fillText('N', padL + plotW / 2, cssH - 8);
        ctx.save();
        ctx.translate(14, padT + plotH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('π(N)', 0, 0);
        ctx.restore();

        const samples = Math.max(200, Math.min(2000, Math.round(plotW)));

        // N / ln N 渐近曲线（虚线）
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        for (let i = 1; i <= samples; i++) {
            const x = (N / samples) * i;
            const y = x / Math.log(x);
            const xx = X(x);
            const yy = Y(Math.min(y, yMax));
            if (i === 1) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // π(N) 阶梯曲线
        ctx.strokeStyle = '#d32f2f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const step = Math.max(1, Math.floor(N / samples));
        let prev = pi[0];
        ctx.moveTo(X(0), Y(prev));
        for (let x = step; x <= N; x += step) {
            ctx.lineTo(X(x), Y(prev));
            const cur = pi[x];
            if (cur !== prev) {
                ctx.lineTo(X(x), Y(cur));
                prev = cur;
            }
        }
        ctx.lineTo(X(N), Y(pi[N]));
        ctx.stroke();
    }

    let raf = null;
    function scheduleRender() {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
            raf = null;
            const N = parseInt(rangeInput.value, 10) || DEFAULT_N;
            rangeValue.textContent = N.toLocaleString();
            render(N);
        });
    }

    rangeInput.addEventListener('input', scheduleRender);

    resetBtn.addEventListener('click', () => {
        rangeInput.value = DEFAULT_N;
        scheduleRender();
    });

    window.addEventListener('resize', () => {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
            raf = null;
            render(parseInt(rangeInput.value, 10) || DEFAULT_N);
        });
    });

    // 初始渲染
    rangeValue.textContent = DEFAULT_N.toLocaleString();
    render(DEFAULT_N);
})();
