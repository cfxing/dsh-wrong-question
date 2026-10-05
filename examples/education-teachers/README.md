# Education Teacher Presets

本目录提供两个 DeepSeek Harness Agent Preset：

- `AI数学老师`
- `AI物理老师`

每个老师都组合 `dsh-wrong-question`、`dshmath-manim`、`skill-filesystem` 和 `tool-skill`。

老师对用户暴露的是“老师”身份；底层动画实现仍由 `dshmath-manim` 的 `learning-animation` 负责，举一反三由 `learning-variant` 负责。

安装时把本目录作为一个 DSH bundle 安装；当前 Profile 需要已经启用 Agent Preset Registry。
