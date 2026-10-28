# 快速上手

目标：先跑出一个可查看、可接续的结果，再把方法放进自己的任务。所有命令从仓库根目录执行。

## 选择入口

| 你拿到的内容 | 怎么开始 |
|---|---|
| 完整仓库 | 运行下面的离线示范，能看到实际产物和检查输出。 |
| 单独的 skill 目录或 ZIP | 解压并保留整个目录，放到宿主支持的 skills 位置，按宿主方式加载。 |
| 只想理解方法 | 读 [SKILL.md](../../skills/make-next-graph/SKILL.md)，用已有工具按同样依赖组织成果。 |

辅助程序需要 Node.js 22+，只用内置模块，不需要 `npm install`。联网采集才需要网络；agent 自身使用原来的模型与工具。

## 先跑离线示范

首次使用一个新的输出目录；目录已经有结果时，可以继续它，也可以换新名字体验初始阶段。

```sh
node examples/web-digest/run.mjs --fixture --root .work/quickstart --until snapshot
node skills/make-next-graph/scripts/make.mjs next .work/quickstart/graph.json --json
```

首次预期：快照存在，`ready` 包含 `ranking`、`coverage`。这表示两个分析的前置已经具备。

再启动一次进程继续：

```sh
node examples/web-digest/run.mjs --fixture --root .work/quickstart
```

预期返回 `status: evidence-ready`。查看：

| 产物 | 用途 |
|---|---|
| `.work/quickstart/sources/snapshot.json` | 原始快照，明确标记为合成 fixture。 |
| `.work/quickstart/analysis/ranking.json` | 排序结果。 |
| `.work/quickstart/analysis/coverage.json` | 来源覆盖结果。 |
| `.work/quickstart/digest.md` | 可直接阅读的摘要。 |
| `.work/quickstart/checks/verify.json` | 真正运行的检查命令、输出和退出码。 |
| `.work/quickstart/delivery.md` | 交付入口及范围说明。 |

示范脚本实现了这个具体任务的生产步骤；通用 `next` 只给建议，不会执行图里的 recipe。
完成后仍要阅读摘要，确认它满足目标。

## 再跑真实公开数据

使用新的目录，去掉 fixture 参数：

```sh
node examples/web-digest/run.mjs --root .work/live-edition --until snapshot
node examples/web-digest/run.mjs --root .work/live-edition
```

数据来自 Hacker News 官方公开 API。网络失败会报错，不会偷偷换成离线成功。
快照只包含故事元数据；文章全文、观点真实性和远端链接实时可达性未核实。
同一个输出目录保持同一种模式；开始新一期请换目录。

## 在自己的 agent 中使用

1. 将 `skills/make-next-graph/` **整个目录**放到宿主支持的位置。
2. 按宿主的方式发现/加载 skill。只有 `SKILL.md` 而没有配套资源时，辅助程序不完整。
3. 提供目标、可观察的验收条件、现有资料和工作边界。

支持 `$skill` 调用时可使用：

```text
使用 $make-next-graph 完成这项任务：比较给定的三个方案，交付有来源的建议报告。
先阅读目标和已有资料，建立最小有用图，复用有效成果，按实际内容与检查结果交付。
```

安装位置、自动发现、工具执行许可和调用语法由具体宿主决定；本项目没有统一安装器。

## 接下来读什么

- [独立使用](standalone.md)：不依赖软件开发方法的完整小例子。
- [搭配使用](composition.md)：真正的 red/green、原生 SDD 文件绑定。
- [接续与并行](resume-parallel.md)：换 agent 后从文件继续。
- [收益与证据](../benefits.md)：哪些现象已经观察，哪些指标还需测量。

## 常见情况

| 现象 | 怎么处理 |
|---|---|
| init 提示文件已存在 | 使用现有图继续，或选择新任务目录；init 有意拒绝覆盖。 |
| goal 出现在 waiting | 图已创建，但需要提供图引用的实际目标文件。 |
| evidence-ready 但结果不对 | 阅读并修复实际产物或检查范围；它只表示证据具备。 |
| next 退出 0 但仍有工作 | 退出码表示观察成功；工作进度看 JSON 字段。 |
| 找不到脚本或模板 | 确认分发了整个 skill 目录，保持内部相对结构。 |
