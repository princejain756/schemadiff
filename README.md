# schemadiff

Compare two JSON Schema documents and report which changes are breaking.

`schemadiff` is a small, dependency-free tool you can drop into CI: point it at
the schema you published last release and the one you are about to publish, and
it tells you whether existing clients still validate. Exit code `0` means the
change is backward compatible, `1` means it is not.

```
$ schemadiff examples/before.json examples/after.json
before: examples/before.json
after:  examples/after.json

breaking (6)
  ● required  property "email" became required
  ● properties.id.minLength  minLength tightened from 1 to 3
  ● properties.name.maxLength  maxLength tightened from 64 to 32
  ● properties.role.enum  values removed from enum, "guest" is no longer accepted
  ● properties.tags.maxItems  maxItems tightened from 10 to 5
  ● properties.tags.items.minLength  minLength constraint added, limit is now 1

non-breaking (1)
  ● properties.email  property "email" was added

7 changes: 6 breaking, 1 non-breaking — breaking changes present
```

## Install

```bash
npm install --save-dev schemadiff
```

Node 18 or newer. There are no runtime dependencies.

## CLI

```
schemadiff <before.json> <after.json> [options]

  --json              print a machine readable report
  --strict            treat every change as breaking
  --ignore <list>     comma separated rule ids to skip
  --no-color          disable colored output
  -h, --help          print usage
  -v, --version       print the version
```

Exit codes:

| Code | Meaning                                                |
| ---- | ------------------------------------------------------ |
| `0`  | the after schema is backward compatible                 |
| `1`  | breaking changes were found                             |
| `2`  | an input file could not be read or parsed               |

### In CI

Fail a pull request that breaks the published contract:

```yaml
- name: Check schema compatibility
  run: npx schemadiff schema/published.json schema/current.json
```

To allow non-breaking changes but never breaking ones, run it on the base branch
and compare against the working tree. To enforce a stricter policy where any
change at all needs review, add `--strict`.

### JSON output

`--json` prints a single object, suitable for `jq` or a bot comment:

```json
{
  "ok": false,
  "changes": [
    {
      "rule": "required",
      "path": "#/required",
      "severity": "breaking",
      "message": "property \"email\" became required",
      "after": "email"
    }
  ],
  "summary": { "total": 1, "breaking": 1, "nonBreaking": 0 }
}
```

`path` is a JSON pointer (RFC 6901) rooted at `#`, so a change to the minimum
length of `properties.id` is `#/properties/id/minLength`.

## API

```ts
import { compareSchemas, formatText, type JsonSchema } from 'schemadiff';

const before: JsonSchema = { type: 'object', required: ['id'] };
const after: JsonSchema = { type: 'object', required: ['id', 'email'] };

const result = compareSchemas(before, after);

result.ok;          // false
result.breaking;    // [ { rule: 'required', path: '#/required', ... } ]
result.nonBreaking; // []
result.changes;     // breaking ++ non-breaking, in report order

console.log(formatText(result));
```

### `compareSchemas(before, after, options?)`

| Option    | Type       | Default | Meaning                                     |
| --------- | ---------- | ------- | ------------------------------------------- |
| `strict`  | `boolean`  | `false` | Report every change as breaking              |
| `ignore`  | `string[]` | `[]`    | Rule ids to skip, e.g. `['bounds']`          |

### Result shape

```ts
interface CompareResult {
  changes: SchemaChange[];
  breaking: SchemaChange[];
  nonBreaking: SchemaChange[];
  ok: boolean; // true when nothing is breaking
}
```

## Rules

Each rule is an independent module in `src/rules/`, so a project with an unusual
contract can ignore the ones it disagrees with.

| Rule                   | Breaking when                                        | Non-breaking when                       |
| ---------------------- | ---------------------------------------------------- | --------------------------------------- |
| `type`                 | a type is narrowed, or a type is introduced           | a type union is widened or removed      |
| `properties`           | a property is removed and `additionalProperties` is `false` | a property is added, or removed from an open object |
| `required`             | a property becomes required                           | a property is no longer required        |
| `additionalProperties` | it tightens towards `false`                            | it loosens towards `true`               |
| `enum`                 | values are removed, or an enum is introduced          | values are added, or the enum is removed |
| `bounds`               | `minimum`, `minLength`, `minItems`, `minProperties` rise; `maximum`, `maxLength`, `maxItems`, `maxProperties` fall | the opposite direction |
| `items`                | items gain a schema                                    | items lose their schema                 |

The walk descends into `properties` and `items`, so nested changes are reported
at their own pointer. A removed property is only breaking for closed objects:
when `additionalProperties` is not `false`, a client sending the old payload is
still accepted, which is the distinction that makes the report useful rather
than alarmist.

Rules are conservative about what they do not model: `$ref` is not resolved, and
`allOf` / `anyOf` / `oneOf` are not merged. Compare already-composed schemas, or
inline the definitions first.

## Development

```bash
npm install
npm run typecheck   # tsc --noEmit
npm test            # build, then node --test
npm run build       # emit dist/
```

Tests use the built-in `node:test` runner, so there is no test framework to keep
current. Each stage of the project is a normal commit: rules are added as their
own modules, and the suite in `test/` grows with them.

## License

MIT. See [LICENSE](LICENSE).
