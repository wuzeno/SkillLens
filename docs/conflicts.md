# Skill 冲突检查：规则筛选 + 逐对语义审查

> v0.2.0 新增功能。它给出有条件、有原文依据的审查意见，不证明某个宿主已经发生运行冲突。

## 它检查什么

两个 Skill 都能单独通过文件检查，却可能对同一件事提出不能同时满足的要求。例如，一个要求自动修改文件，另一个要求修改前先取得同意；又如，一个要求最终回答只能用法语，另一个要求只能用德语。能否同时触发、是否存在例外、指令针对的对象和阶段是否相同，都需要逐对阅读后判断。

实现分两步：

1. **脚本整理证据。** 在同一次安全读取中收集入口快照，找有限的相反指令和 description 重叠候选。保存所有纳入范围的 Skill 对，不命中规则的也进入审查队列。重名仍只是原来的静态 warning，不自动变成语义冲突。
2. **当前 agent 逐对审查。** 阅读双方完整入口，包括例子、引用及其上下文，再判断共同适用场景、条件、例外、义务和建议。脚本可以复核该判断引用的文本及快照是否正确，不能证明其推理正确。

只跑第一步，不能宣称“已经检查完语义冲突”。已有的 WorkBuddy 测试覆盖本次四组演示的发现、运行和审查流程；它不代表宿主实际会把这些示例技能共同激活，也不代表全宿主兼容。

## 直接试用

从项目根目录运行，路径只用你明确授权检查的目录：

```sh
node skills/skill-lens/scripts/check.mjs examples/conflicts/approval --conflicts
node skills/skill-lens/scripts/check.mjs examples/conflicts/approval --conflicts --json
```

普通输出展示候选和证据；JSON 还包含完整的有界入口快照与逐对队列。对 agent 可以这样说：

> 用 skill-lens 检查这个明确指定的目录中有哪些指令冲突。不要只看重名或规则候选，请逐对阅读入口；分别说明双方原文、共同适用条件、是否无法同时履行，以及建议。没有审完的要说清楚。不要修改或执行被检查内容。

如果允许保存审查记录，再明确指定输出路径：

> 可以把审查 JSON 保存在我指定的项目目录，再用 --review 校验引用；不要修改任何被检查的技能。

`--conflicts` 启用顶层 schemaVersion 2；不加该参数仍返回原 schemaVersion 1。没有后台模型调用，也不会自动执行第二步。agent 使用当前会话模型，不需要新增 API 密钥，但仍受该服务已有的隐私条款约束。“脚本在本地跑”不等于“AI 会话离线”。

## 读懂结论

| 结果 | 含义 | 不能据此推出 |
| --- | --- | --- |
| potential_instruction_conflict | 有限规则发现了相反表述，等待语义审查 | 已确认冲突、其中一个 Skill 写错了 |
| trigger_overlap | description 的用词相近，值得检查是否会同时适用 | 宿主一定同时调用、互相覆盖 |
| conflict | agent 判断：双方共同适用时，有无法同时履行的要求 | 已观察到宿主故障、已验证加载顺序 |
| overlap | agent 判断：触发范围有交集，但未发现不可同时履行的要求 | 可以删除其中一个、两个包完全等价 |
| no_conflict_found | 在已读入口、给定条件下未发现不相容要求 | 所有支持文件、所有宿主、所有任务都相容 |
| needs_context | 条件、外部依赖或资料不足，暂不能判断 | 已解决、可忽略 |

`conflict` 是 **agent 的有条件判断**。文件修改是否已经授权、用户是否指定回复语言、输出是中间产物还是最终答案，都可能改变结论。权限与义务不同：“可以修改”不等于“必须修改”；“没有要求询问”也不等于“禁止询问”。

候选提取只覆盖部分中英写法：文件修改、修改前审批、联网、中文/英文回复、仅 JSON/Markdown 输出；复杂否定、同义改写、跨语言表达、任意工具策略及多行条件可能完全漏掉。代码块、引用和示例默认不参与规则提取，但原文保留给 agent 判断是否被正文采纳。description 相似度是启发式词元 Jaccard，不是语义相似度或冲突概率。没有命中候选的 Skill 对照样必须审查。

## 审查 JSON 与证据校验

`conflicts.review.sources` 保存入口相对路径、SHA-256、行号及原文；`conflicts.review.pairs` 给出稳定排序后的全部纳入配对。每份入口只保存一次。SHA-256 针对 CRLF 转 LF 后的整个入口，不覆盖支持文件。

审查文件使用下面的结构。必须替换为真实快照、配对路径和完整单行引文；每个配对恰好出现一次，顺序与队列一致。可以为同一文件引用多行，不能用省略号或拼接的片段代替原文。

