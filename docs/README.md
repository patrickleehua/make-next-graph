# 文档导航

从想完成的事情选择入口。手册给人阅读；skill 内的 references 提供 agent 按需读取的运行契约。

## 使用手册

| 文档 | 读完能做什么 |
|---|---|
| [快速上手](guides/quickstart.md) | 安装完整 skill、跑通离线和联网示范、找到结果。 |
| [独立使用](guides/standalone.md) | 从给定资料和目标建立最小 graph，产出报告。 |
| [搭配使用](guides/composition.md) | 组合 Goal、TDD 和原生 SDD 文件，保留真实验证。 |
| [接续与并行](guides/resume-parallel.md) | 让新 agent 从文件继续，处理变更并分配独立路径。 |
| [行业扩展](guides/industry-graphs.md) | 插入有价值的中间产物，形成可复用片段。 |
| [收益与证据](benefits.md) | 区分已观察效果、预期收益与尚未证实的指标。 |

## 机制与契约

| 文档 | 内容 |
|---|---|
| [运行架构与节点判定](runtime-architecture.md) | 观察结果、依赖可用性、建议、执行时序和代码入口。 |
| [交互架构图](diagrams/runtime-architecture.html) | 本地浏览、缩放、切换主题；托管平台可下载后打开。 |
| [总体设计](design.md) | 定位、模块职责、取舍与扩展边界。 |
| [图格式](../skills/make-next-graph/references/graph-format.md) | 字段、路径、组合、原始检查与 CLI。 |
| [JSON Schema](../skills/make-next-graph/references/graph.schema.json) | 编辑器和结构校验。 |

## 示例与验证

- [软件行为示例](../examples/software-slice/README.md)：真实 red → green → 可执行结果。
- [互联网示范图](../examples/web-digest/graph.json)：官方 API 快照、独立分析、摘要与检查。
- [实际验证记录](verification.md)：运行环境、结果和未验证范围。
- [MVP 验收范围](mvp-acceptance.md)：可观察的验收条件。
- [公开资料研究](research.md)：make 思想与相关工具的公开依据。

文档以仓库根目录为默认命令起点。使用独立任务目录保存成果；保留已有有效输出，继续新一期时换新目录。
