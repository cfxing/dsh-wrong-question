import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const TEACHING_ACTIONS = [
    { id: 'learning-variant', icon: '🔄', label: '举一反三', instruction: '请根据刚才的题目或知识点开始递进式举一反三练习，一次先给我一道题。' },
    { id: 'learning-animation', icon: '🎬', label: '生成动画', instruction: '请把刚才讨论的内容制作成学习动画，默认包含中文旁白。' },
];
export function registerTeachingActions(ctx) {
    const ui = ctx;
    ui.slots.inject('conversation.input.right', () => ui.slots.register({
        name: 'conversation.input.right',
        id: 'learning-actions',
        order: 80,
    }, TeachingActionBar));
}
function TeachingActionBar({ useInput, inputActions }) {
    const input = useInput((snapshot) => ({ phase: snapshot.phase, draft: snapshot.draft }));
    const disabled = input.phase === 'submitting' || input.phase === 'adjudicating';
    const invoke = (skill, instruction) => {
        if (disabled)
            return;
        const draft = input.draft.trim();
        const nextDraft = draft === ''
            ? `/${skill} ${instruction}`
            : `${input.draft}\n/${skill} ${instruction}`;
        inputActions.setDraft(nextDraft);
        inputActions.submit();
    };
    return _jsx("div", { className: 'dsh-learning-actions', "aria-label": '\u5B66\u4E60\u5DE5\u5177', children: TEACHING_ACTIONS.map(action => (_jsxs("button", { type: 'button', className: 'dsh-learning-action', disabled: disabled, title: action.label, onClick: () => invoke(action.id, action.instruction), children: [_jsx("span", { "aria-hidden": 'true', children: action.icon }), _jsx("span", { children: action.label })] }, action.id))) });
}
