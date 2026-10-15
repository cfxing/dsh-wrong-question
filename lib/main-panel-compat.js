import React from 'react';
export function registerMainPanel(ctx, id, priority, render, onHidden = () => { }) {
    const ui = ctx;
    // `layout` is optional in newer DSH web entries. Cordis contexts can throw
    // when an undeclared service property is read, so probe it defensively.
    let layout;
    try {
        layout = ui.layout;
    }
    catch {
        layout = undefined;
    }
    if (!ui.slots || typeof ui.slots.register !== 'function')
        return () => { };
    const slots = ui.slots;
    let disposed = false;
    const remove = slots.register({ name: 'main', key: id }, props => React.createElement(PanelLifecycle, { onHidden }, render(props)));
    if (typeof layout?.selectPanel === 'function') {
        try {
            layout.selectPanel(id);
        }
        catch (e) {
            remove();
            throw e;
        }
    }
    return () => { if (disposed)
        return; disposed = true; remove(); };
}
function PanelLifecycle({ children, onHidden }) {
    React.useEffect(() => () => { queueMicrotask(onHidden); }, [onHidden]);
    return children ?? null;
}
