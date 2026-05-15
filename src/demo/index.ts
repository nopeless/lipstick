import '../define.js'
import './css/demo.css'
import { buildInitialValue } from '../lib/schema.js'
import type { JsonSchemaFormEventDetail, JsonValue } from '../index.js'
import { getDemoRefs } from './dom.js'
import {
  getErrorMessage,
  loadDemoFixture,
  assertSchema,
  type DemoFixtureName,
} from './data.js'
import type { JsonSchema202012 } from '../index.js'

let value: JsonValue = null

const refs = getDemoRefs()

refs.schemaSourcePicker.value = 'editor'
setStatus('Loading editor demo...')
void bootstrap()

refs.form.addEventListener('input', (event: Event) => {
  const detail = (event as CustomEvent<JsonSchemaFormEventDetail>).detail
  if (!detail) {
    return
  }

  value = detail.value
  refs.form.value = value
  updateOutput()
})

refs.schemaUrlInput.addEventListener('paste', (event: ClipboardEvent) => {
  const rawUrl = event.clipboardData?.getData('text/plain').trim()
  if (rawUrl) {
    void loadSchemaFromUrl(rawUrl)
  }
})

refs.schemaUrlInput.addEventListener('change', () => {
  void loadSchemaFromUrl()
})

refs.schemaJson.addEventListener('paste', (event: ClipboardEvent) => {
  const schemaText = event.clipboardData?.getData('text/plain')
  if (schemaText) {
    applyPastedSchema(schemaText)
  }
})

refs.schemaJson.addEventListener('change', () => {
  applyPastedSchema()
})

refs.schemaSourcePicker.addEventListener('change', (event: Event) => {
  void loadSelectedDemo((event.target as HTMLSelectElement).value as DemoFixtureName)
})

async function bootstrap() {
  try {
    await loadSelectedDemo(refs.schemaSourcePicker.value as DemoFixtureName)
    setStatus('Loaded editor demo.')
  } catch (error) {
    setStatus(getErrorMessage(error), true)
  }
}

async function loadSelectedDemo(fixture: DemoFixtureName) {
  try {
    setStatus(`Loading ${fixture} demo...`)
    const example = await loadDemoFixture(fixture)
    applySchema(example.schema, example.value)
    refs.schemaSourcePicker.value = fixture
    setStatus(`Loaded ${fixture} demo.`)
  } catch (error) {
    setStatus(getErrorMessage(error), true)
  }
}

function applySchema(nextSchema: JsonSchema202012, nextValue?: JsonValue) {
  value =
    nextValue !== undefined
      ? nextValue
      : buildInitialValue(nextSchema, nextSchema)
  refs.form.schema = nextSchema
  refs.form.value = value
  refs.schemaJson.value = JSON.stringify(nextSchema, null, 2)
  updateOutput()
}

function updateOutput() {
  refs.output.textContent = JSON.stringify(value, null, 2)
}

function setStatus(message: string, isError = false) {
  refs.schemaStatus.textContent = message
  refs.schemaStatus.style.color = isError ? '#b9381d' : '#6f6255'
}

async function loadSchemaFromUrl(rawUrl = refs.schemaUrlInput.value.trim()) {
  if (!rawUrl) {
    setStatus('Enter a schema URL first.', true)
    return
  }

  try {
    setStatus('Loading schema...')
    const response = await fetch(rawUrl)

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`)
    }

    const payload = (await response.json()) as unknown
    assertSchema(payload)
    applySchema(payload)
    setStatus('Loaded schema from URL.')
  } catch (error) {
    setStatus(getErrorMessage(error), true)
  }
}

function applyPastedSchema(schemaText = refs.schemaJson.value) {
  try {
    const payload = JSON.parse(schemaText) as unknown
    assertSchema(payload)
    applySchema(payload)
    setStatus('Applied pasted schema.')
  } catch (error) {
    setStatus(getErrorMessage(error), true)
  }
}
