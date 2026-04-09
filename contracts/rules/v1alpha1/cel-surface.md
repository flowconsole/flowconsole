# Публичный CEL contract для RuleFile v1alpha1

## Scope

Этот документ фиксирует **публичный expression surface** для файлов правил FlowConsole v1alpha1.

Важно:

- пользователь пишет CEL только внутри RuleFile DSL;
- CEL не раскрывает внутренний executor;
- доступные bindings и helper functions определяет FlowConsole, а не underlying runtime;
- этот документ описывает authoring contract, а не внутреннюю реализацию expression engine.

## Где CEL разрешён

CEL разрешён только в следующих полях:

- `selector.where`;
- `rule.where`;
- `rule.let`;
- `rule.assert`.

Во всех остальных полях CEL запрещён.

## Общие принципы вычисления

- `selector.where` вычисляется в контексте одной candidate-сущности;
- `rule.where` вычисляется в контексте правила после применения selector-а;
- `rule.let` вычисляется до `rule.assert`;
- значения из `rule.let` доступны в `rule.assert` и `message`;
- `message` не является CEL-выражением, но может интерполировать `${...}` из доступных bindings и `let`.

## Bindings

### Общий binding для `selector.where`

- `item` — текущая candidate-сущность, проходящая через selector.

### graph

#### `mode = perItem`

- `item` — текущий выбранный элемент или связь;
- `rule` — metadata текущего правила.

#### `mode = aggregate`

- `items` — список выбранных сущностей;
- `stats` — агрегированная статистика по выборке;
- `rule` — metadata текущего правила.

### path

#### `mode = perPath`

- `path` — текущий путь;
- `paths` — список найденных путей;
- `from` — множество исходных сущностей;
- `to` — множество целевых сущностей;
- `stats` — агрегированная статистика по путям;
- `rule` — metadata текущего правила.

#### `mode = aggregate`

- `paths` — список найденных путей;
- `from` — множество исходных сущностей;
- `to` — множество целевых сущностей;
- `stats` — агрегированная статистика по путям;
- `rule` — metadata текущего правила.

### diff

#### `mode = perItem`

- `item` — текущий diff item;
- `diff` — summary объекта diff projection;
- `stats` — агрегированная статистика по diff view;
- `rule` — metadata текущего правила.

#### `mode = aggregate`

- `items` — список выбранных diff items;
- `diff` — summary объекта diff projection;
- `stats` — агрегированная статистика по diff view;
- `rule` — metadata текущего правила.

## Public helper functions

Функции ниже являются частью публичного contract слоя.

### Коллекции и агрегаты

- `count(value)`;
- `distinct(value)`;
- `exists(collection, predicate)`;
- `all(collection, predicate)`;
- `any(collection, predicate)`;
- `none(collection, predicate)`.

### Навигация по графу

- `incoming(nodeOrItem)`;
- `outgoing(nodeOrItem)`;
- `neighbors(nodeOrItem)`.

### Работа с diff

- `changed(item)`;
- `before(item)`;
- `after(item)`.

### Удобные predicates

- `hasTag(nodeOrItem, tag)`;
- `hasKind(nodeOrItem, kind)`.

## Типовые ожидания по типам

- `selector.where` должен возвращать `bool`;
- `rule.where` должен возвращать `bool`;
- `rule.assert` должен возвращать `bool`;
- `rule.let.*` может возвращать scalar, list или object, разрешённый FlowConsole CEL environment.

## Ограничения v1alpha1

- никаких пользовательских функций;
- никаких imports/includes;
- никакого filesystem/network/time access;
- никаких side effects;
- никакого доступа к внутренним executor APIs;
- неизвестные bindings/functions должны приводить к expression diagnostic.

## Примеры

### `selector.where`

```cel
hasKind(item, "Service") && hasTag(item, "critical")
```

### `rule.let`

```cel
count(neighbors(item))
```

### `rule.assert`

```cel
count(items) == 0
```

### `path` rule assert

```cel
count(paths) > 0
```
