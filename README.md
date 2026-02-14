# 数论百科

欢迎来到 **数论百科** 项目！这是一个全面的数论概念、算法和实现的集合。我们致力于为数学爱好者、学生和研究者提供高质量的学习资源，探索整数的性质及奥秘。

---

## 功能与用途

- **全面的资源**：涵盖从基础到高级的数论概念。
- **实用的示例**：编写并展示了常见数论算法的具体实现。
- **助力学习**：帮助学习者更好地理解数论的基本思想及实际应用。

这个项目专为那些对数论感兴趣、想要学习其理论与算法的人们提供支持和帮助。无论你是初学者还是专家，这里都能为你提供有价值的内容。

---

## 示例

以下是本项目中部分的代码示例：

### 1. **求最大公约数——欧几里得算法**

快速计算两个整数的最大公约数 (GCD)：

```python
def gcd(a, b):
    while b:
        a, b = b, a % b
    return a

# 示例:
print(gcd(48, 18))  # 输出: 6
```

---

### 2. **素数筛选法（埃拉托色尼筛法）**

生成一个范围内的所有素数：

```python
def sieve_of_eratosthenes(n):
    primes = [True] * (n + 1)
    p = 2
    while (p * p <= n):
        if primes[p]:
            for i in range(p * p, n + 1, p):
                primes[i] = False
        p += 1
    return [p for p in range(2, n + 1) if primes[p]]

# 示例:
print(sieve_of_eratosthenes(30))  # 输出: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]
```

---

### 3. **模幂运算**

使用模运算高效计算 `(base^exponent) % mod`：

```python
def modular_exponentiation(base, exponent, mod):
    result = 1
    base = base % mod
    while exponent > 0:
        if (exponent % 2) == 1:
            result = (result * base) % mod
        exponent = exponent >> 1
        base = (base * base) % mod
    return result

# 示例:
print(modular_exponentiation(2, 10, 1000))  # 输出: 24
```

通过探索本项目，您将了解更多数论中的迷人算法和概念！

---

# Encyclopedia of Number Theory

Welcome to the **Encyclopedia of Number Theory**! This project is a comprehensive collection of number theory concepts, algorithms, and implementations. We aim to provide high-quality learning resources for mathematicians, students, and researchers to explore the properties and wonders of integers.

---

## Features and Purpose

- **Comprehensive Resource**: A wide range of number theory concepts, from basic to advanced level.
- **Practical Examples**: Demonstrates common number-theoretic algorithms with concrete examples and implementations.
- **Learning Support**: Helps learners to better understand the fundamental ideas and practical applications of number theory.

This project is designed for anyone interested in learning about number theory, from beginners to experts.

---

## Examples

Here are some examples from this project:

### 1. **Euclidean Algorithm for GCD**

Quickly compute the greatest common divisor (GCD) of two integers:

```python
def gcd(a, b):
    while b:
        a, b = b, a % b
    return a

# Example usage:
print(gcd(48, 18))  # Output: 6
```

---

### 2. **Prime Number Sieve (Sieve of Eratosthenes)**

Generate all prime numbers within a given range:

```python
def sieve_of_eratosthenes(n):
    primes = [True] * (n + 1)
    p = 2
    while (p * p <= n):
        if primes[p]:
            for i in range(p * p, n + 1, p):
                primes[i] = False
        p += 1
    return [p for p in range(2, n + 1) if primes[p]]

# Example usage:
print(sieve_of_eratosthenes(30))  # Output: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]
```

---

### 3. **Modular Exponentiation**

Efficiently compute `(base^exponent) % mod` using modular arithmetic:

```python
def modular_exponentiation(base, exponent, mod):
    result = 1
    base = base % mod
    while exponent > 0:
        if (exponent % 2) == 1:
            result = (result * base) % mod
        exponent = exponent >> 1
        base = (base * base) % mod
    return result

# Example usage:
print(modular_exponentiation(2, 10, 1000))  # Output: 24
```

Explore more in this repository and discover fascinating number theory algorithms and concepts!