# 搭配使用：Goal、TDD、SDD

各方法保留自己的职责：Goal 定义结果，SDD 保存原生规格，TDD 验证行为，make 组织产物依赖，宿主执行并作业务判断。

| 组合 | 适用场景 | 需要的实际材料 |
|---|---|---|
| Goal + make | 报告、调研、资料转化 | 已确认目标、有用中间产物、交付。 |
| Goal + TDD + make | 小步软件行为 | 目标、行为约定、测试、实际 red、实现、实际 green。 |
| Goal + SDD + TDD + make | 已选择规格方法的软件工作 | 原生规格文件加上述真实验证。 |

## 跑一个真实红绿例子

下面是 PowerShell 教程，从仓库根目录执行；只向新目录写入。已存在时换一个名字，并在后续命令里统一替换。

```powershell
$taskDir = '.work/tdd-handbook'
if (Test-Path -LiteralPath $taskDir) { throw '目录已存在，请选择新任务目录。' }
New-Item -ItemType Directory -Path "$taskDir/src", "$taskDir/tests" | Out-Null
'交付可运行的故事排序函数及例子，行为按 spec.md 验收。' | Set-Content "$taskDir/goal.md" -Encoding utf8
Get-Content examples/software-slice/goal.md -Raw | Set-Content "$taskDir/spec.md" -Encoding utf8 -NoNewline
Get-Content examples/software-slice/tests/acceptance.test.mjs -Raw | Set-Content "$taskDir/tests/acceptance.test.mjs" -Encoding utf8 -NoNewline
Get-Content examples/software-slice/starter.mjs -Raw | Set-Content "$taskDir/src/feature.mjs" -Encoding utf8 -NoNewline
Get-Content examples/software-slice/try.mjs -Raw | Set-Content "$taskDir/try.mjs" -Encoding utf8 -NoNewline
node skills/make-next-graph/scripts/make.mjs init --template software --out .work/tdd-handbook/graph.json
```

目标说明交付，spec 保存完整行为约定。这里的 plain spec 由教程提供；有原生规格时直接引用它。

目标还要求可执行例子，因此给实例化的图加两个明确节点，让交付依赖真实运行结果：

```powershell
@'
import { readFile, writeFile } from 'node:fs/promises';
const target = '.work/tdd-handbook/graph.json';
const graph = JSON.parse(await readFile(target, 'utf8'));
graph.changeReason = '交付包含例子源码及其真实运行结果。';
graph.nodes.push({
  id:'software.example-source', title:'给定例子源码', kind:'input',
  files:['try.mjs'], acceptance:'例子导入真实功能，并断言输出。'
}, {
  id:'software.example-run', title:'实际例子输出', kind:'check',
  files:['checks/example.json'],
  requires:['software.implementation','software.example-source'],
  acceptance:'真实运行退出 0，rankedIds 为 [8,2,9]。',
  check:{path:'checks/example.json'},
  recipe:{instructions:'执行 try.mjs 并保留原始输出。',writes:['checks/example.json']}
});
graph.nodes.find(node => node.id === 'software.delivery').requires.push('software.example-run');
await writeFile(target, JSON.stringify(graph, null, 2) + '\n');
'@ | node --input-type=module
node skills/make-next-graph/scripts/make.mjs validate .work/tdd-handbook/graph.json
```

先运行测试并保存 red：

```sh
node skills/make-next-graph/scripts/record.mjs .work/tdd-handbook/checks/red.json -- node --test .work/tdd-handbook/tests/acceptance.test.mjs
```

预期退出 **1**，四项测试因未实现行为产生真实断言失败。导入错误或环境错误应先排除，不能充当有效 red。
starter 文件已经存在，图可能建议 green；仍要读取 red、实现缺失行为。

实际项目自行实现 `src/feature.mjs`。为了查看本教程完成态，可以写入附带的参考实现：

```powershell
Get-Content examples/software-slice/feature.mjs -Raw | Set-Content .work/tdd-handbook/src/feature.mjs -Encoding utf8 -NoNewline
```

保持测试预期不变，再运行相同测试和真实例子：

```sh
node skills/make-next-graph/scripts/record.mjs .work/tdd-handbook/checks/green.json -- node --test .work/tdd-handbook/tests/acceptance.test.mjs
node skills/make-next-graph/scripts/record.mjs .work/tdd-handbook/checks/example.json -- node .work/tdd-handbook/try.mjs
```

预期：四项测试通过、无跳过；例子输出 `{"rankedIds":[8,2,9]}`，退出 0。
阅读实际源码和结果后，在任务目录写 `delivery.md`，说明入口、运行方法、原始检查路径和限制。

```sh
node skills/make-next-graph/scripts/make.mjs next .work/tdd-handbook/graph.json --json
```

交付文件与依赖齐备后，`evidenceReady` 应为 true。保留 red，不要在实现后重跑初始 red 来凑阶段。

## 引用原生 SDD 文件

先使用选定方法生成并编写原生文件，确认当前版本的实际目录。下面是文件路径示例；将 change、capability、feature 名换成项目实际名称。
命令中的规格绑定可以引用尚未生成的路径，但不存在的文件仍是当前缺口。

OpenSpec 形式：

```sh
node skills/make-next-graph/scripts/make.mjs init --template software --spec openspec/changes/my-change/specs/my-capability/spec.md --spec openspec/changes/my-change/tasks.md --out .work/change/graph.json
node skills/make-next-graph/scripts/make.mjs next .work/change/graph.json --root . --json
```

Spec Kit 形式，使用新的输出目录：

```sh
node skills/make-next-graph/scripts/make.mjs init --template software --spec specs/001-my-feature/spec.md --spec specs/001-my-feature/plan.md --spec specs/001-my-feature/tasks.md --out .work/feature/graph.json
node skills/make-next-graph/scripts/make.mjs next .work/feature/graph.json --root . --json
```

`--root .` 让产物路径从当前项目根解析。随后把 goal、测试、实现、检查等节点的路径改为实际文件。
绑定只替换引用，不会安装工具、执行 slash 命令或创建第二套同义规格。

## 保持组合轻量

- 一个行为切片用与风险相称的测试；普通文档无需套软件红绿流程。
- 原生任务勾选是工作说明，实际测试输出才是运行证据。
- 改目标后补对应行为验证，保留有价值的旧结果；新一轮证据可换新路径。
- 修改实现后运行相关检查；不为了刷新图里的时间提示重复整条链。

[软件示例原始说明](../../examples/software-slice/README.md) · [返回文档导航](../README.md)
