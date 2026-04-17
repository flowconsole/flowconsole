# Типовая иерархия Rule Expressions — v1alpha1

Документ фиксирует типы, видимые в Rule Expressions. Вместе с [`helpers.md`](helpers.md) и [`expression-language.md`](expression-language.md) образует authoring contract.

## Нотация

Типы описаны в псевдо-TypeScript-like формате для читаемости. Это **не** TypeScript-декларации — это спецификация. Формальная привязка к JSON Schema / SDK-codegen будет отдельным артефактом.

Общие соглашения:

- `?` после имени поля — поле опционально и может отсутствовать или быть `null`;
- `list<T>` — упорядоченная коллекция элементов типа `T`;
- `map<K, V>` — словарь с ключами `K` и значениями `V`;
- `dyn` — динамический тип (используется только для `properties.*` значений, загруженных из JSON);
- enum-типы (`string` с фиксированным enum-диапазоном) приводятся как строки.

## Core refs

### `ElementRef`

Представление элемента графа модели.

```
ElementRef:
  id: string                    // уникальный id элемента в рамках модели
  canonicalId: string           // canonical id для matcher'а (см. drift)
  kind: string                  // одно из ElementKind enum backend'а
  name: string                  // отображаемое имя
  technology: string?           // технология (язык, фреймворк, движок)
  tags: list<string>            // теги
  properties: map<string, dyn>  // произвольные свойства из модели
  source: string                // конкретный источник (e.g., "code_scan", "infra_scan", "git")
  sourceFamily: string          // "code" | "infra" | "import" | "git"
  parentId: string?             // id родителя (для иерархических моделей)
```

**Equality:** по `id`.
**Null-поля:** `technology`, `parentId` возвращают `null` если не заданы.

### `RelationshipRef`

Представление связи между элементами.

```
RelationshipRef:
  id: string                    // уникальный id связи в рамках модели
  kind: string                  // одно из RelationKind enum backend'а
  sourceId: string              // id элемента-источника
  targetId: string              // id элемента-цели
  technology: string?           // технология протокола/транспорта
  tags: list<string>
  properties: map<string, dyn>
  source: string
  sourceFamily: string
```

**Equality:** по `id`.
**Null-поля:** `technology`.

В Rule Expressions из `RelationshipRef` нельзя напрямую получить `ElementRef` участников. Для навигации используйте helper'ы `incoming` / `outgoing` на `ElementRef`.

## Diff types

### `DiffItem`

Элемент diff между `model` и `actual` проекциями модели.

```
DiffItem:
  changeKind: string                 // "added" | "removed" | "changed"
                                     //   | "unmatchedModel" | "unmatchedActual"
  canonicalId: string                // canonical id matcher'а
  model: ElementRef?              // to-be представление (null для added / unmatchedActual)
  actual: ElementRef?              // as-is представление (null для removed / unmatchedModel)
  fieldChanges: map<string, FieldChange>?  // только для changeKind="changed", null иначе
```

**Equality:** по `canonicalId`.

**Семантика `changeKind`:**

| changeKind | model | actual | Значение |
|---|---|---|---|
| `added` | `null` | set | Элемент есть в as-is, нет в to-be |
| `removed` | set | `null` | Элемент есть в to-be, нет в as-is |
| `changed` | set | set | Элемент есть в обоих; поля различаются |
| `unmatchedModel` | set | `null` | Элемент в to-be, не сматчен ни с одним actual |
| `unmatchedActual` | `null` | set | Элемент в as-is, не сматчен ни с одним model |

### `FieldChange`

Описание изменения одного поля между model и actual.

```
FieldChange:
  before: dyn      // значение в model
  after: dyn       // значение в actual
```

## Path types

### `PathRef`

Путь в графе, найденный для `path` rule'а.

```
PathRef:
  nodes: list<ElementRef>       // узлы пути в порядке прохождения
  edges: list<RelationshipRef>  // рёбра пути, count(edges) == length
  length: int                   // длина пути в рёбрах
  from: ElementRef              // nodes[0]
  to: ElementRef                // nodes[length]
```

**Equality:** запрещено (compile-level diagnostic `RF_EXPR_UNSUPPORTED_CONSTRUCT`). Сравнивайте по `from.id` / `to.id` / `length`.

**Инварианты:**

- `length == count(edges)`;
- `length + 1 == count(nodes)`;
- `from == nodes[0]`, `to == nodes[length]`;
- соседние `nodes[i]` / `nodes[i+1]` связаны через `edges[i]`.

