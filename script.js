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

function splitMathSegments(text) {
    if (!text) return [{type: 'text', content: ''}];
    const parts = [];
    const re = /(\$\$[\s\S]*?\$\$|\$[^$\n][\s\S]*?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;
    let lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
        if (m.index > lastIndex) parts.push({type: 'text', content: text.slice(lastIndex, m.index)});
        parts.push({type: 'math', content: m[0]});
        lastIndex = re.lastIndex;
    }
    if (lastIndex < text.length) parts.push({type: 'text', content: text.slice(lastIndex)});
    return parts;
}

function highlightMatchesInTextNode(node, token) {
    if (!node || !node.nodeValue) return;
    const lcToken = token.toLowerCase();
    let currentNode = node;
    let text = currentNode.nodeValue;
    let lc = text.toLowerCase();
    let idx = lc.indexOf(lcToken);
    while (idx !== -1 && currentNode) {
        const range = document.createRange();
        range.setStart(currentNode, idx);
        range.setEnd(currentNode, idx + token.length);
        const mark = document.createElement('mark');
        mark.appendChild(range.extractContents());
        range.insertNode(mark);

        // move to text node after the inserted mark
        if (mark.nextSibling && mark.nextSibling.nodeType === Node.TEXT_NODE) {
            currentNode = mark.nextSibling;
            lc = currentNode.nodeValue.toLowerCase();
            idx = lc.indexOf(lcToken);
        } else {
            break;
        }
    }
}

function highlightRenderedTokens(container, tokens) {
    if (!tokens || !tokens.length) return;
    const filtered = tokens.filter(Boolean);
    if (!filtered.length) return;
    filtered.forEach(token => {
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
            acceptNode: function(node) {
                if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                // skip text nodes inside existing <mark>
                if (node.parentNode && node.parentNode.closest && node.parentNode.closest('mark')) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        }, false);
        let n;
        while ((n = walker.nextNode())) {
            highlightMatchesInTextNode(n, token);
        }
    });
}

function renderTheorems(theorems, highlightTokens = []) {
    const grid = document.getElementById('theoremGrid');
    grid.innerHTML = ''; // 清空加载提示

    theorems.forEach((t, idx) => {
        const card = document.createElement('div');
        card.className = 'theorem-card';
        card.setAttribute('data-index', idx);

        // 只在非 LaTeX 段落中直接插入 <mark>，避免破坏 MathJax 源
        const processForHighlight = (text) => {
            const segs = splitMathSegments(text);
            return segs.map(s => {
                if (s.type === 'math') return s.content; // 保持原始 LaTeX 源
                let txt = s.content;
                highlightTokens.forEach(tok => {
                    if (!tok) return;
                    const re = new RegExp('(' + escapeRegExp(tok) + ')', 'ig');
                    txt = txt.replace(re, '<mark>$1</mark>');
                });
                return txt;
            }).join('');
        };

        const titleHTML = processForHighlight(t.title);
        const descHTML = processForHighlight(t.description);

        card.innerHTML = `
            <h3>${titleHTML}</h3>
            <p>${descHTML}</p>
            <div class="tags">${t.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
        `;
        // 使整张卡片可点击并保存链接
        card.dataset.link = t.link;
        card.tabIndex = 0;
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
            // 阻止冒泡，避免 document 级点击处理器把卡片标记为选中
            e.stopPropagation();
            if (card.dataset.link) {
                const w = window.open(card.dataset.link, '_blank');
                try { if (w) w.opener = null; } catch (err) { /* ignore */ }
            }
            // 立即失去焦点，避免保留浏览器的焦点样式或被其他处理器识别为选中
            try { card.blur(); } catch (err) { /* ignore */ }
        });
        grid.appendChild(card);
    });

    // 更新 selection 样式
    updateSelection();

    // 在 MathJax 渲染后，对渲染出的文本（包括数学渲染）进行 DOM 层面的高亮
    if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([grid]).then(() => {
            highlightRenderedTokens(grid, highlightTokens);
        }).catch(() => {
            // fallback to typeset + sync highlight
            if (window.MathJax && window.MathJax.typeset) window.MathJax.typeset();
            highlightRenderedTokens(grid, highlightTokens);
        });
    } else if (window.MathJax && window.MathJax.typeset) {
        window.MathJax.typeset();
        highlightRenderedTokens(grid, highlightTokens);
    } else {
        // 无 MathJax 的情况也进行一次 DOM 高亮
        highlightRenderedTokens(grid, highlightTokens);
    }
}

function searchTheorems(query) {
    query = (query || '').trim();
    // 将查询规范化为用于匹配的令牌：去掉 $，移除前导反斜杠并裁剪两端标点
    function normalizeTokens(q) {
        return (q.split(/\s+/).filter(Boolean).map(tok => {
            let t = tok.replace(/\$/g, ''); // 去掉 $ 界定符
            t = t.replace(/^\\+/, ''); // 去掉前导的反斜杠，允许输入 \gcd -> gcd
            // 去掉首尾非字母/数字/下划线及常见中文字符的符号
            t = t.replace(/^[^\w\u4e00-\u9fff]+|[^\w\u4e00-\u9fff]+$/g, '');
            return t.toLowerCase();
        })).filter(Boolean);
    }

    const tokens = normalizeTokens(query);
    if (!query || !tokens.length) {
        currentSelected = -1;
        return renderTheorems(window.allTheorems);
    }
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
                const link = cards[currentSelected].dataset && cards[currentSelected].dataset.link;
                if (link) {
                    const w = window.open(link, '_blank');
                    try { if (w) w.opener = null; } catch (e) { /* ignore */ }
                }
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
