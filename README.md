# Make Next Graph

**用 make 的思想组织 agent 长任务：目标倒推依赖，节点对应真实产物，下一步每次现算。**

可以单独处理调研、文档、分析等工作，也可以组合 Goal、SDD、TDD。
交付形态是可移植 skill、零依赖的只读计算器，以及能复用的图模板。

给宿主的使用方式可以很简单：**“按 make 思想完成这个目标，复用现有成果；使用
项目选定的规格与简易 TDD，每次补最有价值的产物，再按真实结果继续。”**

```text
目标 + 图定义 + 已有产物 → 看清缺口与可做工作 → 原生工具执行 → 得到下一份产物
```

## 快速体验

需要 Node.js 22 或更新版本，无需 `npm install`、模型 Key 或数据库。
从本仓库目录执行：

```text
# 真实联网示范：只读取 Hacker News 官方公开 API
node examples/web-digest/run.mjs --root .work/live-demo --until snapshot

# 此时会看到 ranking 和 coverage 两条可独立推进的路径
node skills/make-next-graph/scripts/make.mjs next .work/live-demo/graph.json --json

# 换一次进程继续：复用原快照，生成摘要和真实检查结果
node examples/web-digest/run.mjs --root .work/live-demo
```

打开 `.work/live-demo/digest.md` 查看摘要，`delivery.md` 查看交付入口，
`checks/verify.json` 查看命令原始输出。新一期资讯请换一个输出目录。
只抓取元数据；示范不声称已经阅读文章或核实文章观点。

无网络时可另用离线示范，数据会明确标记为合成 fixture：

```text
node examples/web-digest/run.mjs --fixture --root .work/offline-demo
```

## 用在自己的任务

```text
node skills/make-next-graph/scripts/make.mjs init --template research --out work/report/graph.json
node skills/make-next-graph/scripts/make.mjs next work/report/graph.json --json
```

把实际目标写入任务目录的 `goal.md`，按项目修改图里的路径、验收要求和依赖。
计算器给出建议，agent 或人使用已有工具产出结果，再次调用 `next`。
缺外部输入会说明等待原因；`next` 不执行命令、不派 agent、不保存节点状态。

| 模板 | 适用工作 | 组合内容 |
|---|---|---|
| `research` | 调研、比较、建议报告 | 目标、来源、分析、报告，可独立使用。 |
| `software` | 一个有明确行为的软件改动 | 目标、规格、测试、真实 red/green 输出、实现、交付。 |
| `content` | 内容生产的行业示范 | 复用调研片段，加入受众、草稿、编辑意见和最终内容。 |

新增行业时添加有价值的中间产物和依赖，不需要改计算器。
现有任务可以加节点、修路径、补检查，仍然复用适用成果。

已经使用 OpenSpec、Spec Kit 或其他规格方法时，在 `software` 初始化后面添加
可重复的 `--spec <原文件相对路径>` 即可引用其原始产物。图放在子目录时，使用
`next --root <项目根>`。不安装第二套规格流程，不复制同义规格。

完整的轻量红→绿可运行案例见 [software-slice](examples/software-slice/README.md)。

## 作为 skill 使用

把 [skills/make-next-graph](skills/make-next-graph) **整个目录**放进宿主支持的
skills 目录，加载 `$make-next-graph`。保持 scripts、references、assets 一起移动。
采用开放的 [Agent Skills 目录格式](https://agentskills.io/specification)；
实际安装位置、执行与权限由所用宿主决定。

只想使用思想时，直接阅读 [SKILL.md](skills/make-next-graph/SKILL.md)。
只想用程序时，可以直接调用 CLI。两者不依赖某个模型供应商或其他 skill。

## 设计中的几个关键选择

- **图无运行状态，产物有持久内容。** 恢复时重新观察文件，不维护另一套 done/pending 台账。
- **产物存在不等于业务合格。** `evidence-ready` 仅表示引用的产物与预期进程结果具备，业务验收仍需读内容。
- **变化只提示影响。** 时间戳不是质量证明，不自动作废已有结果，也不自动重跑外部动作。
- **并行交给宿主。** 输出依赖上可独立推进的候选，实际写入冲突和任务分配由原生能力处理。
- **长任务可以接续。** 依赖持久产物和宿主再次执行；没有“无限运行、必定成功”的承诺。

make、Bazel、LangGraph、Temporal 都有相关能力。这里将成熟的依赖思想用于
agent 的通用过程产物，采用轻量的建议层定位。依据与差异见[公开资料研究](docs/research.md)。

## 验证与继续扩展

```text
npm test
npm run validate
```

查看[设计文档](docs/design.md)、[实际验证记录](docs/verification.md)、
[运行架构与节点判定](docs/runtime-architecture.md)、
[图格式](skills/make-next-graph/references/graph-format.md)、
[行业扩展方法](skills/make-next-graph/references/extend.md)和
[TDD / SDD / Goal 组合](skills/make-next-graph/references/methods.md)。

许可证为 [MIT](LICENSE)。当前是本地可运行的初版，尚未发布至远端或包注册表。
