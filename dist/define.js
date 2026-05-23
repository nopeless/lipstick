import { LipstickFormElement } from "./lipstick-form.js";
import { defineConfigLipstick } from "./config.js";
import { validateValueAgainstSchema } from "./validation.js";
if (!customElements.get("lipstick-form")) {
    customElements.define("lipstick-form", LipstickFormElement);
}
export { LipstickFormElement, defineConfigLipstick, validateValueAgainstSchema };
