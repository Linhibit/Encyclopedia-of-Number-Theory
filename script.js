// 当页面加载完成时执行
document.addEventListener('DOMContentLoaded', () => {
    fetch('theorems.json')
        .then(response => response.json())
        .then(data => {
            renderTheorems(data);
            window.allTheorems = data; // 存一份全局变量用于搜索
        })
        .catch(err => console.error('加载定理库失败:', err));
});

function renderTheorems(theorems) {
    const grid = document.getElementById('theoremGrid');
    grid.innerHTML = ''; // 清空加载提示

    theorems.forEach(t => {
        const card = document.createElement('div');
        card.className = 'theorem-card';
        card.innerHTML = `
            <h3>${t.title}</h3>
            <p>${t.description}</p>
            <div class="tags">${t.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
            <a href="${t.link}" class="read-more">查看证明 →</a>
        `;
        grid.appendChild(card);
    });

    // 关键：告诉 MathJax 渲染新生成的动态内容
    if (window.MathJax && window.MathJax.typeset) {
        window.MathJax.typeset();
    }
}

function searchTheorems() {
    let input = document.getElementById('searchInput').value.toLowerCase();
    let filtered = window.allTheorems.filter(t => 
        t.title.toLowerCase().includes(input) || 
        t.description.toLowerCase().includes(input) ||
        t.tags.some(tag => tag.toLowerCase().includes(input))
    );
    renderTheorems(filtered);
}

function debounce(fn, wait) {
    let t;
    return function(...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function levenshtein(a, b) {
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const matrix = Array.from({length: a.length + 1}, () => []);
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i-1] === b[j-1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i-1][j] + 1,
                matrix[i][j-1] + 1,
                matrix[i-1][j-1] + cost
            );
        }
    }
    return matrix[a.length][b.length];
}

function scoreMatch(text, tokens) {
    text = (text || '').toLowerCase();
    let score = 0;
    tokens.forEach(token => {
        if (!token) return;
        if (text.includes(token)) {
            score += 10;
            if (text.indexOf(token) === 0) score += 3;
        } else {
            // fuzzy fallback by levenshtein
            const dist = levenshtein(token, text.slice(0, Math.max(text.length, token.length)));
            if (dist <= 2) score += 3;
        }
    });
    return score;
}

let currentSelected = -1;

function renderTheorems(theorems, highlightTokens = []) {
    const grid = document.getElementById('theoremGrid');
    grid.innerHTML = ''; // 清空加载提示

    theorems.forEach((t, idx) => {
        const card = document.createElement('div');
        card.className = 'theorem-card';
        card.setAttribute('data-index', idx);

        // 高亮匹配词
        let titleHTML = t.title;
        let descHTML = t.description;
        highlightTokens.forEach(tok => {
            if (!tok) return;
            const re = new RegExp('(' + escapeRegExp(tok) + ')', 'ig');
            titleHTML = titleHTML.replace(re, '<mark>$1</mark>');
            descHTML = descHTML.replace(re, '<mark>$1</mark>');
        });

        card.innerHTML = `
            <h3>${titleHTML}</h3>
            <p>${descHTML}</p>
            <div class="tags">${t.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
            <a href="${t.link}" class="read-more">查看证明 →</a>
        `;
        grid.appendChild(card);
    });

    // 更新 selection 样式
    updateSelection();

    // 关键：告诉 MathJax 渲染新生成的动态内容
    if (window.MathJax && window.MathJax.typeset) {
        window.MathJax.typeset();
    }
}

function searchTheorems(query) {
    query = (query || '').trim().toLowerCase();
    if (!query) {
        currentSelected = -1;
        return renderTheorems(window.allTheorems);
    }
    const tokens = query.split(/\s+/).filter(Boolean);
    const scored = window.allTheorems.map(t => {
        const titleScore = scoreMatch(t.title, tokens);
        const tagScore = scoreMatch(t.tags.join(' '), tokens);
        const descScore = scoreMatch(t.description, tokens);
        const total = titleScore * 5 + tagScore * 4 + descScore * 1;
        return {t, score: total};
    }).filter(x => x.score > 0)
      .sort((a,b) => b.score - a.score)
      .map(x => x.t);

    currentSelected = -1;
    renderTheorems(scored, tokens);
}

function updateSelection() {
    const cards = Array.from(document.querySelectorAll('.theorem-card'));
    cards.forEach(c => c.classList.remove('selected'));
    if (currentSelected >= 0 && currentSelected < cards.length) {
        const el = cards[currentSelected];
        el.classList.add('selected');
        el.scrollIntoView({block: 'nearest', behavior: 'smooth'});
    }
}

// 绑定输入与键盘事件
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('searchInput');
    if (!input) return;
    const handler = debounce(e => searchTheorems(e.target.value), 200);
    input.addEventListener('input', handler);
    input.addEventListener('keydown', (e) => {
        const cards = document.querySelectorAll('.theorem-card');
        if (!cards.length) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            currentSelected = Math.min(currentSelected + 1, cards.length - 1);
            updateSelection();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            currentSelected = Math.max(currentSelected - 1, 0);
            updateSelection();
        } else if (e.key === 'Enter') {
            if (currentSelected >= 0 && currentSelected < cards.length) {
                const link = cards[currentSelected].querySelector('.read-more');
                if (link) window.location.href = link.href;
            }
        }
    });
});

// 为鼠标点击选择卡片
document.addEventListener('click', (e) => {
    const card = e.target.closest && e.target.closest('.theorem-card');
    if (!card) return;
    const cards = Array.from(document.querySelectorAll('.theorem-card'));
    const idx = cards.indexOf(card);
    if (idx >= 0) {
        currentSelected = idx;
        updateSelection();
    }
});
