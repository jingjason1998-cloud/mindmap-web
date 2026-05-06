# MindMap Web 测试方案

## 一、测试目标

确保思维导图软件在编译、渲染、交互、功能各方面稳定可用。

---

## 二、测试环境

| 项目 | 版本/配置 |
|------|----------|
| 框架 | React 19 + TypeScript 6 |
| 构建 | Vite 8 |
| 样式 | Tailwind CSS 4 + @tailwindcss/vite |
| 状态 | Zustand |
| 测试 | Vitest + jsdom + @testing-library/react |

---

## 三、测试矩阵

### 3.1 编译构建测试（Build Tests）

| 编号 | 测试项 | 方法 | 通过标准 |
|------|--------|------|----------|
| B-01 | TypeScript 类型检查 | `tsc --noEmit` | 零错误 |
| B-02 | 生产构建 | `npm run build` | 成功生成 dist/ |
| B-03 | 无未使用变量 | `tsc` strict 模式 | 无 TS6133 错误 |
| B-04 | CSS 正确生成 | 检查 dist/assets/*.css | 自定义颜色类名存在 |

### 3.2 页面加载测试（Load Tests）

| 编号 | 测试项 | 方法 | 通过标准 |
|------|--------|------|----------|
| L-01 | HTML 正确返回 | curl / | 200 OK，含 root div |
| L-02 | JS 无语法错误 | curl /src/main.tsx | 无解析错误 |
| L-03 | CSS 无解析错误 | curl /src/index.css | `@theme` 被正确处理 |
| L-04 | React 正确挂载 | DOM 检查 | #root 有子元素 |

### 3.3 Store 状态测试（State Tests）

| 编号 | 测试项 | 方法 | 通过标准 |
|------|--------|------|----------|
| S-01 | 初始状态正确 | 调用 initialize() | 根节点存在，scale=1 |
| S-02 | 添加子节点 | addChild() | 子节点数+1，坐标有效 |
| S-03 | 添加同级节点 | addSibling() | 兄弟节点数+1 |
| S-04 | 删除节点 | deleteNode() | 节点及后代被移除 |
| S-05 | 禁止删除根节点 | deleteNode(rootId) | 节点数不变 |
| S-06 | 折叠/展开 | toggleCollapse() | collapsed 状态翻转 |
| S-07 | 更新文本 | updateNodeText() | 文本更新，布局重算 |

### 3.4 布局算法测试（Layout Tests）

| 编号 | 测试项 | 方法 | 通过标准 |
|------|--------|------|----------|
| LA-01 | mindmap-right | calculateTreeLayout | 子节点 x > 根节点 x |
| LA-02 | mindmap-left | calculateTreeLayout | 子节点 x < 根节点 x |
| LA-03 | mindmap-both | calculateTreeLayout | 子节点分布在左右两侧 |
| LA-04 | org-down | calculateTreeLayout | 子节点 y > 根节点 y |
| LA-05 | org-up | calculateTreeLayout | 子节点 y < 根节点 y |
| LA-06 | 坐标有效性 | 所有布局 | 无 NaN / Infinity |
| LA-07 | 深层嵌套 | 10层子节点 | 全部正确布局 |
| LA-08 | 大量兄弟 | 50个同级节点 | 全部正确布局 |

### 3.5 渲染引擎测试（Render Tests）

| 编号 | 测试项 | 方法 | 通过标准 |
|------|--------|------|----------|
| R-01 | 画布渲染 | render(App) | canvas 元素存在 |
| R-02 | 节点渲染 | 检查 DOM | 节点数 = store 节点数 |
| R-03 | 连线渲染 | 检查 SVG path | path 数 = 连接数 |
| R-04 | 虚拟渲染 | 视口外节点 | 不渲染视口外节点 |
| R-05 | 节点选中样式 | 点击节点 | 选中节点有高亮边框 |
| R-06 | 根节点特殊样式 | 检查 DOM | 根节点有蓝色背景 |

### 3.6 交互测试（Interaction Tests）

| 编号 | 测试项 | 触发方式 | 预期结果 |
|------|--------|----------|----------|
| I-01 | 单击选中 | mouseClick | 节点被选中，显示操作按钮 |
| I-02 | 双击编辑 | dblClick | 出现输入框，可修改文本 |
| I-03 | Tab 添加子节点 | keydown Tab | 选中节点下新增子节点 |
| I-04 | Enter 添加同级 | keydown Enter | 选中节点旁新增同级节点 |
| I-05 | Delete 删除 | keydown Delete | 选中节点被删除 |
| I-06 | 滚轮缩放 | wheel + Ctrl | scale 变化，百分比更新 |
| I-07 | 滚轮平移 | wheel | offsetX/Y 变化 |
| I-08 | 鼠标拖拽 | mousedown+mousemove | 画布跟随移动 |
| I-09 | 折叠节点 | 点击 +/- | 子树隐藏/显示，连线消失/出现 |
| I-10 | 布局切换 | select change | 节点重新排列，连线方向正确 |

### 3.7 导入导出测试（IO Tests）

| 编号 | 测试项 | 方法 | 通过标准 |
|------|--------|------|----------|
| IO-01 | JSON 导出 | exportToJSON | 包含完整数据结构 |
| IO-02 | JSON 导入 | importFromJSON | 数据正确恢复 |
| IO-03 | Markdown 导出 | exportToMarkdown | 层级大纲格式正确 |
| IO-04 | Markdown 导入 | importFromMarkdown | 树结构正确重建 |
| IO-05 | 无效 JSON 处理 | importFromJSON('bad') | 返回 null，不崩溃 |
| IO-06 | 无效 MD 处理 | importFromMarkdown('') | 返回 null，不崩溃 |

### 3.8 富文本测试（Rich Text Tests）

| 编号 | 测试项 | 输入 | 预期渲染 |
|------|--------|------|----------|
| RT-01 | 粗体 | `**粗体**` | `<strong>` |
| RT-02 | 斜体 | `*斜体*` | `<em>` |
| RT-03 | 代码 | `` `code` `` | `<code>` |
| RT-04 | 链接 | `[文本](url)` | `<a href>` |
| RT-05 | 图片 | `![alt](url)` | `<img>` |
| RT-06 | 混合内容 | `**粗体**和*斜体*` | 多个元素正确嵌套 |
| RT-07 | 备注编辑 | 输入备注文本 | 500ms 自动保存到 data.note |
| RT-08 | 链接编辑 | 输入 URL | 节点 data.link 更新 |
| RT-09 | 图片编辑 | 输入图片 URL | 节点 data.image 更新 |

### 3.9 边界条件测试（Edge Case Tests）

| 编号 | 测试项 | 场景 | 通过标准 |
|------|--------|------|----------|
| E-01 | 空导图 | 只有一个根节点 | 正常渲染 |
| E-02 | 单个叶子 | 根+1子节点 | 正常渲染 |
| E-03 | 深层嵌套 | 20层深度 | 不栈溢出，坐标有效 |
| E-04 | 大量节点 | 1000+节点 | 虚拟渲染生效，不卡顿 |
| E-05 | 空文本 | 节点文本为空字符串 | 显示占位或最小宽度 |
| E-06 | 超长文本 | 1000字文本 | 自动换行，不溢出 |
| E-07 | 快速操作 | 连续快速按键 | 状态一致，不丢失操作 |
| E-08 | 空 children | 折叠后无子节点 | +/- 按钮不显示 |

---

## 四、已知 Bug 与修复记录

### Bug #1：Tailwind CSS v4 `@theme` 指令未解析
- **现象**：`bg-primary-500`、`text-primary-600` 等自定义颜色类名未生成，页面样式缺失
- **根因**：未安装 `@tailwindcss/vite` 插件，Vite 无法处理 Tailwind v4 的 `@theme` 语法
- **修复**：`npm install -D @tailwindcss/vite`，在 `vite.config.ts` 中配置 `tailwindcss()` 插件
- **验证**：`grep "\.bg-primary-500" dist/assets/*.css` → 命中

### Bug #2：TypeScript `baseUrl` 废弃警告导致构建失败
- **现象**：`tsc -b` 报错 `Option 'baseUrl' is deprecated`
- **根因**：TypeScript 6.0 废弃了 `baseUrl`
- **修复**：`tsconfig.app.json` 添加 `"ignoreDeprecations": "6.0"`

### Bug #3：测试文件被 tsc 编译导致错误
- **现象**：测试文件中的 `global` 未定义、`calculateTreeLayout` 未使用等报错
- **根因**：`tsconfig.app.json` 的 `include: ["src"]` 包含了测试文件
- **修复**：添加 `"exclude": ["src/test"]`

### Bug #4：未使用变量导致构建失败（TS6133）
- **现象**：`endDrag`、`updateNodeText`、`selectedNodeId`、`calculateTreeLayout`、`rootSize` 等变量未使用
- **修复**：删除未使用的导入和变量声明

### Bug #5：jsdom 环境缺少 ResizeObserver
- **现象**：组件渲染测试报错 `ResizeObserver is not defined`
- **根因**：jsdom 未实现 ResizeObserver API
- **修复**：测试 setup 中 mock `global.ResizeObserver`

---

## 五、测试运行命令

```bash
# 运行全部测试
npx vitest run

# 运行特定测试文件
npx vitest run src/test/store.test.ts
npx vitest run src/test/layout.test.ts
npx vitest run src/test/exportImport.test.ts
npx vitest run src/test/App.test.tsx

# TypeScript 类型检查
npx tsc --noEmit

# 生产构建
npm run build
```

---

## 六、测试覆盖率目标

| 模块 | 目标覆盖率 |
|------|-----------|
| stores/mindMapStore.ts | 90% |
| utils/treeLayout.ts | 90% |
| utils/exportImport.ts | 85% |
| utils/richText.tsx | 80% |
| components/*.tsx | 70% |
