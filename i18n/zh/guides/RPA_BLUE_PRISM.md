---
translation_source: guides/RPA_BLUE_PRISM.md
translation_source_hash: 7ab698b35a99ca25e77a07599f1aa733b4ba42eb08d0f3bce785a9b0c7f7e276
translation_quality: machine_v1
translation_lang: zh
translation_date: 2026-05-11T14:54:41.035450+00:00
---

# NAC3 + Blue Prism 集成指南

**NAC3 版本：** 2.2（含 v2.3 互操作预览）
**测试环境：** Blue Prism 7.1 + Browser Automation v7.1。

Blue Prism 的 `Browser` 业务对象开箱即提供 `Inject JavaScript`。NAC3 + Blue Prism 采用五阶段模式。

## 阶段流程

1. **Login Agent** -- 标准步骤。
2. **Navigate** -- 打开符合 NAC 规范的应用。
3. **JS: wait for window.NAC3** -- 轮询直至就绪。
4. **JS: NAC.click / fill / tab** -- 规范化调度。
5. **JS: read describe()** -- 内省清单，用于下一轮数据流迭代。

## 示例 VBO（Visual Business Object）

```
Object: NAC Driver
Action: Click NAC ID
  Inputs:
    - nacId (Text)
  Code (Inject JavaScript):
    (async () => {
      try {
        await window.NAC.click([nacId]);
        return JSON.stringify({ok:true});
      } catch (e) {
        return JSON.stringify({ok:false, code:e.code, message:e.message});
      }
    })()
  Outputs:
    - resultJson (Text)
```

镜像动作：`Click By Verb`、`Fill`、`Select`、`Tab`、
`Describe`、`WaitForAck`。

## 等待确认模式

`NAC.click()` 内部已等待 `nac:action:succeeded` 事件（超时 5 秒）。Blue Prism 可在此基础上叠加额外的显式等待：

```js
return new Promise(resolve => {
  let acked = false;
  document.addEventListener('nac:action:succeeded', function (e) {
    if (e.detail.action_id === '[expectedId]') {
      acked = true;
      resolve('ok');
    }
  }, { once: true });
  setTimeout(() => { if (!acked) resolve('timeout'); }, [timeoutMs]);
});
```

该模式将 NAC3 规范事件族暴露至 Blue Prism 的阶段输出中，便于对流程进行分支控制。

## 发现

`Read Manifest` 动作：

```js
return JSON.stringify(window.NAC.describe());
```

将结果导入 Collection。流程可在不重新编译阶段的情况下适应清单 schema 变更。

## 许可证 + 参见

Apache-2.0。更全面的说明请参阅 [RPA_UIPATH.md](RPA_UIPATH.md)。

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_BLUE_PRISM.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
