# Conformance Test Fixtures — v1alpha1

Каталог содержит golden-фикстуры для conformance suite, который проверяет, что любой executor Rule Expressions даёт одинаковый output на одинаковом input.

## Назначение

- **Contract arbiter:** расхождение executor'а с ожидаемым output = дефект реализации executor'а, не специки.
- **Executor-agnostic:** фикстуры не опираются ни на один конкретный runtime. Описывают input/expected output в терминах публичной спеки (типов из `types.md`, helpers из `helpers.md`).
- **Regression guard:** при изменениях в спеке фикстуры обновляются осознанно; "молчаливые" изменения поведения отлавливаются этим suite'ом.

## Структура

```
conformance/
├── README.md                      — этот файл
├── ingest/                        — кейсы для ingest pipeline (parse → normalize)
│   ├── valid/                     — ожидается успешная нормализация
│   │   ├── <case>.yaml            — rule file
│   │   └── <case>.expected.json   — ожидаемая NormalizedRule проекция (stable shape)
│   └── invalid/                   — ожидаются diagnostics
│       ├── <case>.yaml
│       └── <case>.expected.json   — { diagnostics: [{ code, phase, path, ... }] }
└── expressions/                   — кейсы для отдельных выражений
    ├── <case>.input.json          — { expression, bindings, typeHints }
    └── <case>.expected.json       — { ok: true, value } | { ok: false, code }
```

## Invariants conformance harness'а

1. Каждый `.input.*` файл должен иметь парный `.expected.*`.
2. `.expected.json` для успешных кейсов — каноническая JSON проекция результата (stable key order, no timestamps, no executor-specific fields).
3. `.expected.json` для failing кейсов — список diagnostics **sorted by `(path, code)`** (detеrministic ordering).
4. Фикстуры не должны зависеть от wall-clock или internal executor state.

## Покрытие v1alpha1 (target для Slice 0)

- **Ingest valid:** минимум один кейс на каждую family (`graph`, `path`, `diff`) × каждый mode × sample helpers × message interpolation.
- **Ingest invalid:** минимум один кейс на каждый код из `diagnostics.md` в группах `RF_SCHEMA_*`, `RF_SEM_*`, `RF_EXPR_*`, `RF_NORM_*`.
- **Expressions:** минимум один positive + один negative кейс на каждый helper из `helpers.md`, каждую разрешённую конструкцию из `expression-language.md` § Разрешённые и запрещённые конструкции, и каждое ключевое правило null semantics.

Итого: **≥ 50 фикстур** для slice 0 acceptance criteria.

## Соглашение о bindings в expression-кейсах

`input.json`:

```json
{
  "expression": "count(items) > 0",
  "bindings": {
    "items": [
      { "id": "svc-1", "kind": "Service", "name": "checkout", "tags": [], "properties": {}, "source": "code_scan", "sourceFamily": "code" }
    ]
  },
  "context": {
    "family": "graph",
    "mode": "aggregate"
  }
}
```

`expected.json` (success):

```json
{
  "ok": true,
  "value": true
}
```

`expected.json` (failure):

```json
{
  "ok": false,
  "code": "RE_EXPRESSION_NULL_ORDER"
}
```

## Статус

Этот каталог в v1alpha1 slice 0 содержит README и базовую структуру. Заполнение seed-фикстурами — часть acceptance criteria slice 0 (≥ 50 кейсов). Фикстуры пишутся после того, как JSON Schema, expression-language.md, helpers.md, types.md зафиксированы (что сделано).

## Связанные документы

- [`../expression-language.md`](../expression-language.md)
- [`../helpers.md`](../helpers.md)
- [`../types.md`](../types.md)
- [`../diagnostics.md`](../diagnostics.md)
