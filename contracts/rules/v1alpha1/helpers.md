# Каталог helper-функций Rule Expressions — v1alpha1

Документ фиксирует публичный каталог helper-функций, доступных в Rule Expressions. Сигнатуры, семантика и null-поведение — контракт; реализация в конкретном executor'е обязана соответствовать этому документу (проверяется через conformance suite).

## Нотация

- `T`, `U` — type parameters (используются только для описания);
- `list<T>` — упорядоченная коллекция типа `T`;
- `?` после типа — опциональный (может быть `null`);
- `predicate: T -> bool` — lambda, принимающая один параметр типа `T` и возвращающая `bool`;
- `keyExpr: T -> K` — lambda-выражение для вычисления ключа;
- overload'ы перечислены отдельными сигнатурами.

Все helper-функции:

- **чистые** (без side effects);
- **детерминированные** (одинаковый input → одинаковый output в рамках одного evaluation);
- **не бросают runtime exceptions** (кроме `RE_EXPRESSION_BUDGET_EXCEEDED` / `RE_EXPRESSION_TIMEOUT`);
- возвращают пустую коллекцию, а не `null`, если результат — отсутствующая коллекция;
- порядок итерации — **unspecified**, если явно не указано иначе.

## Коллекции и агрегаты

### `count`

```
count(value: list<T>) -> int
count(value: list<T>, predicate: T -> bool) -> int
```

- Первая форма: количество элементов в коллекции.
- Вторая форма: количество элементов, удовлетворяющих predicate.

**Null behavior:** `count(null)` → runtime error. Пустая коллекция → `0`.

### `distinct`

```
distinct(value: list<T>) -> list<T>
distinct(value: list<T>, keyExpr: T -> K) -> list<T>
```

- Первая форма: элементы с удалением дубликатов по equality (см. [types.md § Equality](types.md#equality)).
- Вторая форма: дубликаты определяются по значению `keyExpr(item)`.

**Порядок:** первое вхождение сохраняется; остальные удаляются.

### `exists`

```
exists(value: list<T>, predicate: T -> bool) -> bool
```

- `true` если хотя бы один элемент удовлетворяет predicate.
- Пустая коллекция → `false`.
- Short-circuit: evaluation останавливается на первом match'е.

### `all`

```
all(value: list<T>, predicate: T -> bool) -> bool
```

- `true` если все элементы удовлетворяют predicate.
- Пустая коллекция → `true` (vacuous truth).
- Short-circuit: останавливается на первом non-match.

### `any`

```
any(value: list<T>, predicate: T -> bool) -> bool
```

- Синоним `exists`.

### `none`

```
none(value: list<T>, predicate: T -> bool) -> bool
```

- `true` если ни один элемент не удовлетворяет predicate.
- Пустая коллекция → `true`.
- Short-circuit: останавливается на первом match.

## Навигация по графу

Graph helpers оперируют над `ElementRef`; для `RelationshipRef` они не определены.

### `neighbors`

```
neighbors(item: ElementRef) -> list<ElementRef>
neighbors(item: ElementRef, relKind: string) -> list<ElementRef>
neighbors(item: ElementRef, direction: string, relKind: string) -> list<ElementRef>
```

- Возвращает элементы, соединённые с `item` через одно ребро.
- Параметр `direction`: `"in"` (только входящие ребра), `"out"` (только исходящие), `"any"` (default для первых двух overload'ов).
- Параметр `relKind`: фильтр по `RelationshipRef.kind` (exact match).
- Порядок: не специфицирован; полагаться на порядок нельзя.
- Дубликаты: возможны, если один сосед соединён через несколько рёбер подходящего kind; для уникальности использовать `distinct(neighbors(...))`.
- Пустой результат → пустая `list`, не `null`.

**Семантика direction:**

| direction | Возвращает |
|---|---|
| `"in"` | `ElementRef`-ы, для которых существует `RelationshipRef{ sourceId: X, targetId: item.id }` |
| `"out"` | `ElementRef`-ы, для которых существует `RelationshipRef{ sourceId: item.id, targetId: X }` |
| `"any"` | объединение `"in"` и `"out"` |

### `incoming`

```
incoming(item: ElementRef) -> list<RelationshipRef>
incoming(item: ElementRef, relKind: string) -> list<RelationshipRef>
```

- Все `RelationshipRef`-ы, у которых `targetId == item.id`.
- Overload с `relKind` фильтрует по `RelationshipRef.kind`.

### `outgoing`

```
outgoing(item: ElementRef) -> list<RelationshipRef>
outgoing(item: ElementRef, relKind: string) -> list<RelationshipRef>
```

- Все `RelationshipRef`-ы, у которых `sourceId == item.id`.
- Overload с `relKind` фильтрует по `RelationshipRef.kind`.

## Работа с diff

Diff helpers определены только для `DiffItem`. Использование вне `diff` rule'ов — compile-level diagnostic `RF_EXPR_UNKNOWN_HELPER`.

### `changed`

```
changed(item: DiffItem, field: string) -> bool
```

- `true` если `item.changeKind == "changed"` и `field` присутствует в `item.fieldChanges`.
- `false` для любого другого `changeKind`.

**Пример:**

```
changed(item, "technology")
```

### `before`

```
before(item: DiffItem, field: string) -> dyn
```

- Возвращает значение `field` в model-версии `DiffItem`.
- Для `changeKind == "changed"` — `item.fieldChanges[field].before`.
- Для `changeKind == "removed"` / `unmatchedModel` — значение из `item.model.properties` или top-level поля.
- Для `changeKind == "added"` / `unmatchedActual` — `null` (нет model версии).
- Для `changeKind == "changed"`, если `field` отсутствует в `fieldChanges` — значение из `item.model`, если доступно; иначе `null`.

### `after`

```
after(item: DiffItem, field: string) -> dyn
```

- Зеркальное `before`: значение `field` в actual-версии `DiffItem`.
- Для `added` / `changed` / `unmatchedActual` — из `item.actual`.
- Для `removed` / `unmatchedModel` — `null`.

## Tag и kind predicates

### `hasTag`

```
hasTag(item: ElementRef, tag: string) -> bool
hasTag(item: RelationshipRef, tag: string) -> bool
```

- `true` если `tag` присутствует в `item.tags` (exact match, case-sensitive).
- `null` в `item.tags` сравнивается как обычный элемент коллекции.

### `hasKind`

```
hasKind(item: ElementRef, kind: string) -> bool
hasKind(item: RelationshipRef, kind: string) -> bool
```

- `true` если `item.kind == kind` (exact match, case-sensitive).

## Резерв имён

Следующие имена зарезервированы в v1alpha1 и **не могут быть использованы** как user-defined let-переменные или в будущих extension'ах вне каталога:

- все имена функций этого документа;
- `item`, `items`, `rule`, `stats`, `diff`, `path`, `paths`, `from`, `to` (bindings).

Попытка использовать зарезервированное имя как `let`-переменную — ingest-level diagnostic `RF_EXPR_RESERVED_NAME` (добавляется в `diagnostics.md` при реализации).

## Связанные документы

- [`types.md`](types.md) — типы `ElementRef`, `RelationshipRef`, `DiffItem`, `PathRef`, `Stats`, `Rule`, enum-значения.
- [`expression-language.md`](expression-language.md) — syntax, bindings, null semantics, разрешённые конструкции.
