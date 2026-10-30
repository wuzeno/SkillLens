# SkillLens

检查 Skill 有没有重名、配置缺项或本地链接失效。

SkillLens 也会找出内容完全相同的入口文件。具体检查由自带的 Node.js 脚本完成，只读取文件，可以重复运行。Skill 负责确认要查哪个目录，再解释结果、给出建议。

[English](README.md) · [规则与限制](docs/rules.md) · [报告示例](docs/reporting.md) · [安全边界](SECURITY.md) · [发布清单](docs/releasing.md)

> v0.1.0 还是早期预览版。它不能判断 agent 会优先加载哪个 Skill，也不能确认两段自然语言指令是否冲突。它不会自动修复文件，检查通过也不代表获得了安全认证。
>
> 项目叫 SkillLens，安装时用的名字是 `skill-lens`，仓库在 [wuzeno/SkillLens](https://github.com/wuzeno/SkillLens)。包名和商标是否可用，目前还没有核实。

## 本地试用

需要 Node.js 22+。检查脚本不依赖其他运行时包，不用 npm install，也不需要模型 API 或密钥，可以离线运行。

在项目目录运行：

```sh
node skills/skill-lens/scripts/check.mjs examples/broken
node skills/skill-lens/scripts/check.mjs examples/healthy --json
node --test
```

故障样例应该能查出重名、链接指向的文件不存在、缺少元数据这几类问题，退出码为 1。健康样例应该没有发现问题，退出码为 0。这些样例是为测试准备的，不是真实用户案例。

Windows 如果不允许运行 npm.ps1，可以用 npm.cmd test 或 node --test，不用修改系统执行策略。

## 安装与使用

只需要安装 `skills/skill-lens/`，保留里面的入口文件、脚本和 LICENSE 许可声明。examples 里的故障样例用于测试，不要一起装进去。

手动安装时，把这个目录复制到你配置好的 agent 技能目录。不同 agent 的路径不同，需要你自己确认；SkillLens 不会自动查找或修改配置。也可以使用第三方 skills 安装器，在本地仓库里运行：

```sh
npx skills add . --skill skill-lens
```

从 GitHub 安装则运行下面的命令，按提示选择 agent 和安装范围：

```sh
npx skills add wuzeno/SkillLens --skill skill-lens
```

如果只想看看安装器能否找到这个技能，不想安装，在命令后加上 `--list`。

第三方安装器可能联网或修改技能目录。不想用安装器也没关系，检查脚本可以单独运行。安装器能找到技能，不代表你用的 agent 一定能加载和调用它；静态检查也不能证明所有 agent 都兼容。

安装后，可以对 agent 说：

> 使用 skill-lens，只检查我明确授权的目录。区分错误、风险与未知，不要修改任何文件。

也可以直接运行脚本：

```sh
node skills/skill-lens/scripts/check.mjs "明确授权的目录" --json
```

每次只查你指定的一个目录。脚本会查找 SKILL.md 并读取正文，但不会继续读取它引用的文档，也不会执行被检查文件中的命令、上传内容，或向扫描目录写入、修改文件。

检查脚本在本地运行，不代表整个 AI 会话都离线。通过 agent 使用时，仍需留意该服务的隐私政策。

## 读懂报告

| 退出码 | 含义 |
| --- | --- |
| 0 | 没有 error，仍可能有 warning/info；也可能没有找到技能。 |
| 1 | 有 error，且在已声明规则范围内无操作性中断。 |
| 2 | 参数错误、根目录无法访问或扫描因访问/大小限制不完整。 |

报告会列出发现了什么、依据是什么、建议怎么处理，并附上规则编号、严重程度和相对路径；能定位到行时，也会给出行号。

JSON 中的 coverage.complete 只表示这次扫描在规定范围内没有中断。它不表示所有语法、agent 的加载行为和安全问题都查过了。

有些结果还需要你判断：名字相同，不一定会互相覆盖；入口文件相同，不代表整个技能包相同；失效链接指向的也可能只是可选内容。

元数据解析器只能处理部分 YAML 写法。遇到不支持的语法，会标记为未验证，不会直接认定源文件有错。链接检查只针对以 ./ 或 ../ 开头的内联 Markdown 链接和图片路径。

## 工程范围

目前不处理依赖版本的选择，不自动安装、同步或修复 Skill，也不探测命令依赖、不让模型给指令做语义评分。先把现有的几类检查做好。

测试包含正常和故障样例，也检查符号链接、越界引用、扫描限制、报告是否稳定以及退出码是否正确。首次公开的源码已通过 Linux、Windows、macOS 与 Node 22/24 的全部六组 CI，详见[带日期的验证记录](docs/verification.md#2026-10-30-github-publication-evidence)和[当前 CI 运行](https://github.com/wuzeno/SkillLens/actions)。这些测试通过，不代表已经在所有真实 agent 中验证过。

规则、文件大小限制、跳过的目录、贡献要求和发布检查都在对应文档里。项目使用 MIT 许可，没有复制 Hallmark 的代码或素材。
