# MVP 验证记录

验证日期：2026-10-28，Asia/Singapore。此记录只描述实际运行结果。

## 手册与入口整理复验

本次只整理 skill 入口与公开文档，没有修改计算器、捕获程序或示例运行代码。
`SKILL.md` 从 97 行收紧到 79 行；独立分发目录仍为 17 个文件，人用手册放在仓库的 docs 中。

在不含 Git 历史和旧运行输出的副本中，照着新手册的命令执行了六个场景：

| 场景 | 实际结果 |
|---|---|
| README 离线快照与跨进程继续 | 初次 ready 为 ranking、coverage；续跑后 evidence-ready，原快照字节和修改时间不变，真实检查退出 0。 |
| 独立三节点报告 | 原始目标、资料与图可用；A/C 符合给定字段约束，B 因超时被排除；报告形成后证据齐备，语义验收字段仍为 not-evaluated。 |
| Goal + TDD + make 教程 | 原测试产生 4 项实际断言失败；写入参考实现后相同 4 项通过、0 跳过；例子输出 rankedIds 为 [8,2,9]。原测试与 red 的字节和修改时间均保留。 |
| OpenSpec 原路径引用 | 教程命令正确引用原文件，不改原件、不产生同义 spec.md；本次只复验文件绑定，没有重跑原生 CLI。 |
| Spec Kit 原路径引用 | 对 spec、plan、tasks 原路径完成同样的绑定与原件保留检查；不代表原生 CLI 的新一轮全流程验证。 |
| 新增行业中间产物 | 已有报告保留；增加 data.quality 后交付被前置缺口阻塞，补出评估后证据齐备。使用合成资料，不代表行业质量认证。 |

本次 Windows、Node.js 24.20.0 完整回归为 **26 项通过，0 失败、0 跳过**；
四份模板/示范图校验通过，skill 格式校验通过。Node.js 22 的结果仍指下文前轮记录，本次未重复运行。

手册命令、输入副本和原始输出保留在本地 `.work/docs-refresh/`，不随源代码和 skill 分发。
收益说明将上述可观察现象与尚未证实的速度、费用及质量提升分开，见[收益与证据](benefits.md)。

## 十轮独立验证与改进

使用 12 个独立子 agent 完成以下场景；父 agent 复核实际产物和关键行为。
各轮决定保留设计或修复已复现的问题，没有按轮次强行增加功能。

| 轮次 | 场景与实际结果 |
|---|---|
| 1 | 同目标、无预置图/测试/实现的弱提示对照：普通流程和 skill 均通过独立行为检查；skill 使用 3 次查询。单组结果不能证明质量提升。 |
| 2 | 独立审计核心行为；修复默认文本缺少具体错误路径、大输出捕获无法被自身读取两类问题，先失败再通过，并由原审计者复验。 |
| 3 | 单独处理文档决策：3 个节点、2 次查询完成有来源的建议与未发送草稿；未强加 SDD/TDD。资料为合成记录。 |
| 4 | 留下真实 TDD 交接点：10 项业务断言失败，导入与环境正常；没有生成 green。 |
| 5 | 无历史对话的新 agent 从文件接手：原目标、10 项测试、red、图与交接记录未变，实现后全部通过，例子实际运行。 |
| 6 | 改目标并保留旧时间戳/旧 green：图仍证据齐备；新 agent 读目标后补出 9 通过/1 失败的真实 red，修复后 10 项全过，保留历史记录。 |
| 7 | 继承有循环依赖的图：新 agent 说明原因并修复依赖，继续完成实际文档；计算器没有自动修图。 |
| 8 | OpenSpec、Spec Kit 原规格分别接入，各自真实 red=1、同样 4 项测试 green=0、例子输出 `[8,2,9]`；未生成同义规格。此轮未重新安装或调用原生 CLI。 |
| 9 | 宿主实际分给两位 agent 两个互不重叠的输出，读取后整合；原始来源和图的字节/时间未变。查询只读，本机该轮抽样中位约 55–56 ms，不代表整体任务提速。 |
| 10 | 新 agent 审计冻结源码，发现失效目录链接观察、示范逐篇链接/展示覆盖数核对两类问题；补真实 red 并修复。最终 Node 24.20.0、22.23.4 各 26 项通过，0 失败、0 跳过。 |

