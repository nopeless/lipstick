import "../define.js";
import "./css/demo.css";
import type { JsonSchemaFormEventDetail, JsonValue } from "../index.js";
import { getDemoRefs } from "./dom.js";
import { getErrorMessage, loadDemoFixture, assertSchema, type DemoFixtureName } from "./data.js";
import type { JsonSchema } from "../index.js";
import { createInitialValue } from "../schema.js";

let value: JsonValue = null;

const refs = getDemoRefs();
const THEME_LINK_DATA_ATTR = "data-demo-theme";
const THEME_STORAGE_KEY = "lipstick-demo-theme";

const themeStyles = {
  none: undefined,
  "easy-eye": new URL("./css/theme-easy-eye.css", import.meta.url).href,
} as const;

type DemoTheme = keyof typeof themeStyles;

refs.schemaSourcePicker.value = "editor";
initializeThemePicker();
setStatus("Loading editor demo...");
void bootstrap();

wireEvents();

async function bootstrap() {
  await runWithStatus(
    () => loadSelectedDemo(refs.schemaSourcePicker.value as DemoFixtureName),
    "Loaded editor demo.",
  );
}

async function loadSelectedDemo(fixture: DemoFixtureName) {
  await runWithStatus(async () => {
    setStatus(`Loading ${fixture} demo...`);
    const example = await loadDemoFixture(fixture);
    applySchema(example.schema, example.value);
    refs.schemaSourcePicker.value = fixture;
  }, `Loaded ${fixture} demo.`);
}

function applySchema(nextSchema: JsonSchema, nextValue?: JsonValue) {
  value = nextValue !== undefined ? nextValue : createInitialValue(nextSchema);
  refs.form.schema = nextSchema;
  refs.form.value = value;
  refs.form.repair = true;
  refs.schemaJson.value = JSON.stringify(nextSchema, null, 2);
  autoSizeSchemaJson();
  updateOutput();
}

function updateOutput() {
  refs.output.textContent = JSON.stringify(value, null, 2);
}

function setStatus(message: string, isError = false) {
  refs.schemaStatus.textContent = message;
  refs.schemaStatus.style.color = isError ? "#b9381d" : "#6f6255";
}

async function loadSchemaFromUrl(rawUrl = refs.schemaUrlInput.value.trim()) {
  if (!rawUrl) {
    setStatus("Enter a schema URL first.", true);
    return;
  }

  await runWithStatus(async () => {
    setStatus("Loading schema...");
    const response = await fetch(rawUrl);

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    assertSchema(payload);
    applySchema(payload);
  }, "Loaded schema from URL.");
}

function applyPastedSchema(schemaText = refs.schemaJson.value) {
  runWithStatus(() => {
    const payload = JSON.parse(schemaText) as unknown;
    assertSchema(payload);
    applySchema(payload);
  }, "Applied pasted schema.");
}

function autoSizeSchemaJson() {
  refs.schemaJson.style.height = "auto";
  refs.schemaJson.style.height = `${refs.schemaJson.scrollHeight}px`;
}

function initializeThemePicker() {
  const desiredOptions: Array<{ value: DemoTheme; label: string }> = [
    { value: "none", label: "None" },
    { value: "easy-eye", label: "Easy Eye" },
  ];

  for (const option of desiredOptions) {
    if (refs.themePicker.querySelector(`option[value="${option.value}"]`)) {
      continue;
    }

    refs.themePicker.append(new Option(option.label, option.value));
  }

  const savedTheme = readPersistedTheme();
  refs.themePicker.value = savedTheme;
  applyTheme(savedTheme);
}

function applyTheme(theme: DemoTheme) {
  const existingThemeLink = document.head.querySelector<HTMLLinkElement>(
    `link[${THEME_LINK_DATA_ATTR}]`,
  );
  const stylesheetHref = themeStyles[theme];

  if (!stylesheetHref) {
    existingThemeLink?.remove();
    return;
  }

  const themeLink = existingThemeLink ?? document.createElement("link");
  themeLink.rel = "stylesheet";
  themeLink.setAttribute(THEME_LINK_DATA_ATTR, "true");
  themeLink.href = stylesheetHref;

  if (!existingThemeLink) {
    document.head.append(themeLink);
  }
}

function readPersistedTheme(): DemoTheme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return coerceTheme(stored);
  } catch {
    return "none";
  }
}

function persistTheme(theme: DemoTheme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage access errors in restricted contexts.
  }
}

function coerceTheme(value: string | null | undefined): DemoTheme {
  if (value && value in themeStyles) {
    return value as DemoTheme;
  }

  return "none";
}

function wireEvents() {
  refs.form.addEventListener("input", onFormInput);
  refs.schemaUrlInput.addEventListener("paste", onSchemaUrlPaste);
  refs.schemaUrlInput.addEventListener("change", () => {
    void loadSchemaFromUrl();
  });
  refs.schemaJson.addEventListener("paste", onSchemaJsonPaste);
  refs.schemaJson.addEventListener("change", () => {
    applyPastedSchema();
  });
  refs.schemaJson.addEventListener("input", autoSizeSchemaJson);
  refs.schemaSourcePicker.addEventListener("change", onSchemaSourceChange);
  refs.themePicker.addEventListener("change", onThemeChange);
  document.querySelector<HTMLButtonElement>('[data-role="scroll-top"]')?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function onFormInput(event: Event) {
  const detail = (event as CustomEvent<JsonSchemaFormEventDetail>).detail;
  if (!detail) {
    return;
  }

  value = detail.value;
  refs.form.value = value;
  updateOutput();
}

function onSchemaUrlPaste(event: ClipboardEvent) {
  const rawUrl = event.clipboardData?.getData("text/plain").trim();
  if (rawUrl) {
    void loadSchemaFromUrl(rawUrl);
  }
}

function onSchemaJsonPaste(event: ClipboardEvent) {
  const schemaText = event.clipboardData?.getData("text/plain");
  if (schemaText) {
    applyPastedSchema(schemaText);
  }
}

function onSchemaSourceChange(event: Event) {
  void loadSelectedDemo((event.target as HTMLSelectElement).value as DemoFixtureName);
}

function onThemeChange(event: Event) {
  const nextTheme = coerceTheme((event.target as HTMLSelectElement).value);
  refs.themePicker.value = nextTheme;
  applyTheme(nextTheme);
  persistTheme(nextTheme);
}

async function runWithStatus(operation: () => void | Promise<void>, successMessage: string) {
  try {
    await operation();
    setStatus(successMessage);
  } catch (error) {
    setStatus(getErrorMessage(error), true);
  }
}


