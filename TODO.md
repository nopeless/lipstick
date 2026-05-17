# Redundant Nested HTML Unnesting

- [x] `renderUnionField`: removed redundant wrapper around `renderUnionBranch(...)`.
- [x] `renderScalarControl` (range): removed `.lipstick-range` wrapper with a single child.
- [x] `renderObjectField` (unframed mode): removed redundant `<section>` wrapper and returned body directly.
- [x] `renderArrayField` (unframed mode): removed redundant `<section>` wrapper and returned body directly.
- [x] `renderObjectBody`: removed outer `<div>` wrapper that only grouped mapped children.
- [x] `renderInlineSimpleField`: removed inner `[data-lipstick-inline-row]` wrapper and moved the attribute to `<section>`.
- [x] CSS follow-up: ensured inline field validation/description `<p>` spans all grid columns after wrapper removal.

- [ ] `renderObjectProperty`: inline this pass-through helper if we want one more flattening step in call structure.
- [x] `renderArrayItem` (simple): removed `[data-lipstick-input]` wrapper and kept shared grid contract.
- [x] `renderAdditionalPropertyComposer`: removed `[data-lipstick-input]` wrapper while keeping `[data-lipstick-composer]` layout.
- [x] `renderInlineSimpleField`: removed `[data-lipstick-input]` wrapper and place control as direct grid child.
- [x] CSS follow-up: switched middle-column targeting from `[data-lipstick-input]` to direct non-controls child selector.
