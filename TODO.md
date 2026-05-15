# TODO

- [x] Step 1: split `src/demo.ts` into DOM wiring and schema-loading helpers.
- [x] Step 1 sanity check: run `typecheck` after the demo split.
- [x] Step 1b: extract numeric input helpers from `src/json-schema-form.ts`.
- [x] Step 1b sanity check: run `typecheck` after the helper extraction.
- [ ] Step 2: extract shared stylesheet rules from `src/base*.css` into a shared base layer.
- [ ] Step 2 sanity check: run `build` and confirm the CSS assets still copy correctly.
- [ ] Step 3: split `src/json-schema-form.ts` into focused render/state modules.
- [ ] Step 3 sanity check: run `typecheck` after the component split.
- [ ] Step 4: split `src/lib/schema.ts` into resolution, unions, and value-shaping helpers.
- [ ] Step 4 sanity check: run `typecheck` after the schema helper split.
- [ ] Step 5: add tests for schema/value helpers and mutation paths.
- [ ] Step 5 sanity check: run the test suite and final build.