显式捕获工具现在限制每个输出流的捕获量，使大输出或控制字符不会生成读取器无法
处理的检查 JSON；截断结果仍为未验证。观察器会保留失效链接的不确定性，避免把
工作区外的缺失目标建议成普通可写产物。示范按每篇故事核对原文/讨论链接，核对
展示的故事数及来源数；它仍不访问文章目标地址。

本轮实际验证过新的宿主 agent 接手、独立文件写入和联网示范跨进程续跑。
接手场景有持久文件和交接说明，不能外推为任意进程崩溃恢复或无人值守长时间运行。
独立路径写入不同文件，不能外推为竞争写入的协调保证。

本地证据集中在 `.work/ten-rounds/`：每轮任务、父级行为检查、原始审计及修复前后
输出均保留；最终完整回归为 `round-10/final-node24.json`、`final-node22.json`。
这些评测资料不随公开源代码分发。

## 前轮 MVP 验收记录

[MVP 验收范围](mvp-acceptance.md)的 10 项已有对应证据。完成度按具体工作范围和
可观察结果判断，不以主观稳定性打分或代码覆盖率代替。

| 检查 | 本轮实际结果 |
|---|---|
| Windows、Node.js `v24.20.0` | 最终完整回归 23 项通过，0 失败、0 跳过。 |
| Windows、Node.js `v22.23.4` | 同一完整回归 23 项通过，0 失败、0 跳过。 |
| 新行为按 TDD 实施 | SDD 文件绑定、修改后重新检查、展示元数据核对和嵌套测试捕获均先实际失败，再修实现并通过。红绿原始输出保留在 `.work/tdd/`。 |
| OpenSpec `1.15.0` | 原生 CLI 初始化和新建 change；按原生 schema 编写原文件；严格校验通过且无 issues。 |
| Spec Kit / Specify `1.0.1` | 原生 CLI 初始化；原生 create-new-feature / setup-plan / setup-tasks 创建并提供模板结构；原生 prerequisite 检查通过。 |
| 三种真实方法组合 | OpenSpec、Spec Kit、简易 TDD 各自的原规格文件被 graph 引用；相同四个行为测试分别真实 red=1、green=0，且每组 `try.mjs` 实际输出 `[8,2,9]`。 |
| 互联网示范当前结果 | 保存的 5 项真实来源数据，当前检查核对展示标题、分数、排序、链接、来源覆盖和出处，退出 0。 |
| 修改与返修 | 即使保留原修改时间，破坏摘要后续跑也返回失败并保留坏内容；实际修复后原入口恢复通过。 |
| 可复制 skill | 最终回归把整个 skill 复制到仓库外，再初始化模板、观察与运行原生命令；全部成功。 |

原生方法接入是“已有 coding agent 沿原生工具的指令填原产物，再引用这些文件”。
本次没有声称从终端执行过聊天 slash 命令，也不把 Spec Kit 的结构检查当作业务质量
认证。实际行为由不改预期的四个测试及可执行样例证明。

本轮修复了三个具体缺口：示范复用过时检查记录；示范未核对展示的标题/分数/顺序；
采集器继承 Node 内部测试标记导致嵌套 `node --test` 跳过文件仍退出 0。最后一项先
观察到真实递归警告，再只在子进程环境去除该标记，没有更改父进程的环境。

原始本地证据位置（不随源代码公开分发）：

