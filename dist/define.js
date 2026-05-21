import { LipstickFormElement } from "./lipstick-form.js";
if (!customElements.get("lipstick-form")) {
    customElements.define("lipstick-form", LipstickFormElement);
}
export * from "./lipstick-form.js";
export * from "./config.js";
export * from "./lib/validation.js";
