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

// 升级搜索功能
function searchTheorems() {
    let input = document.getElementById('searchInput').value.toLowerCase();
    let filtered = window.allTheorems.filter(t => 
        t.title.toLowerCase().includes(input) || 
        t.description.toLowerCase().includes(input) ||
        t.tags.some(tag => tag.toLowerCase().includes(input))
    );
    renderTheorems(filtered);
}