```json
{
  "schemaVersion": 1,
  "snapshot": "取自 conflicts.snapshot",
  "decisions": [
    {
      "pair": ["a/SKILL.md", "b/SKILL.md"],
      "status": "needs_context",
      "applicability": "unknown",
      "conditions": "双方触发条件、目标对象、阶段，以及还缺什么条件。",
      "reason": "说明义务和例外；为什么冲突、能同时满足或尚不能判断。",
      "impact": "有条件的影响，不冒充真实运行结果。",
      "suggestion": "最小下一步，不自动修复。",
      "evidence": [
        {"file": "a/SKILL.md", "line": 5, "text": "a 文件第 5 行的完整原文"},
        {"file": "b/SKILL.md", "line": 5, "text": "b 文件第 5 行的完整原文"}
      ]
    }
  ]
}
```

`applicability` 只能为 `same_task`、`disjoint`、`unknown`。`conflict` 必须采用 `same_task`，且理由说明可满足的共同适用条件和不能同时履行的要求。文字是否真正证明这一点仍需人审，validator 只检查结构和证据。

在得到写入审查文件的许可后，用实际文件路径运行：

```sh
node skills/skill-lens/scripts/check.mjs examples/conflicts/approval --conflicts --review "你已保存的审查.json" --json
```

导入时重新扫描并比较快照，拒绝旧快照、漏配对、重复或反向配对、错误行号及不匹配的引文。审查文件只能是 4 MiB 以内的普通非符号链接 UTF-8 JSON 文件，可带 UTF-8 BOM；不是可执行模块。Windows PowerShell 5.1 的 `>` 默认可能写成 UTF-16，不可直接当作 UTF-8 JSON 输入；保存记录时请明确使用 UTF-8。决策和引文中的额外字段不会混入校验后的结果。

通过后仍有 `semanticTruthVerified: false`、`provenance: agent_assessment`、`hostBehaviorVerified: false`。`pendingPairs: 0` 只表示每对有了审查记录；`unresolvedPairs` 单独记录仍为 `needs_context` 的配对，不能把“看过了”说成“解决了”。

## 完整性、上限与退出码

静态 `coverage.complete` 和 `conflicts.coverage.complete` 不同：前者表示原有文件检查无操作中断；后者表示冲突证据包未因来源、配对、描述或候选预算缺失。两者都不表示语义审查完成；看 `semanticReview`、待审和未决数量。

冲突证据包最多包含 40 份入口，每份 24,000 个 JavaScript 字符单元、总计 200,000 个；截断只保留完整行。description 比较最多保留 4,096 个字符，超过时明确标记不完整。最多 780 个配对、300 个候选；确有候选被省略才记录遗漏。每对相反指令最多展示 20 组匹配样本，达到时标记 `matchEvidenceCapped`；这不是完整语义覆盖率。预算不会自动扩大。

源文件仍受原有读取、目录及符号链接边界约束。静态扫描读取失败时，遗漏入口不在配对总数中，另有明确不完整标记。源文、描述、配对或候选超限时返回退出码 2；不接受对不完整包的“全量审查”。需要分组时，让用户确认分组范围；只检查组内时，组间配对仍未审查，不能把各组结果拼成全库相容结论。

候选或 agent 的 conflict 判断不改变原来的静态 error/warning/info 计数，也不以语义判断决定 CI 失败。退出码 0 仍可能待审或存在 agent 判断的冲突；1 表示原有静态 error；2 还包括证据包不完整或审查 JSON 无效。语义门禁应由使用方读取 JSON 并制定策略，不能把 exit 0 当作全部相容。

## 成对演示

仓库中的演示是人为构造的，不是真实用户故障或通用准确率测量：

| 目录 | 想验证的问题 | 有条件的审查预期 |
| --- | --- | --- |
| examples/conflicts/approval | 自动修改 vs 修改前先询问 | 同一未获批修复任务下不相容 |
| examples/conflicts/conditional | 已获批才修改 vs 未获批不修改 | 条件相容，不能只见正反动词就判冲突 |
| examples/conflicts/language | 法语最终答案 vs 德语最终答案 | 正则没命中，逐对阅读仍应发现排他要求 |
| examples/conflicts/overlap | 相同任务描述、双方只读 | 可有触发重叠，无行为矛盾证据 |

安装时仍只复制 `skills/skill-lens/`，保留整个 `scripts/` 目录与 LICENSE，不安装这些示例。本次新增能力已有一次用户在 WorkBuddy 运行四组成对演示的有限证据，审查记录已再次校验且测试入口字节哈希未变，见[验证记录](verification.md#2026-10-31-workbuddy-user-run-conflict-review)。这不是全宿主兼容性证明；也不要把既有 v0.1.0 的远程 CI 当作 v0.2.0 已通过的证据。
