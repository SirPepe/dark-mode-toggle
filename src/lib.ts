import {
  init,
  attr,
  prop,
  reactive,
  string,
  subscribe,
  getInternals,
  literal,
  bool,
  debounce,
  enhance,
} from "@sirpepe/ornament";

type Mode = "light" | "dark";
type ModeSelection = "light" | "dark" | "auto";
const QUERY: unique symbol = Symbol.for("LightDarkToggleElementQuery");

export class DarkModeChangeEvent extends Event {
  readonly mode: Mode;
  readonly auto: boolean;
  constructor(mode: Mode, auto: boolean) {
    super("darkmodechange", {
      bubbles: true,
      composed: true,
      cancelable: false,
    });
    this.mode = mode;
    this.auto = auto;
  }
}

// Custom transformer that accepts a list of strings
function strings<T extends object, V extends string>(values: V[]) {
  return literal<T, V, string>({ transform: string(), values });
}

// Helper for subscribing to events on the element's shadow root
function root(instance: DarkModeToggleElement): ShadowRoot {
  return getInternals(instance).shadowRoot!; // we know it's there, come on!
}

@enhance()
export class DarkModeToggleElement extends HTMLElement {
  #root = this.attachShadow({ mode: "open", delegatesFocus: true });
  [QUERY]: MediaQueryList;

  // True when the element's value has been interacted with by means other than
  // setting the attribute (mirrors "value" on <input>). This involves the user
  // changing the  hidden checkbox (which is what @subscribe tracks) as well as
  // the "mode" setter, which adjusts this value manually as a side effect.
  // Must be a prop because even a no-op may cause the dirty flag to change and
  // require UI updates.
  @subscribe(root, "change", { transform: () => true })
  @prop(bool())
  accessor #dirtyFlag: boolean = false;

  // Tracks the dark mode according to the browser/system preferences. If the
  // user has not made any explicit choice via the UI and the attribute "mode"
  // is not set to either "dark" or "light", this value determines the current
  // mode.
  @subscribe((el) => el[QUERY], "change", {
    transform: (_, el) => (el[QUERY].matches ? "dark" : "light"),
  })
  @prop(strings(["light", "dark"] as const))
  accessor #auto: Mode = this[QUERY].matches ? "dark" : "light";

  // Tracks the choice of mode according to the "mode" attribute. If this
  // attribute's value is not "auto" and the user has not made any explicit
  // choice via the UI, this attribute determines the current mode. Uses a
  // private backend because a custom getter/setter facade is needed.
  @attr(strings(["light", "dark", "auto"] as const), { as: "mode" })
  accessor #attr: ModeSelection = "auto";

  // Tracks the user's choice via the UI. If not set to auto, this determines
  // the current mode (beating all other inputs)
  @subscribe(root, "change", {
    transform: (e: any): ModeSelection => (e.target.checked ? "dark" : "light"),
  })
  @prop(strings(["light", "dark", "auto"] as const))
  accessor #user: ModeSelection = "auto";

  // Computes the current light/dark mode and whether the current mode was
  // chosen deliberately by the user
  #computeMode(): { mode: Mode; auto: boolean } {
    if (this.#user !== "auto") {
      return { mode: this.#user, auto: false };
    }
    if (this.#attr !== "auto" && !this.#dirtyFlag) {
      return { mode: this.#attr, auto: false };
    }
    return { mode: this.#auto, auto: true };
  }

  // Facade for the "mode" attribute
  get mode(): Mode {
    return this.#computeMode().mode;
  }

  // Facade for the "mode" attribute with type checks and dirty flag management
  set mode(newValue: string) {
    newValue = String(newValue).trim().toLowerCase();
    if (["dark", "light", "auto"].includes(newValue)) {
      this.#user = newValue as ModeSelection;
      this.#dirtyFlag = true;
    } else {
      throw new TypeError(
        `"newValue" is an invalid value (valid: "dark", "light", "auto")`
      );
    }
  }

  // Readonly property
  get auto() {
    return this.#computeMode().auto;
  }

  // Tracks the previous mode in order to help decide whether setting a mode
  // should cause an event to be dispatched.
  #lastMode = this.#computeMode();

  // React to changes to the "mode" attribute and to "change" events on the
  // media query to update the computed mode and fire the event.
  @init()
  @reactive()
  @debounce()
  #handleChange() {
    const internals = getInternals(this);
    const { mode, auto } = this.#computeMode();
    if (mode !== this.#lastMode.mode) {
      this.#lastMode = { mode, auto };
      this.dispatchEvent(new DarkModeChangeEvent(mode, auto));
    }
    if (mode === "light") {
      internals.states.add("light");
      internals.states.delete("dark");
      internals.shadowRoot!.querySelector("input")!.checked = false;
    } else {
      internals.states.delete("light");
      internals.states.add("dark");
      internals.shadowRoot!.querySelector("input")!.checked = true;
    }
    if (auto) {
      internals.states.add("auto");
      internals.shadowRoot!.querySelector("input")!.indeterminate = true;
    } else {
      internals.states.delete("auto");
      internals.shadowRoot!.querySelector("input")!.indeterminate = false;
    }
  }

  // Only needs to run once to draw the default UI
  render() {
    this.#root.innerHTML = `<label>
  <input type="checkbox">
  <slot>
    <span class="defaultUi">
      <span class="lightIcon">☀️</span>
      <span class="toggle"></span>
      <span class="darkIcon">🌙</span>
    </span>
  </slot>
</label>
<style>
  :host {
    display: inline-block;
    --accent: var(--light-dark-toggle-accent-color, rebeccapurple);
  }
  *, *::before, *::after {
    box-sizing: border-box;
  }
  label {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  input {
    position: absolute;
    top: -10em;
    left: -10em;
  }
  .defaultUi {
    width: 6em;
    height: 1em;
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 0.5em;
    .lightIcon, .darkIcon {
      transition: all 500ms;
      filter: saturate(0) opacity(0.7);
    }
    .toggle {
      position: relative;
      border: 2px solid currentColor;
      border-radius: 1em;
      &::before {
        content: "";
        width: 0.8em;
        height: 0.8em;
        background: currentColor;
        position: absolute;
        top: 0.1em;
        left: 0.1em;
        border-radius: 50%;
        transition: all 500ms;
        opacity: 1;
      }
      &::after {
        font: inherit;
        font-size: 0.5em;
        content: "Auto";
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        transition: all 500ms;
        opacity: 0;
      }
    }
  }
  :host(:state(light)) .lightIcon {
    filter: none;
  }
  :host(:state(dark)) .darkIcon {
    filter: none;
  }
  :host(:state(dark)) .toggle::before {
    left: 1.4em;
  }
  /* Hide toggle and show "auto" when neither dirty nor set via attribute */
  :host(:state(auto)) {
    .toggle::before {
      opacity: 0;
    }
    .toggle::after {
      opacity: 1;
    }
  }
  :host(:hover) .toggle {
    border-color: var(--accent);
  }
  :host(:focus-within) .toggle {
    outline: 1px solid #FFF;
    box-shadow: 0 0 0.5em var(--accent);
    border-color: var(--accent);
    &::before {
      background: var(--accent);
    }
  }
</style>`;
  }

  // Allows custom fallback window objects that's NOT just the global object
  // (eg. for SSR)
  constructor(fallbackWindow = window) {
    super();
    this[QUERY] = (this.ownerDocument.defaultView ?? fallbackWindow).matchMedia(
      "(prefers-color-scheme:dark)"
    );
    this.render();
  }
}
