# 公开资料研究与定位

查阅日期：2026-10-28。以下只依据公开的一手资料；本项目的设计选择单独标为建议。

## 结论

不能把依赖图、增量构建、持久执行宣传为主流没有的能力。GNU Make 和 Bazel
已经证明了目标与依赖的价值；agent 框架也提供状态持久化与恢复机制。
本项目建议聚焦一个清晰用途：**让人和 agent 围绕真实中间产物，用可移植 skill
和只读图计算器安排工作，并按需组合专业方法。** 这不是市场独创性的证明。

| 公开来源 | 已确认事实 | 对本项目的启发与区别 |
|---|---|---|
| [GNU Make 手册 §2.3](https://www.gnu.org/software/make/manual/make.html#How-Make-Works) | make 从目标出发，先处理它依赖的文件规则。 | 借用目标、依赖和配方的模型；这里的配方可以指导调研、判断或原生工具调用，计算器不执行它。 |
| [Bazel Skyframe](https://bazel.build/reference/skyframe) | Skyframe 将计算建模为不可变值、计算函数和依赖图，支持增量求值。 | 所有实质输入应有明确依赖；本版不做 Bazel 式缓存、自动失效或构建系统。 |
| [LangGraph Persistence](https://docs.langchain.com/oss/python/langgraph/persistence) | checkpointer 保存线程图状态，store 保存跨线程数据。 | 状态持久化是已有成熟路径；这里选择重读产物，仍可与宿主持久化并用。 |
| [Temporal Workflow Execution](https://docs.temporal.io/workflow-execution) | Workflow 通过保存状态及 Event History 重放提供持久执行和恢复。 | 长期执行需要真正的运行时保证；只读图不能宣称拥有等价的可靠调度能力。 |
| [AWS Durable Execution 幂等性](https://docs.aws.amazon.com/lambda/latest/dg/durable-execution-idempotency.html) | 失败后的重试或重放可能重复执行步骤，外部副作用需要幂等处理。 | 恢复不能因为缺本地文件就重发付款、邮件或发布动作。 |
| [Spec Kit](https://github.com/github/spec-kit)、[OpenSpec](https://github.com/Fission-AI/OpenSpec) | 规格方法有自己的产物与使用流程。 | 直接引用所选工具的原始文件，工具自己组织规格流程，不建立同义副本。 |
| [Martin Fowler：TDD](https://www.martinfowler.com/bliki/TestDrivenDevelopment.html) | TDD 通过先写测试、使其通过及重构推进开发。 | 软件图可以引用测试和真实 red/green 输出；测试投入取决于行为与风险。 |
| [Agent Skills 规范](https://agentskills.io/specification) | skill 以 `SKILL.md` 为入口，可附带 scripts、references、assets。 | 用可移植目录与渐进加载组织交付，宿主执行仍遵循各自接口。 |

## 为什么不直接包一层 GNU Make

建议保留 make 的工作模型，而不是默认执行 Makefile。确定性命令流水线可以直接
使用 GNU Make，本项目并不取代它。agent 工作还包含来源不足、判断尚未完成、检查
没法运行以及实质变化不一定导致返工等情形，因此本版把“观察并给出建议”独立出来。
这是一项面向不确定任务的产品取舍，不是 GNU Make 的能力缺陷。

## 为什么不直接做另一个 agent framework

建议让已有宿主继续提供模型、工具、执行、暂停、并行和唤醒。否则会同时承担
调度、会话历史、隔离、权限和恢复等大量职责，通用思想反而不容易单独使用。
需要服务器级持久执行时，可把此图计算作为既有框架中的一个只读环节。

## 联网案例的依据

[Hacker News 官方 API](https://github.com/HackerNews/API)提供 topstories 的 ID 列表和
item 元数据，无需本示范配置密钥。示范获取最多五项公开元数据，固定为本地快照后
分别计算排名与来源覆盖，再生成 Markdown 摘要和真实命令检查结果。

这个案例同时展示了有成本的数据采集复用、独立路径、汇合、中断接续和结果检查。
它只验证保存数据的一致性，不代表文章内容已阅读、链接可达性已实测或观点已核实。
