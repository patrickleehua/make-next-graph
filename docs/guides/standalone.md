# 独立使用：从给定资料到报告

make 可以独立处理成果型工作。本例只使用目标、来源和报告三个节点，不需要规格工具或软件测试。

## 一个最小任务

在新的 `.work/standalone-handbook/` 目录里准备下面三个文件。资料全部为合成记录，不代表真实课程或供应商。

`goal.md`：

```text
为 8 位参与者比较三个离线工作坊方案，时间不超过 90 分钟，至少 3 项练习。
交付中文 report.md，列出合格候选、淘汰原因和实际取舍，引用来源 ID。
资料未说明的讲师、难度、可约时间保留为未知；不要发送或报名。
```

`sources.json`：

```json
[
  {"id":"A","minutes":60,"capacity":12,"exercises":3,"offline":true},
  {"id":"B","minutes":100,"capacity":12,"exercises":4,"offline":true},
  {"id":"C","minutes":75,"capacity":10,"exercises":4,"offline":true}
]
```

`graph.json`：

```json
{
  "version": 1,
  "name": "离线工作坊比较",
  "goals": ["report"],
  "nodes": [
    {
      "id":"goal", "title":"目标与验收", "kind":"input",
      "files":["goal.md"],
      "acceptance":"明确人数、时限、练习数、交付和执行边界。"
    },
    {
      "id":"sources", "title":"给定合成资料", "kind":"input",
      "files":["sources.json"],
      "acceptance":"使用给定记录，不补造未知事实。"
    },
    {
      "id":"report", "title":"有来源的比较报告", "kind":"artifact",
      "files":["report.md"], "requires":["goal","sources"],
      "acceptance":"逐项检查硬约束，引用来源 ID，说明取舍和未知信息。",
      "recipe":{
        "instructions":"读取实际目标和资料，比较候选，写报告并读回核对。",
        "writes":["report.md"]
      }
    }
  ]
}
```

检查图并寻找下一步：

```sh
node skills/make-next-graph/scripts/make.mjs validate .work/standalone-handbook/graph.json
node skills/make-next-graph/scripts/make.mjs next .work/standalone-handbook/graph.json --json
```

输入齐备时，`ready` 应包含 `report`。让 agent 阅读实际文件、完成比较并产出报告，然后再次运行 next。

## 怎样验收结果

本例已知字段中 A、C 达标；B 因 100 分钟超时被排除。
A 比 C 短 15 分钟，C 多 1 项练习；初学者适配、讲师和可约情况仍未知。

报告至少应做到：

- 引用 A/B/C，保留上述字段的实际差别。
- 把建议理由与资料事实分清，不把候选写成已落实安排。
- 没有外发、报名或凭空补全信息。

报告文件存在后，图可能返回 evidence-ready；是否做到这些仍需读内容。

## 换成自己的任务

| 情况 | 如何建图 |
|---|---|
| 已经有足够资料 | 将给定资料作为 input，直接连接分析或报告。 |
| 还需要采集来源和独立分析 | 使用 research 模板：目标 → 来源 → 分析 → 报告。 |
| 还需要受众定位和编辑意见 | 使用 content 模板，增加受众、草稿、评审与最终内容。 |

```sh
node skills/make-next-graph/scripts/make.mjs init --template research --out .work/research-task/graph.json
node skills/make-next-graph/scripts/make.mjs init --template content --out .work/content-task/graph.json
```

init 只创建定义。为图提供真实目标，按实际任务调整路径和依赖，再由现有工具生产内容。
如果一个任务直接完成更简单，就直接完成；中间节点应能帮助决策、复用或交接。

[下一篇：搭配使用](composition.md) · [返回文档导航](../README.md)