## Drift aggregate

### `DriftDiff`

Сводная структура drift-проекции, передаваемая как binding `diff` в `diff`-rule'ах.

```
DriftDiff:
  added: list<ElementRef>
  removed: list<ElementRef>
  changed: list<DiffItem>
  unmatchedModel: list<ElementRef>
  unmatchedActual: list<ElementRef>
  score: double                     // 0.0 - 100.0
```

**Связь с `DiffItem.changeKind`:**

- `added[]` ↔ `DiffItem{ changeKind="added" }.actual`;
- `removed[]` ↔ `DiffItem{ changeKind="removed" }.model`;
- `unmatchedModel[]` / `unmatchedActual[]` — аналогично;
- `changed` содержит полные `DiffItem`-ы с `fieldChanges`.

## Statistics

### `Stats`

Агрегированная статистика по subject set правила.

```
Stats:
  count: int                                  // общее число элементов в subject set
  countByKind: map<string, int>               // count per ElementKind / RelationKind
  countByTag: map<string, int>                // count per tag (если элемент имеет несколько тегов — учитывается в каждом)
  countBySourceFamily: map<string, int>       // count per "code" | "infra" | "import" | "git"
  distinctTags: list<string>                  // уникальные теги, встречающиеся в subject set
```

Для `path` правил:

- `count` = количество найденных путей;
- остальные поля — статистика над всеми узлами во всех найденных путях (без дедупликации узлов).

Для `diff` правил:

- `count` = количество `DiffItem`-ов в subject set;
- `countByKind` — по `changeKind` DiffItem-ов.

## Rule metadata

### `Rule`

Метаданные текущего правила, доступные в выражениях как binding `rule`.

```
Rule:
  id: string                    // rule.id из YAML
  name: string                  // rule.name
  severity: string              // "info" | "warning" | "error" | "critical"
  kind: string                  // "element" | "flow"
  target: string                // "model" | "actual" | "diff"
```

**Предназначение:** использование в `message` template и условных проверках (`rule.severity == "critical"`).

## Enum values

### `ElementKind` (value set)

Backend-side enum. Значения, которые ожидаются в `ElementRef.kind` и `selector.kinds`:

**Code layer:** `Class`, `Interface`, `Endpoint`, `Function`, `Producer`, `Consumer`.

**Architecture layer:** `Service`, `Application`, `Module`, `External`, `Gateway`, `Worker`.

**Infra layer:** `Deployment`, `Database`, `Queue`, `Cache`, `Ingress`, `Namespace`, `Broker`, `Topic`.

Полный enum синхронизирован с `FlowConsole.Core/ValueObjects/ElementKind.cs`.

### `RelationKind` (value set)

Значения, которые ожидаются в `RelationshipRef.kind`:

`Uses`, `DependsOn`, `Calls`, `Publishes`, `Subscribes`, `Contains`, `Extends`, `Implements`, `Deploys`, `Routes`, `Scales`.

Полный enum синхронизирован с `FlowConsole.Core/ValueObjects/RelationKind.cs`.

### `Severity`

`info` | `warning` | `error` | `critical`.

### `SourceFamily`

`code` | `infra` | `import` | `git`.

- `git` — source элементов, загруженных из declared (to-be) DSL. В `sourceFamilies` селектора запрещён (declared уже подразумевает git).
- `code` / `infra` / `import` — source элементов от сканеров / импортёров (actual / diff).

### `ChangeKind`

`added` | `removed` | `changed` | `unmatchedModel` | `unmatchedActual`.

## Null behavior cheat sheet

| Выражение | Результат |
|---|---|
| `null == null` | `true` |
| `null == "value"` | `false` |
| `null < 5` | runtime error `RE_EXPRESSION_NULL_ORDER` |
| `null + 1` | runtime error |
| `has(item.technology)` when `technology` is `null` | `false` |
| `has(item.technology)` when `technology` is `""` | `true` |
| `item.technology == null` when `null` | `true` |
| `null in [1, 2, null]` | `true` |
| `null in [1, 2]` | `false` |

## Связанные документы

- [`expression-language.md`](expression-language.md) — синтаксис, bindings, null semantics, iteration budget, разрешённые и запрещённые конструкции;
- [`helpers.md`](helpers.md) — helper-функции, оперирующие над этими типами.
