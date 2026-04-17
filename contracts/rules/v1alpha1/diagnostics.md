# Diagnostics contract для RuleFile v1alpha1

## Формат diagnostic

Каждый diagnostic имеет следующий shape:

```json
{
  "code": "RF_SCHEMA_INVALID_ENUM_VALUE",
  "phase": "schema",
  "level": "error",
  "path": "/rules/0/target",
  "sourceRange": {
    "start": { "line": 5, "column": 13, "offset": 148 },
    "end":   { "line": 5, "column": 20, "offset": 155 }
  },
  "message": "Поле target содержит недопустимое значение 'runtime'.",
  "hint": "Используйте одно из: model, actual, diff.",
  "ruleId": "no-shared-db"
}
```

## Поля

- `code: string` — стабильный код ошибки или предупреждения (см. каталог ниже);
- `phase: "parse" | "schema" | "semantic" | "expression" | "normalize" | "runtime"` — фаза, на которой найдено нарушение;
- `level: "error" | "warning"` — severity самого diagnostic;
- `path: string` — **JSON Pointer (RFC 6901)** до проблемного узла в canonical JSON-like представлении документа (например, `/rules/0/assert`, `/rules/2/subject/kinds/1`);
- `sourceRange?: SourceRange` — привязка к исходному тексту YAML/JSON (заполняется parse-фазой, пробрасывается через все фазы);
- `message: string` — human-readable сообщение;
- `hint?: string` — короткая подсказка по исправлению;
- `ruleId?: string` — id правила, если ошибка относится к конкретному rule.

### SourceRange

```
SourceRange:
  start: { line: int, column: int, offset: int }
  end?:  { line: int, column: int, offset: int }
```

- `line` / `column` — 1-based;
- `offset` — 0-based byte offset от начала документа;
- `end` опционально; если отсутствует — range = точка (`start` only).

## Namespaces кодов

- `RF_PARSE_*` — syntax/parse ошибки YAML/JSON;
- `RF_SCHEMA_*` — JSON Schema ошибки;
- `RF_SEM_*` — semantic ограничения поверх schema;
- `RF_EXPR_*` — Rule Expressions compile / type-check ошибки;
- `RF_NORM_*` — normalize / canonicalization ошибки;
- `RE_*` — runtime ошибки (RuleExecutionError), возникают при исполнении правила, не на ingest-фазе.

## Seed каталог кодов v1alpha1

Минимально обязательные коды v1alpha1. Список может расширяться в последующих версиях без breaking changes (новые коды допустимы в рамках того же `apiVersion`).

### Parse phase

| Code | Описание |
|---|---|
| `RF_PARSE_YAML_SYNTAX_ERROR` | файл не удалось распарсить как YAML или JSON |
| `RF_PARSE_INVALID_DOCUMENT_TYPE` | корневой документ не является mapping/object |
| `RF_PARSE_UNSUPPORTED_API_VERSION` | значение `apiVersion` не поддерживается текущей версией |
| `RF_PARSE_UNSUPPORTED_KIND` | значение `kind` не равно `RuleFile` |
| `RF_PARSE_CANONICAL_CONVERSION_FAILED` | документ не удалось привести к canonical JSON-like object |

### Schema phase

| Code | Описание |
|---|---|
| `RF_SCHEMA_MISSING_REQUIRED_FIELD` | отсутствует обязательное поле |
| `RF_SCHEMA_INVALID_ENUM_VALUE` | значение поля не входит в enum |
| `RF_SCHEMA_TYPE_MISMATCH` | тип значения не соответствует ожидаемому |
| `RF_SCHEMA_UNKNOWN_FIELD` | объект содержит неизвестное поле (в strict-режиме) |
| `RF_SCHEMA_EMPTY_ARRAY` | пустой массив там, где он запрещён (например, `rules: []`, `selector.kinds: []`) |
| `RF_SCHEMA_FAMILY_SHAPE_VIOLATION` | правило не удовлетворяет family-specific shape constraints |

