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
import { Type } from "typebox";

const schema = Type.Object(
  {
    name: Type.String(),
    age: Type.Number(),
  },
  {
    title: "Person",
  },
);

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
