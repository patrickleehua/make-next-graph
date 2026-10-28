# 扩展行业 graph

扩展的单位是有用成果及其依赖、验收与生产方式。先找业务决策需要的中间产物，再决定是否加入图。

## 从成果出发

| 工作 | 可能有用的中间产物 | 要回答的问题 |
|---|---|---|
| 数据分析 | 数据字典、质量评估、分析结果 | 缺失与偏差会不会改变结论？ |
| 内容生产 | 受众说明、草稿、编辑意见 | 读者需要什么，事实与表达是否合适？ |
| 方案比较 | 来源摘要、约束比较、可行性判断 | 方案是否满足当前条件？ |
| 软件开发 | 原生规格、源码、测试原文 | 行为是否符合要求并得到验证？ |

这些是建模例子，不能代替具体行业的专业验收或认证。

## 为调研报告加数据质量评估

先初始化新任务并提供它引用的目标：

```sh
node skills/make-next-graph/scripts/make.mjs init --template research --out .work/domain-task/graph.json
```

在图的 nodes 中加入：

```json
{
  "id":"data.quality",
  "title":"来源数据质量评估",
  "kind":"artifact",
  "files":["analysis/data-quality.md"],
  "requires":["research.sources"],
  "acceptance":"记录缺失项、样本偏差、时效限制，以及对报告结论的实际影响。",
  "recipe":{
    "instructions":"读取实际来源，评估会改变决策的质量问题，保留依据。",
    "writes":["analysis/data-quality.md"]
  }
}
```

再把 `data.quality` 加入 `research.delivery.requires`，并填写本次 `changeReason`。
这是插入现有研究图的节点，不能当成完整图单独运行。

```sh
node skills/make-next-graph/scripts/make.mjs validate .work/domain-task/graph.json
node skills/make-next-graph/scripts/make.mjs next .work/domain-task/graph.json --json
```

原来的报告即使仍存在，新增必要前置缺失时也不可用。现有来源和分析保留，补出评估后再判断哪些结论需要修改。

## 把经验变成可复用片段

将节点放进只含 `version: 1`、`nodes` 等支持字段的 fragment，再由模板 includes 引入。
采用 `data.quality` 这样的领域前缀，避免不同片段重名。

- includes 从定义文件所在位置解析，保持在入口图的目录树内。
- 节点的 files 始终从实际工作区根解析，和 fragment 放在哪一层无关。
- 组合增加定义，不通过同名覆盖已有节点。
- init 会展开成独立图；直接 includes 的活动图下次会读取更新后的片段，应明确决定是否采用变更。

可以从已有 [content 模板](../../skills/make-next-graph/assets/templates/content.json) 理解研究片段与行业片段怎样组合。

## 接受一个新行业片段前

确认产物确实帮助决策、验收可以查看或执行、输入来源与使用权限明确，且正向路径和一次失败/接续路径能实际走通。
需要自动判断时加入该领域的真实 check，而不是在通用计算器中增加行业专属状态。

复用包保留通用定义和必要示例，业务原始数据、内部路径、凭据和运行日志留在各自任务内。

[图扩展契约](../../skills/make-next-graph/references/extend.md) · [返回文档导航](../README.md)