### Semantic phase

| Code | Описание |
|---|---|
| `RF_SEM_DUPLICATE_RULE_ID` | `rule.id` не уникален в рамках файла |
| `RF_SEM_DIFFITEMS_ON_NON_DIFF_TARGET` | `entity=diffItems` используется вне `target=diff` |
| `RF_SEM_CHANGEKINDS_ON_NON_DIFF_TARGET` | `changeKinds` указано при `target!=diff` |
| `RF_SEM_SOURCE_FAMILY_ON_MODEL_TARGET` | `sourceFamilies` указаны при `target=model` |
| `RF_SEM_FLOW_ENDPOINT_INVALID_ENTITY` | flow rule: `from` или `to` содержит `entity!=elements` |
| `RF_SEM_SELECTOR_SHAPE_INCOMPATIBLE` | selector shape несовместим с выбранным `kind` |
| `RF_SEM_LET_SELF_REFERENCE` | `let`-переменная ссылается на саму себя |

### Expression phase

| Code | Описание |
|---|---|
| `RF_EXPR_COMPILE_ERROR` | синтаксическая ошибка в выражении |
| `RF_EXPR_UNKNOWN_BINDING` | выражение использует неизвестный binding |
| `RF_EXPR_UNKNOWN_HELPER` | выражение вызывает неизвестную helper-функцию |
| `RF_EXPR_UNSUPPORTED_CONSTRUCT` | конструкция вне разрешённого subset'а (см. `expression-language.md` § Разрешённые и запрещённые конструкции) |
| `RF_EXPR_NON_BOOLEAN_ASSERT` | `assert` или `where` не возвращает `bool` |
| `RF_EXPR_SIGNATURE_MISMATCH` | типы аргументов helper-функции не совпадают с сигнатурой |
| `RF_EXPR_TYPE_MISMATCH` | несовместимые типы операндов бинарного оператора |
| `RF_EXPR_HETEROGENEOUS_COLLECTION` | элементы collection literal имеют несовместимые типы |
| `RF_EXPR_REGEX_UNSUPPORTED_FEATURE` | regex использует запрещённые RE2 features (backreferences, lookaround, и т.д.) |
| `RF_EXPR_MESSAGE_UNKNOWN_BINDING` | interpolation `${...}` в `message` ссылается на неизвестный binding |
| `RF_EXPR_SHADOWED_BINDING` | lambda-параметр затеняет binding или let-переменную |
| `RF_EXPR_RESERVED_NAME` | let-переменная использует зарезервированное имя (helper, binding) |
| `RF_EXPR_LET_DEPENDENCY_CYCLE` | цикл в зависимостях let-переменных |

### Normalize phase

| Code | Описание |
|---|---|
| `RF_NORM_CANONICAL_KEY_CONFLICT` | два правила дают одинаковый canonical key (`filePath#ruleId`) |
| `RF_NORM_DEFAULTS_CONFLICT` | implicit defaults конфликтуют с shape rules family |
| `RF_NORM_IR_ASSEMBLY_FAILED` | NormalizedRule IR не удалось собрать из valid RuleFile |

### Runtime phase

Runtime-коды возникают при исполнении правила, не на ingest-фазе. Фиксируются в контракте, чтобы обеспечить стабильность сообщений об ошибках исполнения.

| Code | Описание |
|---|---|
| `RE_SUBJECT_TOO_LARGE` | subject set правила превысил `MAX_SUBJECT_SIZE` |
| `RE_EXPRESSION_BUDGET_EXCEEDED` | iteration budget одного evaluation выражения исчерпан |
| `RE_EXPRESSION_TIMEOUT` | wall-clock timeout одного evaluation выражения |
| `RE_EXPRESSION_NULL_ORDER` | порядковое сравнение (`<`, `>`, `<=`, `>=`) с `null` |
| `RE_EXPRESSION_NULL_ARITHMETIC` | арифметическая операция с `null` |
| `RE_PATH_ENDPOINTS_EMPTY` | `path.from` или `path.to` матчит ноль элементов в runtime |
| `RE_DIFF_SNAPSHOT_MISSING` | для `diff`-rule'а не найден актуальный `DriftSnapshot` |

