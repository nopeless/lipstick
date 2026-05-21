<template>
  <main class="app">
    <h1>Vue SFC Sample</h1>
    <p>Using local import from this repo via relative path.</p>
    <Lipstick v-model="value" :schema="schema" name="demo-form" />
    <pre class="output">{{ value }}</pre>
  </main>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Lipstick } from "../../../src/vue/index.ts";

const schema = {
  type: "object",
  title: "Point",
  required: ["x", "y"],
  properties: { x: { type: "number" }, y: { type: "number" } },
  additionalProperties: false,
} as const;

const value = ref({});
</script>

<style>
@import "../../../src/base-shared.css";

.app {
  font-family:
    ui-sans-serif,
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    Helvetica,
    Arial,
    sans-serif;
  padding: 24px;
}
</style>
