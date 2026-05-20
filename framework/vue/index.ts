import { createApp, type Component } from "vue";
import FrameworkVueSampleApp from "./app.js";

export { FrameworkVueSampleApp };

export function mountFrameworkVueSample(
  target: string | Element,
  component: Component = FrameworkVueSampleApp,
): void {
  const element = typeof target === "string" ? document.querySelector(target) : target;
  if (!element) {
    throw new Error("Target element not found for framework Vue sample app.");
  }
  createApp(component).mount(element);
}
