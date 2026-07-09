/*
 * Tiny DOM helpers for the rebuilt UI layer. No framework — plain elements
 * bound to the existing signals store (js/core/state.js). Strings become text
 * nodes (never innerHTML) so user data can't inject markup.
 */

export function h(tag, props, ...children) {
    const el = document.createElement(tag);
    if (props) {
        for (const [k, v] of Object.entries(props)) {
            if (v == null || v === false) continue;
            if (k === 'class') el.className = v;
            else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
            else if (k === 'dataset') {
                for (const [dk, dv] of Object.entries(v)) el.dataset[dk] = dv;
            } else if (k.startsWith('on') && typeof v === 'function')
                el.addEventListener(k.slice(2).toLowerCase(), v);
            else if (k === 'html')
                el.innerHTML = v; // author-controlled markup only
            else if (k === 'value' || k === 'checked' || k === 'disabled') el[k] = v;
            else el.setAttribute(k, v === true ? '' : v);
        }
    }
    append(el, children);
    return el;
}

function append(node, children) {
    for (const c of children.flat(Infinity)) {
        if (c == null || c === false || c === true) continue;
        node.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    }
}

export const frag = (...children) => {
    const f = document.createDocumentFragment();
    append(f, children);
    return f;
};

export const clear = (node) => {
    while (node.firstChild) node.removeChild(node.firstChild);
};
export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];
export const mountBodyLevel = (node) => {
    document.body.appendChild(node);
    return node;
};

/* Component convention: a surface exports mount(root, ctx) -> cleanup(). This
 * helper collects teardown callbacks (event listeners, signal effects) so a
 * surface can be unmounted without leaks. */
export function lifecycle() {
    const cleanups = [];
    return {
        add: (fn) => {
            if (typeof fn === 'function') cleanups.push(fn);
        },
        on: (target, type, handler, opts) => {
            target.addEventListener(type, handler, opts);
            cleanups.push(() => target.removeEventListener(type, handler, opts));
        },
        destroy: () => {
            while (cleanups.length) {
                try {
                    cleanups.pop()();
                } catch {
                    /* noop */
                }
            }
        },
    };
}
