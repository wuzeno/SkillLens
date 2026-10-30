# SkillLens

**一个帮你体检 Skill 的 Skill：给证据，不靠猜。**

检查入口元数据、重名、相同入口文件和失效的本地 Markdown 目标。Skill 负责确认范围、解释报告和提出建议；自带的 Node.js 脚本负责可重复的静态检查。

[English](README.md) · [规则与限制](docs/rules.md) · [报告示例](docs/reporting.md) · [安全边界](SECURITY.md) · [发布清单](docs/releasing.md)

> v0.1.0 早期预览。当前不判断宿主加载优先级、不证明自然语言指令冲突、不自动修复，也不是安全认证。项目名称已选定为 SkillLens，安装标识为 `skill-lens`；仓库为 [wuzeno/SkillLens](https://github.com/wuzeno/SkillLens)，尚未核实包名或商标是否可用。

## 本地试用

需要 Node.js 22+。检查器无运行时依赖，不需要 npm install、模型 API、密钥或联网。

在项目目录运行：

```sh
node skills/skill-lens/scripts/check.mjs examples/broken
node skills/skill-lens/scripts/check.mjs examples/healthy --json
node --test
```

故障演示应发现重名、缺失链接目标和缺少元数据，退出码为 1；健康演示应无发现，退出码为 0。这些是构造的测试样例，不是真实用户案例。

Windows 如果禁止运行 npm.ps1，可用 npm.cmd test 或 node --test，不需要修改系统执行策略。

## 安装与使用

安装单元只有 `skills/skill-lens/`，须保留其中的入口、脚本和 LICENSE 许可声明；不要把 examples 里的故障样例当成技能安装。

可把此目录复制到你已明确配置的 agent 技能目录。不同宿主路径不同，本项目不自动发现或修改配置。若使用第三方 skills 安装器，可在本地仓库内运行：

```sh
npx skills add . --skill skill-lens
```

也可从 GitHub 安装，并按提示选择目标 agent 与安装范围：

```sh
npx skills add wuzeno/SkillLens --skill skill-lens
```

仅查看能否发现技能而不安装，可追加 `--list`。第三方安装器可能联网、修改技能目录；它不是检查器运行的必要条件。远程发现成功不代表任意宿主都能实际加载和调用，不能将静态扫描结果当作全宿主兼容证明。

向 agent 提出：

> 使用 skill-lens，只检查我明确授权的目录。区分错误、风险与未知，不要修改任何文件。

也可直接调用脚本：

```sh
node skills/skill-lens/scripts/check.mjs "明确授权的目录" --json
```

每次只扫描一个指定目录。发现名为 SKILL.md 的入口，读取其正文；不递归读取其引用文档的内容、不执行任何被扫描命令、不上传内容、不写入扫描目标。Agent 服务本身的隐私政策仍适用，不能把检查器本地运行理解为整个 AI 会话完全离线。

## 读懂报告

| 退出码 | 含义 |
| --- | --- |
| 0 | 没有 error，仍可能有 warning/info；也可能没有找到技能。 |
| 1 | 有 error，且在已声明规则范围内无操作性中断。 |
| 2 | 参数错误、根目录无法访问或扫描因访问/大小限制不完整。 |

每条发现提供规则编号、严重程度、相对路径、可用时的行号、证据和建议。JSON 的 coverage.complete 只表示在已声明范围内无操作性中断，不等于所有语法、宿主行为和安全性都已检查。

同名不等于覆盖；相同入口不等于相同技能包；失效链接可能是可选内容。元数据解析器仅支持有限 YAML 子集，不支持的语法会标记为未验证，而非断言源文件错误。只检查以 ./ 或 ../ 开头的内联 Markdown 链接和图片目标。

## 工程范围

当前刻意不做版本求解、自动安装、自动同步、自动修复、命令依赖探测和模型语义评分。优先把窄范围检查做准。

测试覆盖正常与故障样例、符号链接、越界引用、扫描限制、稳定报告和退出码。首次公开源码已通过 Linux、Windows、macOS 与 Node 22/24 的全部六组 CI，见[带日期的验证记录](docs/verification.md#2026-10-30-github-publication-evidence)与[当前 CI 运行](https://github.com/wuzeno/SkillLens/actions)。这不等于真实 agent 兼容性已经全部验证。

规则细节、大小限制、排除目录、贡献原则和发布检查见对应文档。MIT 许可。未复制 Hallmark 的代码或素材。
