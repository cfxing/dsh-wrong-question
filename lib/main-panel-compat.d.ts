import React from 'react';
import type { Context } from '@deepseek-ai/cordis';
export declare function registerMainPanel(ctx: Context, id: string, priority: number, render: (props: any) => React.ReactElement, onHidden?: () => void): () => void;