```text
.work/tdd/mvp-red.json                       新行为修复前的实际失败
.work/tdd/mvp-green.json                     对应修复后的通过
.work/tdd/digest-contract-red.json            展示元数据被破坏但旧检查通过的复现
.work/tdd/digest-contract-green.json          加强后对应场景通过
.work/tdd/capture-nested-red.json             原生嵌套测试被跳过的复现
.work/tdd/capture-nested-green.json           同一场景修复后通过
.work/tdd/pre-final-node24-failures.json      完整回归暴露的中间失败，保留原文
.work/tdd/pre-final-node22-failures.json      相同中间失败的另一个 Node 版本证据
.work/tdd/final-node24.json                   最终 23 项通过
.work/tdd/final-node22.json                   最终 23 项通过
.work/native-openspec/checks/red.json         原生 OpenSpec 样例的实际红步
.work/native-openspec/checks/green.json       同样四项测试的实际绿步
.work/native-openspec/checks/actual-run.json  实际执行输出
.work/native-speckit/checks/                  Spec Kit 对应红、绿与实际输出
.work/simple-tdd/checks/                      简易 TDD 对应红、绿与实际输出
.work/live-demo/checks/verify.json            真实 API 快照的当前检查
```

## 初始版本的历史记录

| 检查 | 实际结果 |
|---|---|
| Windows、Node.js `v24.20.0`：`npm test` | 18 项通过，0 失败、0 跳过。 |
| Windows、Node.js `v22.23.4`：相同测试集 | 18 项通过，0 失败、0 跳过；运行时通过临时 npm exec 环境取得，不增加项目运行依赖。 |
| `npm run validate` | 调研、软件、内容模板与联网示范图全部有效。 |
| JSON Schema | Draft 2020-12 schema 自检通过；9 份图与片段文档通过校验，包含联网示范的实例化图。 |
| skill 格式 | skill-creator 的 quick_validate 检查通过。验证工具的 Python YAML 依赖放在临时工具环境，不要求 skill 使用者安装。 |
| 可移植目录 | 把整个 skill 复制到仓库外带空格的临时路径后，模板初始化、next 与真实命令捕获均成功。 |
| 真实联网示范 | Hacker News 官方 API 返回可用数据，保存 5 条故事元数据，生成摘要。 |
| 跨进程接续 | 第一次停在 snapshot，下一进程继续；原快照 SHA-256 和修改时间均未变化。 |
| 真实结果检查 | 原生命令的 `exitCode` 为 `0`；stdout 为 `PASS: 5 items; ranking, links, source coverage and provenance match the saved live snapshot.` |

自动测试覆盖只读重算、独立路径、全部输出文件、目标依赖闭包、失败与未验证、
损坏检查记录、不可读文件、外部输入缺失、时间影响提示、追加行业中间产物、
组合图、重复/环路、路径边界、软链接、命令失败/超时、拒绝覆盖及独立复制使用。
权限拒绝分支通过注入文件观察错误验证，不声称已在每种操作系统上修改真实 ACL。
离线集成测试还会故意破坏摘要，确认实际验证命令返回失败。

## 本地复现

```text
npm test
npm run validate
node examples/web-digest/run.mjs --root .work/another-live-edition --until snapshot
node examples/web-digest/run.mjs --root .work/another-live-edition
node examples/web-digest/verify.mjs .work/another-live-edition
```

没有网络时使用 `--fixture` 并换用独立输出目录；合成数据不作为联网成功证明。
运行输出都放在 `.work/`，由 `.gitignore` 排除。它们可能含本机进程路径和当时的
公开数据，不属于可公开分发的源文件。单独分发 skill 时只需整个
`skills/make-next-graph/` 目录，它自带 MIT 许可证。

## 尚未验证的范围

尚未实测 Linux/macOS、各种 agent 宿主的自动技能发现、原生多 agent 竞争写入、
无人值守的长时间唤醒、实际行业成果质量和外部副作用恢复。本版没有实现后四项
的宿主能力，也不会从依赖图存在推导出这些保证。

本机 Docker Linux 引擎未运行，探测返回命名管道不存在；未启动或修改宿主服务。
Linux/macOS 仍按未实测报告，不用 Windows 回归代替跨系统运行证明。

联网示范的检查范围是本地保存数据的一致性与链接引用完整性；文章观点、远端链接
可用性和全文内容不在本次检查内。当前产物存在和检查通过仍不能替代业务判断。
