import { DarkModeToggleElement, DarkModeChangeEvent } from "./lib";

window.customElements.define("dark-mode-toggle", DarkModeToggleElement);

declare global {
  interface HTMLElementTagNameMap {
    "dark-mode-toggle": DarkModeToggleElement;
  }
  interface HTMLElementEventMap {
    darkmodechange: DarkModeChangeEvent;
  }
}

export { DarkModeToggleElement };
