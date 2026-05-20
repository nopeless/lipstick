import { defineComponent, h } from "vue";

export const FrameworkVueSampleApp = defineComponent({
  name: "FrameworkVueSampleApp",
  props: {
    message: { type: String, default: "Vue compatibility check OK" },
  },
  setup(props) {
    return () => h("div", { class: "framework-vue-sample" }, props.message);
  },
});

export default FrameworkVueSampleApp;
