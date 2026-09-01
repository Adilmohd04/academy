# Karpathy Guidelines — Examples

Before/after code examples for each principle. Reference material: shows what LLMs commonly do wrong and the correct surgical/simple alternative.

---

## 1. Think Before Coding — surface assumptions

**Request:** "Make the search faster"

Wrong: silently add caching + indexes + async (200 lines), guessing which "faster" was meant.

Right: present the interpretations and ask:
- Faster response time? → add indexes / cache
- More concurrent searches? → async / pooling
- Faster perceived speed? → progressive loading

State current behavior ("~500ms typical") and ask which matters.

---

## 2. Simplicity First — no premature abstraction

**Request:** "Add a function to calculate discount"

Wrong: `DiscountStrategy` ABC + `PercentageDiscount` + `FixedDiscount` + `DiscountConfig` + `DiscountCalculator` (30+ lines of setup).

Right:
```python
def calculate_discount(amount: float, percent: float) -> float:
    """Calculate discount amount. percent should be 0-100."""
    return amount * (percent / 100)
```
Add the strategy pattern only when a second discount type is actually required.

---

## 3. Surgical Changes — touch only what's needed

**Request:** "Fix the bug where empty emails crash the validator"

Wrong: fix the email bug AND improve email regex AND add username length/alphanumeric checks AND add a docstring AND change comments.

Right: change only the 2-3 lines that handle the empty-email case. Mention other issues, don't fix them unasked.

**Request:** "Add logging to the upload function"

Wrong: add logging AND change quote style AND add type hints AND reformat whitespace AND change boolean return logic.

Right: add only the logger import and the log lines. Match existing single-quote style, no type hints, keep existing structure.

---

## 4. Goal-Driven Execution — verifiable criteria

**Request:** "The sorting breaks when there are duplicate scores"

Wrong: immediately change the sort key without confirming the bug.

Right:
```python
# 1. Write a test that reproduces the non-deterministic ordering
# 2. Run it → confirm it fails
# 3. Fix with a stable sort: key=lambda x: (-x['score'], x['name'])
# 4. Run test → confirm it passes consistently
```

**Request:** "Add rate limiting to the API"

Wrong: full Redis + multiple strategies + config + monitoring in one 300-line commit.

Right: incremental, each step verifiable:
```
1. In-memory limit on one endpoint → test: 11th request gets 429
2. Extract to middleware → test: applies to all endpoints, old tests pass
3. Redis backend → test: limit persists across restart
4. Per-endpoint config → test: /search 10/min, /users 100/min
```

---

## Key Insight

The over-engineered versions aren't "wrong" — they follow real design patterns. The problem is **timing**: complexity added before it's needed makes code harder to understand, buggier, slower to ship, harder to test.

**Good code solves today's problem simply, not tomorrow's problem prematurely.**

---

Derived from Andrej Karpathy's observations. Original by forrestchang: https://github.com/forrestchang/andrej-karpathy-skills (MIT License).