## Рекомендации по поведению

- `parse` и `schema` ошибки считаются blocking для всего файла — последующие фазы не запускаются;
- `semantic`, `expression`, `normalize` ошибки должны по возможности содержать `ruleId`;
- `warning` level допустим только для деградаций, которые не делают rule unusable;
- если правило не может быть скомпилировано или нормализовано, оно не должно попадать в execution stage;
- runtime-ошибки (`RE_*`) не прерывают весь `ValidationRun` — другие правила продолжают исполняться; упавшее правило записывает `RuleExecutionError` в result-сет.

## Примеры

### Duplicate rule id

```json
{
  "code": "RF_SEM_DUPLICATE_RULE_ID",
  "phase": "semantic",
  "level": "error",
  "path": "/rules/1/id",
  "sourceRange": {
    "start": { "line": 18, "column": 7, "offset": 412 },
    "end":   { "line": 18, "column": 20, "offset": 425 }
  },
  "message": "Идентификатор правила 'duplicate-id' уже используется в этом файле.",
  "hint": "Сделайте rule.id уникальным в рамках RuleFile.",
  "ruleId": "duplicate-id"
}
```

### Invalid target value

```json
{
  "code": "RF_SCHEMA_INVALID_ENUM_VALUE",
  "phase": "schema",
  "level": "error",
  "path": "/rules/0/target",
  "sourceRange": {
    "start": { "line": 5, "column": 13, "offset": 148 }
  },
  "message": "Поле target содержит недопустимое значение 'runtime'.",
  "hint": "Используйте одно из: model, actual, diff.",
  "ruleId": "invalid-target"
}
```

### Unsupported construct in expression

```json
{
  "code": "RF_EXPR_UNSUPPORTED_CONSTRUCT",
  "phase": "expression",
  "level": "error",
  "path": "/rules/3/assert",
  "sourceRange": {
    "start": { "line": 52, "column": 13, "offset": 1247 },
    "end":   { "line": 52, "column": 48, "offset": 1282 }
  },
  "message": "Конструкция 'items.all(x, ...)' не поддерживается. Используйте 'all(items, x -> ...)'.",
  "hint": "См. expression-language.md § Разрешённые и запрещённые конструкции.",
  "ruleId": "bad-macro"
}
```

### Incomplete expression

```json
{
  "code": "RF_EXPR_COMPILE_ERROR",
  "phase": "expression",
  "level": "error",
  "path": "/rules/3/assert",
  "sourceRange": {
    "start": { "line": 48, "column": 13, "offset": 1102 }
  },
  "message": "Выражение не компилируется: unexpected end of input.",
  "hint": "Проверьте синтаксис assert expression.",
  "ruleId": "bad-expression"
}
```

### Runtime: subject too large

```json
{
  "code": "RE_SUBJECT_TOO_LARGE",
  "phase": "runtime",
  "level": "error",
  "path": "/rules/0/subject",
  "message": "Subject set правила 'too-broad' содержит 124 503 элементов, что превышает MAX_SUBJECT_SIZE=50000.",
  "hint": "Сузьте селектор: добавьте kinds, tags, sourceFamilies или более конкретный where.",
  "ruleId": "too-broad"
}
```

## Связанные документы

- [`expression-language.md`](expression-language.md) — контекст для `RF_EXPR_*` и `RE_EXPRESSION_*` кодов, включая разрешённые/запрещённые конструкции;
- [`helpers.md`](helpers.md) — каталог функций, отсутствие которых даёт `RF_EXPR_UNKNOWN_HELPER`;
- [`types.md`](types.md) — типовая иерархия, несоответствия которой дают `RF_EXPR_TYPE_MISMATCH` / `RF_EXPR_SIGNATURE_MISMATCH`.
