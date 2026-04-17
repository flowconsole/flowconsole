# FlowConsole Rule Expressions — контракт v1alpha1

## Scope

Документ фиксирует публичный expression surface для файлов правил FlowConsole v1alpha1.

Rule Expressions — это безопасный, non-Turing-complete язык выражений, используемый только внутри полей `selector.where`, `rule.where`, `rule.let`, `rule.assert` и template-части `rule.message` в пределах файла правил.

Важно:

- пользователь пишет Rule Expressions только внутри `RuleFile` DSL;
- Rule Expressions не раскрывают и не упоминают внутренний executor;
- доступные bindings, типы и helper functions определяет FlowConsole, а не underlying runtime;
- документ описывает authoring contract; реализация expression engine — отдельный внутренний слой.

## Target views — проекции модели

Каждое правило работает с одной из трёх **проекций** архитектурной модели, задаваемой полем `target`:

### `model` — как должно быть

Архитектурная модель, явно описанная автором в DSL/SDK файлах (TypeScript, C#, Go, Java, Python, YAML). Это **to-be intent** — целевая архитектура.

- **Источник данных:** DSL-файлы в git-репозитории, парсятся при загрузке модели.
- **sourceFamily:** `git`.
- **Доступность в CI:** полностью offline (файлы есть в репозитории).
- **Типичные правила:** naming conventions, layer constraints, max coupling, required tags.

### `actual` — как есть на самом деле

Модель, построенная автоматическими сканерами из реальных артефактов. Это **as-is reality** — что существует в коде и инфраструктуре.

- **Источники данных и sourceFamily:**
  - `code` — Tree-sitter парсинг исходного кода (классы, эндпоинты, зависимости между модулями);
  - `infra` — сканеры инфраструктуры (K8s pods/services, OpenAPI specs, Docker Compose);
  - `import` — импорт из внешних систем (Structurizr DSL, Backstage catalog, CMDB CSV).
- **Доступность в CI:**
  - `code` — полностью offline (исходники есть в репозитории, Tree-sitter работает локально);
  - `infra` — offline, если файл импорта есть в репозитории, иначе требует runtime-доступ к инфраструктуре (K8s API, endpoint URLs);
  - `import` — offline, если файл импорта есть в репозитории.
- **Типичные правила:** «нет orphan-элементов в коде», «все endpoint'ы имеют документацию», «K8s service match'ится с code-сервисом».
- **`sourceFamilies` filter:** можно ограничить правило конкретными source'ами (например, `sourceFamilies: [code]` — только результаты code-сканера).

### `diff` — что расходится

Результат drift-сравнения `model` vs `actual`. Содержит элементы, которые добавлены, удалены, изменены или не сматчены между двумя проекциями.

- **Источник данных:** `DriftSnapshot` — результат работы `IDriftDetector`, который сравнивает элементы по `canonical_id`.
- **Entity type:** `diffItems` (специальный тип сущностей, доступный только в diff-правилах).
- **changeKinds:** `added` (есть в actual, нет в model), `removed` (есть в model, нет в actual), `changed` (есть в обоих, поля различаются), `unmatchedDeclared`, `unmatchedObserved`.
- **Доступность в CI:** offline для `model` vs `code` (оба доступны локально). Для `model` vs `infra` — нужен runtime-доступ или API.
- **Типичные правила:** «не больше N removed-элементов за релиз», «все added-элементы должны быть отражены в model», «изменение technology в actual — блокирующее нарушение».

### Матрица доступности в CI (offline)

| Target | sourceFamily | Offline в CI | Почему |
|---|---|---|---|
| `model` | `git` | **Да** | DSL-файлы в репозитории |
| `actual` | `code` | **Да** | Исходники + Tree-sitter локально |
| `actual` | `infra` | **Зависит** |  Если файлы есть в репо - да, иначе нужен доступ к K8s/API |
| `actual` | `import` | **Зависит** | Если файл импорта в репозитории — да |
| `diff` | model vs code | **Да** | Оба доступны локально |
| `diff` | model vs infra | **Нет** | Нужен actual от infra |
| `diff` | code vs infra | **Нет** | Нужен actual от code и infra |

## Где разрешены Rule Expressions

Rule Expressions разрешены только в следующих полях rule'а:

- `selector.where` — в любом selector'е (`subject`, `from`, `to`, `via`);
- `rule.where` — на уровне rule'а;
- `rule.let` — каждое значение в map-е `let`;
- `rule.assert` — обязательное булево выражение;
- `rule.message` — только как interpolation `${...}` подмножество (см. [§ Message template](#message-template)).

Во всех остальных полях выражения запрещены.

## Порядок вычисления

1. `selector.where` применяется для каждого кандидата, прошедшего через statically-translatable фильтры селектора;
2. `rule.where` применяется для каждого элемента subject set после применения selector;
3. `rule.let` вычисляется в порядке объявления; каждая переменная доступна в последующих `let` и в `assert`;
4. `rule.assert` вычисляется последним; его результат определяет pass / fail правила;
5. `rule.message` интерполируется только при fail (эмите finding).

## Bindings per family и mode

Каждая пара (family, mode) имеет фиксированный набор bindings.

| Kind | Target | Mode | Binding | Тип |
|---|---|---|---|---|
| element | model / actual | perItem | `item` | `ElementRef` или `RelationshipRef` (по `subject.entity`) |
| element | model / actual | perItem | `rule` | `Rule` |
| element | model / actual | aggregate | `items` | `list<ElementRef \| RelationshipRef>` |
| element | model / actual | aggregate | `stats` | `Stats` |
| element | model / actual | aggregate | `rule` | `Rule` |
| element | diff | perItem | `item` | `DiffItem` |
| element | diff | perItem | `diff` | `DriftDiff` |
| element | diff | perItem | `stats` | `Stats` |
| element | diff | perItem | `rule` | `Rule` |
| element | diff | aggregate | `items` | `list<DiffItem>` |
| element | diff | aggregate | `diff`, `stats`, `rule` | те же типы |
| flow | model / actual | perPath | `path` | `PathRef` |
| flow | model / actual | perPath | `paths` | `list<PathRef>` (sibling context) |
| flow | model / actual | perPath | `from` | `ElementRef` |
| flow | model / actual | perPath | `to` | `ElementRef` |
| flow | model / actual | perPath | `stats` | `Stats` |
| flow | model / actual | perPath | `rule` | `Rule` |
| flow | model / actual | aggregate | `paths` | `list<PathRef>` |
| flow | model / actual | aggregate | `from`, `to`, `stats`, `rule` | те же типы |
| `selector.where` | — | — | `item` | `ElementRef`, `RelationshipRef` или `DiffItem` (по `entity`) |
| `rule.let` | — | — | все bindings текущего kind/target/mode + ранее определённые `let`-переменные | |

**Замечание:** `kind: flow` не поддерживает `target: diff` (пути по drift-данным не имеют смысла). `kind: element` с `target: diff` получает diff-specific bindings (`item: DiffItem`, `diff: DriftDiff`).

Полная иерархия типов — в [`types.md`](types.md).

## Типы возвращаемых значений

| Поле | Обязательный тип |
|---|---|
| `selector.where` | `bool` |
| `rule.where` | `bool` |
| `rule.assert` | `bool` |
| `rule.let.*` | любой тип, выразимый в Rule Expressions |

Нарушение — ingest-level diagnostic `RF_EXPR_NON_BOOLEAN_ASSERT` (для `assert` и `where`).

## Разрешённые и запрещённые конструкции

Rule Expressions принимают **ограниченный subset** выражений. Всё, что не входит в список разрешённого, режектится на ingest-фазе с кодом `RF_EXPR_UNSUPPORTED_CONSTRUCT`, независимо от того, принимает ли это underlying expression parser.

### Разрешено

**Literals**

- `null`, `true`, `false`;
- целые: `42`, `-3`;
- с плавающей точкой: `3.14`, `1.0e-2`;
- строки в **double quotes**: `"hello"`, с escape-последовательностями `\"`, `\\`, `\n`, `\t`, `\r`;
- collection literal: `[1, 2, 3]`, `["a", "b"]` (элементы должны быть одного типа).

**Доступ и идентификаторы**

- bindings и let-переменные: `item`, `items`, `rule`, `dbCount`;
- property access: `item.name`, `rule.severity`, `item.properties["env"]`;
- index access: `items[0]`, `map["key"]`.

**Операторы**

| Категория | Операторы |
|---|---|
| Арифметика | `+`, `-`, `*`, `/`, `%` (над `int`/`double`; `+` над `string` — конкатенация) |
| Сравнение | `<`, `<=`, `>`, `>=` (над `int`/`double`/`string`) |
| Equality | `==`, `!=` |
| Логика | `&&`, `||`, `!` (short-circuit) |
| Членство | `in` (над `list` / `map`) |
| Унарные | `!`, `-` |

Приоритет — стандартный математический (см. любой справочник по приоритетам в expression-языках Python-семейства).

**Функции и лямбды**

- вызов helper'а: `count(items)`, `neighbors(item, "Calls")` — только имена из [`helpers.md`](helpers.md);
- lambda с одним параметром: `x -> expr` — **только** как аргумент helper'а, явно принимающего lambda (`all`, `any`, `none`, `exists`, `count(list, predicate)`, `distinct(list, keyExpr)`);
- lambda-параметр не может затенять binding или let-переменную → `RF_EXPR_SHADOWED_BINDING`.

**Специальные конструкции**

- conditional: `cond ? a : b`;
- has-operator: `has(item.field)`, `has(item.properties.env)`.

### Запрещено

Следующие конструкции запрещены в v1alpha1 и приводят к `RF_EXPR_UNSUPPORTED_CONSTRUCT`:

- **macros** вида `items.all(x, ...)`, `items.exists(x, ...)`, `items.map(x, ...)` — используйте функциональную форму `all(items, x -> ...)`;
- **optional chaining** `item.?technology` — используйте `has(item.technology) ? item.technology : defaultValue`;
- **timestamp / duration literals и арифметика** над ними;
- **imports / includes**;
- **custom type instantiation** (struct literals вида `MyType{...}`);
- **regex literals** (регулярки указываются только в полях `selector.*.matches` как обычные строки);
- **single-quoted strings** (`'hello'`) — только double quotes;
- **multiline string literals** — используйте `\n` в обычной строке;
- **unary `+`** — просто опускается (`+5` → `5`);
- **unicode escapes** `\uXXXX` в строках — не поддерживаются в v1alpha1.

Семантика equality для доменных типов и типы возвращаемых значений — в разделах [§ Equality](#equality) и [§ Типы возвращаемых значений](#типы-возвращаемых-значений).

## Null semantics

- Опциональные поля возвращают `null` при отсутствии (не пустую строку и не default-значение).
- `has(item.field)` возвращает `true` только если поле определено и не `null`.
- `null == null` → `true`; `null == value` → `false` для любого value.
- Порядковое сравнение с `null` (`null < value`, `null > value`, и т.д.) — runtime error `RE_EXPRESSION_NULL_ORDER`.
- Арифметика с `null` — runtime error.
- `null in list` → `true` если list содержит `null`.

## Equality

- `ElementRef == ElementRef` — сравнение по `id`.
- `RelationshipRef == RelationshipRef` — по `id`.
- `DiffItem == DiffItem` — по `canonicalId`.
- `PathRef == PathRef` — запрещено (compile-level diagnostic `RF_EXPR_UNSUPPORTED_CONSTRUCT`).
- Strings — case-sensitive.
- Collections — deep equality по элементам в том же порядке.
- Maps — deep equality без учёта порядка ключей.

## Iteration budget и timeout

- **Iteration budget:** 1 000 000 элементарных операций на одно expression evaluation. При превышении — runtime error `RE_EXPRESSION_BUDGET_EXCEEDED`.
- **Timeout:** 100 ms wall-clock на одно expression evaluation. При превышении — `RE_EXPRESSION_TIMEOUT`.
- Оба лимита configurable per-install.
- Лимиты не видны пользователю в тексте выражения; оборачиваются executor-обёрткой.

## Message template

Поле `message` — строка с interpolation `${expr}`, где `expr` — сильно урезанное подмножество Rule Expressions.

**Разрешено:**

- property access: `${item.name}`, `${rule.id}`;
- index access: `${items[0].name}`;
- обращение к `let`-переменным: `${dbCount}`;
- простые function calls: `${count(items)}`, `${hasTag(item, "pci")}` (только helper'ы, не `map`/`filter`/`reduce`).

**Запрещено:**

- lambda: `${items.filter(x -> ...)}` → diagnostic `RF_EXPR_UNSUPPORTED_CONSTRUCT`;
- арифметика и сравнения: `${dbCount + 1}` → не интерполируется как expression, только как пробрасываемое значение;
- conditional: `${cond ? a : b}` → запрещено.

**Escape:**

- `\${...}` — literal `${...}`.
- `\\` — literal `\`.

**Ошибки:**

- Unknown binding в template → `RF_EXPR_MESSAGE_UNKNOWN_BINDING`.
- Неподдерживаемое выражение в `${...}` → `RF_EXPR_UNSUPPORTED_CONSTRUCT`.

i18n / pluralization — не входит в v1alpha1; `message` — одна строка, локаль-агностично.

## Регулярные выражения

Поля `name.matches`, `technology.matches`, `properties.*.matches` в селекторах используют **RE2-compatible** подмножество.

- Запрещены backreferences, lookaround (`(?=)`, `(?!)`, `(?<=)`, `(?<!)`), possessive quantifiers.
- Ошибка при неподдерживаемых фичах — ingest-level `RF_EXPR_REGEX_UNSUPPORTED_FEATURE`.

## Ограничения v1alpha1

- никаких пользовательских функций;
- никаких imports / includes;
- никакого filesystem / network / clock / random access;
- никаких side effects (выражения чисты);
- никакого доступа к внутренним executor APIs;
- никаких timestamp / duration literals и арифметики над ними;
- неизвестные bindings / functions / fields приводят к ingest-level diagnostic.

## Примеры

### `selector.where`

```
hasKind(item, "Service") && hasTag(item, "critical")
```

### `rule.let`

```
count(neighbors(item))
```

### `rule.where`

```
item.sourceFamily == "infra" && !hasTag(item, "deprecated")
```

### `rule.assert`

```
count(items) == 0
```

### flow rule assert

```
count(paths) > 0
```

### Lambda в helper

```
any(outgoing(item), r -> r.kind == "Uses" && hasTag(r, "async"))
```

### Has-operator

```
has(item.technology) && item.technology == "postgres"
```

### Message template

```
База данных '${item.name}' используется ${dbCount} компонентами
```

## Связанные документы

- [`types.md`](types.md) — полная типовая иерархия;
- [`helpers.md`](helpers.md) — каталог helper-функций с сигнатурами и семантикой;
- [`diagnostics.md`](diagnostics.md) — коды ошибок, включая `RF_EXPR_*` и `RE_*`.
