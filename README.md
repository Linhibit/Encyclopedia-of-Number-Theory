# 算法竞赛数论百科

欢迎来到 **算法竞赛数论百科**！这是一个面向算法竞赛（信息学奥林匹克竞赛等）的数论知识库，系统整理了竞赛中常用的数论定理、算法与 C++ 实现，帮助你快速查阅、理解和掌握数论知识。

---

## 功能与用途

- **全面的资源**：覆盖从基础定理（费马小定理、中国剩余定理等）到高阶算法（Miller-Rabin、Pollard-Rho、NTT、杜教筛等）。
- **实用的 C++ 实现**：每个算法/定理条目都配有可直接编译运行的 **C++14** 示例代码（不使用万能头 `bits/stdc++.h`）。
- **助力竞赛**：以“定理 + 证明 + 复杂度分析 + 代码”的结构组织内容，便于在赛前复习与赛时快速查证。

---

## 示例

以下是本项目中部分代码示例（均为 C++14，使用显式标准头文件）：

### 1. 求最大公约数——欧几里得算法

```cpp
#include <iostream>
using namespace std;

int gcd(int a, int b) {
    return b == 0 ? a : gcd(b, a % b);
}

int main() {
    cout << gcd(48, 18) << '\n';   // 输出: 6
    cout << gcd(1071, 462) << '\n';// 输出: 21
    return 0;
}
```

### 2. 素数筛选法（埃拉托斯特尼筛法）

```cpp
#include <iostream>
#include <vector>
using namespace std;

vector<int> sieveOfEratosthenes(int n) {
    vector<bool> isPrime(n + 1, true);
    isPrime[0] = isPrime[1] = false;
    for (int p = 2; p * p <= n; ++p) {
        if (isPrime[p]) {
            for (int k = p * p; k <= n; k += p) {
                isPrime[k] = false;
            }
        }
    }
    vector<int> primes;
    for (int i = 2; i <= n; ++i) {
        if (isPrime[i]) primes.push_back(i);
    }
    return primes;
}

int main() {
    vector<int> primes = sieveOfEratosthenes(30);
    for (int p : primes) cout << p << ' '; // 2 3 5 7 11 13 17 19 23 29
    cout << '\n';
    return 0;
}
```

### 3. 快速幂（模幂运算）

```cpp
#include <iostream>
using namespace std;

long long modPow(long long base, long long exp, long long mod) {
    long long result = 1 % mod;
    base %= mod;
    while (exp > 0) {
        if (exp & 1) result = result * base % mod;
        base = base * base % mod;
        exp >>= 1;
    }
    return result;
}

int main() {
    cout << modPow(2, 10, 1000) << '\n'; // 输出: 24
    return 0;
}
```

---

## 项目结构

- `index.html` — 首页（搜索 + 质数分布可视化图表）。
- `algorithms/` — 数论算法条目页。
- `theorems/` — 数论定理条目页。
- `theorems.json` — 首页卡片数据源。
- `style.css` / `script.js` / `chart.js` — 全局样式、搜索逻辑与质数分布图表。

通过探索本项目，你将掌握算法竞赛中常用数论算法的思想与实现。

---

# Number Theory Encyclopedia for Competitive Programming

A Chinese knowledge base of number theory for competitive programming (informatics olympiad), organized as "theorem + proof + complexity + C++14 implementation". All code examples use explicit standard headers and compile with `g++ -std=c++14`.
