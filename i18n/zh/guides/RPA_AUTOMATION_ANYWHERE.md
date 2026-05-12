---
translation_source: guides/RPA_AUTOMATION_ANYWHERE.md
translation_source_hash: 165e60e4b3922f8353a3f038d815452ebf9ba7d597cb68f8c313eb47cb416eab
translation_quality: machine_v1
translation_lang: zh
translation_date: 2026-05-11T14:54:33.451595+00:00
---

# NAC3 + Automation Anywhere 集成指南

**NAC3 版本：** 2.2（含 v2.3 互操作预览）
**测试环境：** Automation Anywhere A2019 + A360

## 两种路径——根据 AA 版本选择

### 路径 A——A360 + Web Recorder + Run JavaScript

AA 的 `Run JavaScript Function` 动作会注入到当前活动的浏览器标签页中。

```js
// payload variable: NAC_ID = "invoice.save"
async function nacClick(id) {
  await window.NAC.click(id);
  return 'ok';
}
return nacClick($NAC_ID$);
```

在设计阶段绑定输入变量（`$NAC_ID$`、`$VALUE$`）；该动作返回一个字符串，机器人据此进行分支判断。

### 路径 B——A2019 + Object Cloning 配合自定义属性

A2019 的 `Object Cloning` 传统上通过 DOM 属性定位元素。配置属性选择器如下：

```
HTML.Attribute: data-nac-id
Search value: invoice.save
```

此方式不如路径 A 稳健（依赖 DOM 树的加载时序），但可让老旧的 A2019 机器人无需重写流程即可接入 NAC3。

## 标准 8 步机器人模板

适用于 v21 发票演示：

| 步骤 | 动作 | 载荷 |
|------|--------|---------|
| 1 | Open Browser | https://your-app.example.com/ |
| 2 | Wait | 等待 `window.NAC` 就绪（轮询 JS） |
| 3 | Loop CSV | 逐行遍历 |
| 4 | Run JS | `await window.NAC.click_by_verb('invoice','new')` |
| 5 | Run JS | `await window.NAC.fill('invoice.client',$row.client$)` |
| 6 | Run JS | `await window.NAC.fill('invoice.amount',$row.amount$)` |
| 7 | Run JS | `await window.NAC.click_by_verb('invoice','save')` |
| 8 | End Loop | -- |

无论 UI 复杂程度如何，始终只需 8 个动作。相比之下，基于 CSS 选择器的流程通常需要 30–60 个动作。

## 通过 `NAC.describe()` 进行发现

```js
return JSON.stringify(window.NAC.describe());
```

返回清单树结构。AA 可使用 `JSON Parse` 解析结果，并动态构建流程图。

## 来源验证与 isTrusted

AA 发出的是合成点击事件。宿主应用可能会拒绝执行敏感操作（如删除、支付），除非已将其明确加入白名单。宿主端的启用方式请参见 `RPA_UIPATH.md` 中的"Provenance"章节，同样适用于 AA。

## 错误处理

将每个 JS 调用包裹在 `try/catch` 中，并返回 JSON：

```js
try {
  await window.NAC.fill('@id@', '@value@');
  return JSON.stringify({ok: true});
} catch (e) {
  return JSON.stringify({ok: false, code: e.code, message: e.message});
}
```

使用 `If` 动作对解析后的 JSON 进行分支判断。

## 许可证与相关资源

Apache-2.0。更深入的说明请参见 [RPA_UIPATH.md](RPA_UIPATH.md)，其中的模式可 1:1 迁移使用。

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_AUTOMATION_ANYWHERE.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
