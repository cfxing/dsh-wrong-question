const QUALITY = { again: 0, hard: 3, good: 4, easy: 5 };
export function scheduleReview(previous, grade, now = new Date()) {
    const quality = QUALITY[grade];
    let ease = previous.ease || 2.5;
    let reps = previous.reps || 0;
    let interval = previous.intervalDays || 0;
    if (quality < 3) {
        reps = 0;
        interval = 0;
        ease = Math.max(1.3, ease - 0.2);
    }
    else {
        if (grade === 'hard')
            ease = Math.max(1.3, ease - 0.15);
        if (grade === 'easy')
            ease += 0.15;
        reps += 1;
        if (reps === 1)
            interval = 1;
        else if (reps === 2)
            interval = 6;
        else
            interval = Math.max(1, Math.round(interval * ease));
        if (grade === 'hard')
            interval = Math.max(1, Math.round(interval * 1.2));
        if (grade === 'easy')
            interval = Math.max(1, Math.round(interval * 1.3));
    }
    const due = new Date(now);
    due.setDate(due.getDate() + interval);
    return {
        quality,
        state: {
            reps,
            ease: Number(ease.toFixed(2)),
            intervalDays: interval,
            dueAt: due.toISOString(),
            lastReviewedAt: now.toISOString(),
        },
    };
}
export function isDue(state, now = new Date()) {
    return new Date(state.dueAt).getTime() <= now.getTime();
}
