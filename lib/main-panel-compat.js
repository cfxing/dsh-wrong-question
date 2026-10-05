import React from 'react';
export function registerMainPanel(ctx, id, priority, render, onHidden = () => { }) {
    const ui = ctx;
    const layout = ui.layout;
    if (typeof layout.selectPanel !== 'function')
        return ui.slots.register({ name: 'conversation', priority }, render);
    const slots = ui.slots;
    let disposed = false;
    const remove = slots.register({ name: 'main', key: id }, props => React.createElement(PanelLifecycle, { onHidden }, render(props)));
    try {
        layout.selectPanel(id);
    }
    catch (e) {
        remove();
        throw e;
    }
    return () => { if (disposed)
        return; disposed = true; remove(); };
}
function PanelLifecycle({ children, onHidden }) {
    React.useEffect(() => () => { queueMicrotask(onHidden); }, [onHidden]);
    return children ?? null;
}
