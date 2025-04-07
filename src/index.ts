import { LightDarkToggleElement, LightDarkChangeEvent } from "./lib";

window.customElements.define("light-dark-toggle", LightDarkToggleElement);

declare global {
  interface HTMLElementTagNameMap {
    "light-dark-toggle": LightDarkToggleElement;
  }
  interface HTMLElementEventMap {
    lightdarkchange: LightDarkChangeEvent;
  }
}

export { LightDarkToggleElement };
