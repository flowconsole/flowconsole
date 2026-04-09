# Diagnostics contract для RuleFile v1alpha1

## Формат diagnostic

Каждый diagnostic имеет следующий shape:

```json
{
  "code": "RF_SCHEMA_002",
  "phase": "schema",
  "level": "error",
  "path": "/rules/0/target",
  "message": "Поле target содержит недопустимое значение.",
  "hint": "Используйте одно из: declared, observed, diff.",
  "ruleId": "no-shared-db"
}
```

## Поля

- `code: string` — стабильный код ошибки или предупреждения;
- `phase: "parse" | "schema" | "semantic" | "expression" | "normalize"` — фаза, на которой найдено нарушение;
- `level: "error" | "warning"` — severity самого diagnostic;
- `path: string` — JSON Pointer или эквивалентный path до проблемного узла;
- `message: string` — human-readable сообщение;
- `hint?: string` — короткая подсказка по исправлению;
- `ruleId?: string` — id правила, если ошибка относится к конкретному rule.

## Namespaces кодов

- `RF_PARSE_*` — syntax/parse ошибки YAML/JSON;
- `RF_SCHEMA_*` — JSON Schema ошибки;
- `RF_SEM_*` — semantic ограничения поверх schema;
- `RF_EXPR_*` — CEL compile/type-check ошибки;
- `RF_NORM_*` — normalize/canonicalization ошибки.

## Минимальный каталог кодов v1alpha1

### Parse

- `RF_PARSE_001` — файл не удалось распарсить как YAML/JSON;
- `RF_PARSE_002` — корневой документ не является object;
- `RF_PARSE_003` — документ не удалось привести к canonical JSON-like object.

### Schema

- `RF_SCHEMA_001` — отсутствует обязательное поле;
- `RF_SCHEMA_002` — поле содержит недопустимое enum значение;
- `RF_SCHEMA_003` — поле имеет неверный тип;
- `RF_SCHEMA_004` — объект содержит неизвестное поле;
- `RF_SCHEMA_005` — массив `rules` пуст;
- `RF_SCHEMA_006` — правило не удовлетворяет family-specific shape constraints.

### Semantic

- `RF_SEM_001` — `rule.id` не уникален в рамках файла;
- `RF_SEM_002` — `graph` rule использует `entity=diffItems`;
- `RF_SEM_003` — `diff` rule требует `target=diff`;
- `RF_SEM_004` — `path` rule использует не-element selector в `from` или `to`;
- `RF_SEM_005` — `sourceFamilies` недопустимы для `target=declared`;
- `RF_SEM_006` — selector shape несовместим с выбранным `kind`.

### Expression

- `RF_EXPR_001` — CEL выражение не компилируется;
- `RF_EXPR_002` — `selector.where` или `rule.where` не возвращает boolean;
- `RF_EXPR_003` — `assert` не возвращает boolean;
- `RF_EXPR_004` — выражение использует неизвестный binding или helper function;
- `RF_EXPR_005` — `let` не может быть вычислен в текущем CEL environment.

### Normalize

- `RF_NORM_001` — canonical rule key не удалось сформировать;
- `RF_NORM_002` — implicit defaults конфликтуют с shape rules family;
- `RF_NORM_003` — normalized IR не удалось собрать из valid RuleFile.

## Рекомендации по поведению

- `parse` и `schema` ошибки считаются blocking для всего файла;
- `semantic`, `expression` и `normalize` ошибки должны по возможности содержать `ruleId`;
- `warning` допустим только для деградаций, которые не делают rule unusable;
- если правило не может быть скомпилировано или нормализовано, оно не должно попадать в execution stage.

## Примеры

### Duplicate rule id

```json
{
  "code": "RF_SEM_001",
  "phase": "semantic",
  "level": "error",
  "path": "/rules/1/id",
  "message": "Идентификатор правила 'duplicate-id' уже используется в этом файле.",
  "hint": "Сделайте rule.id уникальным в рамках RuleFile.",
  "ruleId": "duplicate-id"
}
```

### Invalid target value

```json
{
  "code": "RF_SCHEMA_002",
  "phase": "schema",
  "level": "error",
  "path": "/rules/0/target",
  "message": "Поле target содержит недопустимое значение 'runtime'.",
  "hint": "Используйте одно из: declared, observed, diff.",
  "ruleId": "invalid-target"
}
```

### Invalid CEL expression

```json
{
  "code": "RF_EXPR_001",
  "phase": "expression",
  "level": "error",
  "path": "/rules/3/assert",
  "message": "CEL выражение не компилируется: unexpected end of input.",
  "hint": "Проверьте синтаксис assert expression.",
  "ruleId": "bad-expression"
}
```
