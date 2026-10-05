import type { Context } from '@deepseek-ai/cordis';
export declare const TEACHING_ACTIONS: readonly [{
    readonly id: "learning-variant";
    readonly icon: "🔄";
    readonly label: "举一反三";
    readonly instruction: "请根据刚才的题目或知识点开始递进式举一反三练习，一次先给我一道题。";
}, {
    readonly id: "learning-animation";
    readonly icon: "🎬";
    readonly label: "生成动画";
    readonly instruction: "请把刚才讨论的内容制作成学习动画，默认包含中文旁白。";
}];
export declare function registerTeachingActions(ctx: Context): void;
