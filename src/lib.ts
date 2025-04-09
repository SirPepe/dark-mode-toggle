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

// The media query list must be somewhat private, but can't be an actual private
// field because decorators need to access it.
const QUERY = Symbol("DarkModeToggleElementQuery");

@enhance()
export class DarkModeToggleElement extends HTMLElement {
  #root = this.attachShadow({ mode: "open", delegatesFocus: true });
  [QUERY] = window.matchMedia("(prefers-color-scheme:dark)");

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

  // Only needs to draw the default UI
  constructor() {
    super();
    this.#root.innerHTML = `<label>
  <input type="checkbox">
  <slot>
    <div class="defaultUi">
      <svg class="lightIcon" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 19a1 1 0 0 1 .993.883L13 20v1a1 1 0 0 1-1.993.117L11 21v-1a1 1 0 0 1 1-1zM18.313 16.91l.094.083.7.7a1 1 0 0 1-1.32 1.497l-.094-.083-.7-.7a1 1 0 0 1 1.218-1.567l.102.07zM7.007 16.993a1 1 0 0 1 .083 1.32l-.083.094-.7.7a1 1 0 0 1-1.497-1.32l.083-.094.7-.7a1 1 0 0 1 1.414 0zM4 11a1 1 0 0 1 .117 1.993L4 13H3a1 1 0 0 1-.117-1.993L3 11h1zM21 11a1 1 0 0 1 .117 1.993L21 13h-1a1 1 0 0 1-.117-1.993L20 11h1zM6.213 4.81l.094.083.7.7a1 1 0 0 1-1.32 1.497l-.094-.083-.7-.7A1 1 0 0 1 6.11 4.74l.102.07zM19.107 4.893a1 1 0 0 1 .083 1.32l-.083.094-.7.7a1 1 0 0 1-1.497-1.32l.083-.094.7-.7a1 1 0 0 1 1.414 0zM12 2a1 1 0 0 1 .993.883L13 3v1a1 1 0 0 1-1.993.117L11 4V3a1 1 0 0 1 1-1zM12 7a5 5 0 1 1-4.995 5.217L7 12l.005-.217A5 5 0 0 1 12 7z"/></svg>
      <svg class="darkIcon" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 1.992a10 10 0 1 0 9.236 13.838c.341-.82-.476-1.644-1.298-1.31a6.5 6.5 0 0 1-6.864-10.787l.077-.08c.551-.63.113-1.653-.758-1.653h-.266l-.068-.006-.06-.002z"/></svg>
      <span class="toggle"></span>
    </div>
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
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
  }
  input {
    opacity: 0;
    position: absolute;
    top: 0;
    left: 0;
  }
  .defaultUi {
    position: relative;
    border: 2px solid currentColor;
    display: grid;
    grid-template-columns: 1rlh 1rlh;
    grid-template-rows: 1rlh;
    gap: 0.25rlh;
    border-radius: 1rlh;
    align-items: center;
    justify-items: center;
    transition: all 300ms;
    .lightIcon, .darkIcon {
      width: 1rlh;
      height: 1rlh;
      position: relative;
      z-index: 1;
      transform: scale(0.7);
      transition: inherit;
      opacity: 1;
    }
    .toggle {
      position: absolute;
      top: 0.1rlh;
      width: 0.8rlh;
      height: 0.8rlh;
      background: currentColor;
      border-radius: 50%;
      transition: inherit;
    }
  }
  :host(:state(light)) {
    .toggle {
      left: 0.1rlh;
    }
    .lightIcon {
      opacity: 0;
    }
  }
  :host(:state(dark)) {
    .toggle {
      left: 1.3rlh;
    }
    .darkIcon {
      opacity: 0;
    }
  }
  :host(:state(auto)) {
    .defaultUi {
      border-style: dotted;
    }
  }
  :host(:focus-within) {
    outline: 1px dotted var(--accent);
    .toggle {
      background-color: var(--accent);
    }
  }
  :host(:where(:hover, :focus-within)) {
    .defaultUi {
      border-color: var(--accent);
    }
    &:host(:state(light)) .darkIcon,
    &:host(:state(dark)) .lightIcon {
      opacity: 1;
      transform: scale(0.9) rotate(360deg);
    }
  }
  @media (prefers-reduced-motion) {
    .defaultUi {
      transition: none;
    }
    .darkIcon, .lightIcon {
      transform: scale(0.9) !important;
    }
  }
</style>`;
  }
}
