# Type Errors 可视化 - 组件架构设计

## 架构概览

基于 Cycle.js 的 `@cycle/state` 和 `@cycle/isolate` 机制，将应用分解为可组合的子组件。

```
TypeErrorsApp (Root)
├── ControlPanel (isolated with 'params')
│   └── 4个滑块控件
│       ├── alpha
│       ├── nullMean
│       ├── trueMean
│       └── stdDev
└── Chart (stateless, props-based)
    ├── NullDistribution (分布曲线)
    ├── TrueDistribution (分布曲线)
    ├── CriticalLine (临界值线)
    ├── Type1ErrorArea (第一类错误区域)
    ├── Type2ErrorArea (第二类错误区域)
    ├── XAxis (X轴)
    └── HypothesisText (假设文本)
```

## 实际实现的组件结构

**注意**: 当前实现采用了简化架构，专注于核心组件的分离：

```
src/components/
├── TypeErrorsApp/          # 根组件
│   ├── index.ts            # 组合 ControlPanel 和 Chart
│   ├── types.ts            # AppState 接口
│   ├── intent.ts           # 处理 CONFIG driver
│   ├── model.ts            # 计算衍生状态
│   └── view.ts             # 组合子组件的 DOM
├── ControlPanel/           # 控制面板组件
│   ├── index.ts            # 组件入口
│   ├── types.ts            # ParamsState 接口
│   ├── intent.ts           # 滑块事件 → actions
│   ├── model.ts            # actions → reducers
│   └── view.ts             # 渲染滑块 UI
└── Chart/                  # 图表组件
    ├── index.ts            # 组件入口
    ├── types.ts            # ChartProps 接口
    ├── view.ts             # 渲染 SVG 和子组件
    ├── graph.ts            # D3 可视化函数
    └── axes.ts             # 坐标轴组件
```

## 组件职责划分

### 1. TypeErrorsApp (Root Component)
**文件**: `src/components/TypeErrorsApp/index.ts`

**职责**：
- 组合 ControlPanel 和 Chart 组件
- 管理全局状态树（config, params, computed）
- 从 CONFIG driver 读取配置
- 计算衍生状态（scales, distributions, critical values）
- 使用 `withState` 包装，提供状态管理

**State** (AppState):
```typescript
interface AppState {
  config: {
    width: number;
    height: number;
    testType: string;
  };
  params: {
    alpha: number;
    nullMean: number;
    trueMean: number;
    stdDev: number;
  };
  computed: {
    scales: Scales;
    nullDistribution: DistributionPoint[];
    trueDistribution: DistributionPoint[];
    criticalValue: number[];
    criticalAreaFn: (d: DistributionPoint, c: number[]) => boolean;
    hypothesisText: {
      H0: string;
      H1: string;
    };
  };
}
```

**Sources**:
```typescript
interface Sources {
  DOM: DOMSource;
  state: StateSource<AppState>;
  CONFIG: Stream<Config>;
}
```

**Sinks**:
```typescript
interface Sinks {
  DOM: Stream<VNode>;
  state: Stream<Reducer<AppState>>;
}
```

**关键实现**:
```typescript
// 使用 isolate 隔离 ControlPanel 到 'params' 键
const controlPanelSinks = isolate(ControlPanel, 'params')({
  DOM: sources.DOM,
  state: sources.state
});

// 将子组件的 reducer 提升到父组件
const paramsReducer$ = controlPanelSinks.state.map(
  childReducer => (prev: AppState) => ({
    ...prev,
    params: childReducer(prev.params)
  })
);

// 创建 props 流传递给 Chart
const chartProps$ = sources.state.stream.map(state => ({
  scales: state.computed.scales,
  nullDistribution: state.computed.nullDistribution,
  // ... 其他 computed 字段
}));
```

### 2. ControlPanel (有状态组件)
**文件**: `src/components/ControlPanel/index.ts`

**职责**：
- 承载 4 个滑块控件（alpha, nullMean, trueMean, stdDev）
- 捕获用户输入并生成 actions
- 通过 reducer 更新 params 状态
- 被 `isolate(ControlPanel, 'params')` 隔离到父状态树的 'params' 键

**State** (ParamsState):
```typescript
interface ParamsState {
  alpha: number;      // 默认 0.05, 范围 0.01-0.20
  nullMean: number;   // 默认 0, 范围 0-2
  trueMean: number;   // 默认 1, 范围 0-3
  stdDev: number;     // 默认 1, 范围 0.1-2
}
```

**Sources**:
```typescript
interface Sources {
  DOM: DOMSource;
  state: StateSource<ParamsState>;
}
```

**Sinks**:
```typescript
interface Sinks {
  DOM: Stream<VNode>;
  state: Stream<Reducer<ParamsState>>;
}
```

**关键实现**:
```typescript
// Intent: 从 DOM 提取 actions
function intent(sources: Sources): Actions {
  return {
    alpha$: sources.DOM.select('#alpha').events('input')
      .map(ev => parseFloat((ev.target as HTMLInputElement).value)),
    // ... 其他滑块
  };
}

// Model: actions → reducers
function model(actions: Actions) {
  const defaultReducer = () => ({
    alpha: 0.05,
    nullMean: 0,
    trueMean: 1,
    stdDev: 1
  });

  const alphaReducer$ = actions.alpha$.map(
    alpha => (prev: ParamsState) => ({ ...prev, alpha })
  );

  return {
    reducer$: xs.merge(
      xs.of(defaultReducer),
      alphaReducer$,
      // ... 其他 reducers
    )
  };
}
```

### 3. Chart (无状态组件)
**文件**: `src/components/Chart/index.ts`

**职责**：
- SVG 容器管理
- 渲染所有可视化子组件
- 通过 props 接收数据（纯展示组件）
- 不维护独立状态

**Props** (ChartProps):
```typescript
interface ChartProps {
  scales: Scales;
  nullDistribution: DistributionPoint[];
  trueDistribution: DistributionPoint[];
  criticalValue: number[];
  criticalAreaFn: (d: DistributionPoint, c: number[]) => boolean;
  hypothesisText: { H0: string; H1: string; };
  width: number;
  height: number;
}
```

**Sources**:
```typescript
interface Sources {
  props: Stream<ChartProps>;
}
```

**Sinks**:
```typescript
interface Sinks {
  DOM: Stream<VNode>;
}
```

**关键实现**:
```typescript
// 无状态组件，直接从 props 渲染
function Chart(sources: Sources): Sinks {
  const vdom$ = sources.props.map(props =>
    view(props)  // 返回 VNode
  );
  return { DOM: vdom$ };
}
```

**子组件** (在 graph.ts 和 axes.ts 中实现):
- `NullDistribution` - 零假设分布曲线
- `TrueDistribution` - 真实分布曲线
- `CriticalLine` - 临界值线
- `Type1ErrorArea` - 第一类错误区域（红色）
- `Type2ErrorArea` - 第二类错误区域（蓝色）
- `XAxis` - X 轴
- `HypothesisText` - 假设文本

## 数据流设计

### 完整数据流

```
┌─────────────────────────────────────────────────────────────┐
│                   TypeErrorsApp (Root)                       │
│                                                              │
│  State Tree:                                                 │
│  {                                                           │
│    config: {...},      ┈┈┈▶ Read-only from CONFIG driver    │
│    params: {...},      ┈┈┈▶ Managed by ControlPanel (isolated)│
│    computed: {...}    ┈┈┈▶ Computed from params + config    │
│  }                                                           │
└──────────────────┬──────────────────────┬───────────────────┘
                   │                      │
           ┌───────▼────────┐     ┌──────▼──────┐
           │ ControlPanel   │     │    Chart    │
           │ (isolated)     │     │ (stateless) │
           │ 'params' key   │     │  props      │
           └───────┬────────┘     └─────────────┘
                   │
           User Input (Sliders)
                   │
           ┌───────▼─────────┐
           │  Intent         │
           │  (DOM → Actions)│
           └───────┬─────────┘
                   │
           ┌───────▼─────────┐
           │  Model          │
           │  (Actions →     │
           │   Reducers)     │
           └───────┬─────────┘
                   │
           Reducer Stream (via state sink)
                   │
           ┌───────▼─────────────────────┐
           │  TypeErrorsApp merges       │
           │  child reducer              │
           └───────┬─────────────────────┘
                   │
           ┌───────▼─────────┐
           │  Update params  │
           │  in state tree  │
           └───────┬─────────┘
                   │
           ┌───────▼─────────┐
           │  Recompute      │
           │  computed state │
           │  (model.ts)     │
           └───────┬─────────┘
                   │
           ┌───────▼─────────┐
           │  Update Chart   │
           │  props stream   │
           └───────┬─────────┘
                   │
           ┌───────▼─────────┐
           │  Re-render      │
           │  Chart          │
           └─────────────────┘
```

### Reducer 流向详解

```
1. 用户调整滑块
   ↓
2. ControlPanel.intent() 捕获 DOM 事件
   ↓
3. 转换为 action stream (e.g., alpha$: 0.05 → 0.08)
   ↓
4. ControlPanel.model() 将 action 转换为 reducer
   ↓
5. Reducer 通过 state sink 向上传递
   ↓
6. TypeErrorsApp 接收 child reducer
   ↓
7. 将 child reducer 提升为 parent reducer
   (prev) => ({ ...prev, params: childReducer(prev.params) })
   ↓
8. @cycle/state 应用 reducer，更新 state.params
   ↓
9. TypeErrorsApp.model() 监听 state.params 变化
   ↓
10. 重新计算 computed state
    (scales, distributions, critical values)
   ↓
11. 更新 state.computed
   ↓
12. Chart 接收新的 props 流
   ↓
13. 触发 Chart 重新渲染
```

## 组件隔离策略

### 实际使用的 isolate 模式

在当前实现中，`isolate` 仅用于隔离 ControlPanel 组件：

```typescript
// TypeErrorsApp/index.ts
const controlPanelSinks = isolate(ControlPanel, 'params')({
  DOM: sources.DOM,
  state: sources.state
});
```

**工作原理**:
- `isolate(Component, 'key')` 将子组件的状态隔离到父状态的 `key` 字段
- ControlPanel 看到的是自己的 `ParamsState`，而不是完整的 `AppState`
- ControlPanel 输出的 reducer 会自动更新 `state.params` 字段
- 不需要手动管理状态的嵌套结构

### 为什么 Chart 不需要 isolate

Chart 是一个**纯展示组件**（stateless component）：
- 通过 `props` 流接收所有数据
- 不维护独立状态
- 不需要状态隔离
- 更简单，更易测试

### isolate 的优势

1. **避免状态冲突** - 多个组件实例不会相互干扰
2. **简化状态管理** - 子组件只需关注自己的状态
3. **自动状态提升** - 子状态自动合并到父状态树
4. **支持组件复用** - 同一组件可多次实例化

### 示例：如果需要多个 Slider

如果将来需要将 ControlPanel 拆分为独立的 Slider 组件：

```typescript
// 可能的未来实现
const AlphaSlider = isolate(Slider, 'alpha');
const NullMeanSlider = isolate(Slider, 'nullMean');
const TrueMeanSlider = isolate(Slider, 'trueMean');
const StdDevSlider = isolate(Slider, 'stdDev');

// 状态树会变成：
{
  alpha: { value: 0.05 },
  nullMean: { value: 0 },
  trueMean: { value: 1 },
  stdDev: { value: 1 }
}
```

当前实现选择了更简单的方案：所有滑块在 ControlPanel 内管理，状态结构更扁平。

## 文件结构

```
src/
├── main.ts                      # 应用入口，配置驱动
├── drivers/
│   └── config-driver.ts         # 自定义 CONFIG driver
├── components/
│   ├── TypeErrorsApp/           # 根组件
│   │   ├── index.ts             # 组件入口
│   │   ├── types.ts             # AppState, Sources, Sinks
│   │   ├── intent.ts            # 处理 CONFIG driver
│   │   ├── model.ts             # 计算衍生状态
│   │   └── view.ts              # 组合子组件 DOM
│   ├── ControlPanel/            # 控制面板组件
│   │   ├── index.ts             # 组件入口
│   │   ├── types.ts             # ParamsState, Actions
│   │   ├── intent.ts            # DOM → Actions
│   │   ├── model.ts             # Actions → Reducers
│   │   └── view.ts              # 渲染滑块 UI
│   └── Chart/                   # 图表组件
│       ├── index.ts             # 组件入口
│       ├── types.ts             # ChartProps
│       ├── view.ts              # 渲染 SVG 和子组件
│       ├── graph.ts             # D3 可视化函数
│       └── axes.ts              # 坐标轴组件
├── types/
│   └── jstat.d.ts               # jStat 类型定义
└── utils/
    └── dom-helper.ts            # DOM 辅助函数

test/
├── components/
│   ├── TypeErrorsApp/
│   │   └── model.test.ts        # 模型测试
│   ├── ControlPanel/
│   │   ├── intent.test.ts       # Intent 测试
│   │   └── model.test.ts        # 模型测试
│   └── Chart/
│       └── view.test.ts         # View 测试
└── helpers/
    └── test-utils.ts            # 测试辅助工具
```

## 关键设计模式

### 1. Props Down, Reducers Up

这是组件间通信的核心模式：

```typescript
// Parent (TypeErrorsApp)
function TypeErrorsApp(sources) {
  // 1. Props Down: 通过 state.stream 向下传递状态
  const childSources = {
    DOM: sources.DOM,
    state: sources.state  // 子组件通过 isolate 访问自己的状态
  };

  const childSinks = isolate(Child, 'params')(childSources);

  // 2. Reducers Up: 子组件的 reducer 向上传递
  const childReducer$ = childSinks.state.map(
    childReducer => (prev: AppState) => ({
      ...prev,
      params: childReducer(prev.params)  // 更新嵌套状态
    })
  );

  return {
    DOM: view(childSinks.DOM),
    state: xs.merge(parentReducer$, childReducer$)
  };
}
```

### 2. Computed State Pattern

根组件负责计算衍生状态：

```typescript
// TypeErrorsApp/model.ts
function model(actions, sources) {
  // 监听 params 变化
  const params$ = sources.state.stream
    .map(state => state.params);

  // 从 params 计算衍生状态
  const scales$ = params$.map(params => createScales(params, config));
  const nullDist$ = params$.map(params => generateNullDistribution(params));
  const trueDist$ = params$.map(params => generateTrueDistribution(params));

  // 合并所有计算状态
  const computedReducer$ = xs.combine(
    scales$, nullDist$, trueDist$, criticalValue$, hypothesisText$
  ).map(([scales, nullDist, trueDist, cv, text]) =>
    (prev: AppState) => ({
      ...prev,
      computed: { scales, nullDistribution: nullDist, ... }
    })
  );

  return { reducer$: computedReducer$ };
}
```

### 3. Stateless Component Pattern

Chart 组件通过 props 接收数据，不维护状态：

```typescript
// Chart/index.ts
function Chart(sources: Sources): Sinks {
  const vdom$ = sources.props.map(props =>
    div('.chart', [
      renderNullDistribution(props.nullDistribution, props.scales),
      renderTrueDistribution(props.trueDistribution, props.scales),
      renderCriticalLine(props.criticalValue, props.scales),
      // ...
    ])
  );

  return { DOM: vdom$ };
}

// TypeErrorsApp/view.ts
const chartProps$ = sources.state.stream.map(state => ({
  scales: state.computed.scales,
  nullDistribution: state.computed.nullDistribution,
  // ...
}));

const chartSinks = Chart({ props: chartProps$ });
```

### 4. Reducer Pattern with Default State

使用 `defaultReducer` 替代 `startWith`：

```typescript
// ControlPanel/model.ts
function model(actions: Actions) {
  // ❌ 旧方式：使用 startWith
  // const state$ = actions.alpha$.startWith(0.05);

  // ✅ 新方式：使用 defaultReducer
  const defaultReducer = () => ({
    alpha: 0.05,
    nullMean: 0,
    trueMean: 1,
    stdDev: 1
  });

  const alphaReducer$ = actions.alpha$.map(
    alpha => (prev) => ({ ...prev, alpha })
  );

  return {
    reducer$: xs.merge(
      xs.of(defaultReducer),  // 首先初始化
      alphaReducer$           // 然后响应更新
    )
  };
}
```

### 5. Strategy Pattern for Test Types

不同的检验类型使用不同的策略：

```typescript
const TestStrategy = {
  'right-tailed': {
    criticalAreaFn: (d, c) => d.x > (c[0] ?? 0),
    hypoText: (nullMean) => ({
      H0: `H₀: μ = ${nullMean}`,
      H1: `Hₐ: μ > ${nullMean}`
    })
  },
  'left-tailed': {
    criticalAreaFn: (d, c) => d.x < (c[0] ?? 0),
    hypoText: (nullMean) => ({
      H0: `H₀: μ = ${nullMean}`,
      H1: `Hₐ: μ < ${nullMean}`
    })
  },
  'two-tailed': {
    criticalAreaFn: (d, c) => d.x < (c[0] ?? 0) || d.x > (c[1] ?? 0),
    hypoText: (nullMean) => ({
      H0: `H₀: μ = ${nullMean}`,
      H1: `Hₐ: μ ≠ ${nullMean}`
    })
  }
};
```

## 迁移步骤（从单体到组件化）

### 重构前的架构（单体）

```
src/type-errors/
├── index.ts         # 所有逻辑在一个文件
├── model.ts         # 集中式状态管理
├── graph.ts         # 可视化组件
└── axes.ts          # 坐标轴组件
```

### Phase 1: 安装依赖和设置基础架构 ✅

1. **安装依赖**
   ```bash
   npm install @cycle/state @cycle/isolate
   ```

2. **更新 main.ts**
   ```typescript
   import { withState } from "@cycle/state";

   const main = withState(TypeErrorsApp);
   ```

3. **创建组件目录结构**
   ```bash
   src/components/
   ├── TypeErrorsApp/
   ├── ControlPanel/
   └── Chart/
   ```

### Phase 2: 实现 ControlPanel 组件 ✅

1. **创建类型定义** (`ControlPanel/types.ts`)
   - `ParamsState` - 4个参数的状态
   - `Actions` - 意图流的类型
   - `Sources` 和 `Sinks`

2. **实现 Intent** (`ControlPanel/intent.ts`)
   - 从 DOM 事件提取 actions
   - 为每个滑块创建独立的 action 流

3. **实现 Model** (`ControlPanel/model.ts`)
   - 使用 `defaultReducer` 初始化状态
   - 将每个 action 转换为 reducer
   - 使用 `xs.merge` 合并所有 reducers

4. **实现 View** (`ControlPanel/view.ts`)
   - 渲染 4 个滑块控件
   - 显示当前值

5. **测试 ControlPanel**
   - Intent 测试：验证 DOM 事件正确转换为 actions
   - Model 测试：验证 reducer 正确更新状态

### Phase 3: 实现 TypeErrorsApp 根组件 ✅

1. **创建类型定义** (`TypeErrorsApp/types.ts`)
   - `AppState` - 包含 config, params, computed
   - `Sources` - 包含 DOM, state, CONFIG
   - `Sinks` - DOM 和 state

2. **实现 Intent** (`TypeErrorsApp/intent.ts`)
   - 处理 CONFIG driver（配置驱动）
   - 不需要处理 DOM 事件（由子组件处理）

3. **实现 Model** (`TypeErrorsApp/model.ts`)
   - 监听 `state.params` 变化
   - 重新计算 `computed` 状态
   - 生成更新 `state.computed` 的 reducer

4. **实现 View** (`TypeErrorsApp/view.ts`)
   - 组合 ControlPanel 和 Chart 的 DOM
   - 使用 `xs.combine` 合并子组件的 DOM 流

5. **集成 ControlPanel**
   ```typescript
   const controlPanelSinks = isolate(ControlPanel, 'params')({
     DOM: sources.DOM,
     state: sources.state
   });

   // 将子 reducer 提升为父 reducer
   const paramsReducer$ = controlPanelSinks.state.map(
     childReducer => (prev: AppState) => ({
       ...prev,
       params: childReducer(prev.params)
     })
   );
   ```

6. **测试 Model**
   - 验证 computed state 正确计算
   - 验证 params 变化触发重新计算

### Phase 4: 实现 Chart 组件 ✅

1. **迁移现有代码**
   - 将 `graph.ts` 和 `axes.ts` 移到 `Chart/` 目录
   - 保持 D3 渲染逻辑不变

2. **创建类型定义** (`Chart/types.ts`)
   - `ChartProps` - 包含所有渲染所需的数据

3. **实现 View** (`Chart/view.ts`)
   - 接收 `props` 流
   - 渲染 SVG 和所有子组件

4. **创建 props 流**
   ```typescript
   const chartProps$ = sources.state.stream.map(state => ({
     scales: state.computed.scales,
     nullDistribution: state.computed.nullDistribution,
     // ... 其他字段
   }));

   const chartSinks = Chart({ props: chartProps$ });
   ```

5. **测试 View**
   - 验证 props 正确传递到子组件
   - 验证 DOM 结构正确

### Phase 5: 创建自定义驱动 ✅

1. **实现 CONFIG driver** (`drivers/config-driver.ts`)
   ```typescript
   export function makeConfigDriver() {
     return () => xs.of({
       width: 600,
       height: 400,
       testType: 'two-tailed'
     });
   }
   ```

2. **在 main.ts 中注册**
   ```typescript
   run(main, {
     DOM: makeDOMDriver("#app"),
     CONFIG: makeConfigDriver()
   });
   ```

### Phase 6: 清理和验证 ✅

1. **删除旧代码**
   - 删除 `src/type-errors/` 目录
   - 删除旧的测试文件

2. **更新导入路径**
   - 确保所有组件正确导入

3. **运行完整测试套件**
   ```bash
   npm test
   ```

4. **浏览器验证**
   ```bash
   npm run dev
   ```
   - 验证所有功能正常工作
   - 验证状态正确更新
   - 验证可视化正确渲染

## 关键迁移要点

### 从 startWith 到 defaultReducer

**旧代码**:
```typescript
const state$ = actions.alpha$
  .startWith(0.05)
  .map(alpha => ({ ...prevState, alpha }));
```

**新代码**:
```typescript
const defaultReducer = () => ({
  alpha: 0.05,
  // ... 其他默认值
});

const alphaReducer$ = actions.alpha$.map(
  alpha => prev => ({ ...prev, alpha })
);

const reducer$ = xs.merge(
  xs.of(defaultReducer),
  alphaReducer$
);
```

### 从集中式状态到组件化状态

**旧代码**:
```typescript
// 单个 model.ts 管理所有状态
const state$ = xs.combine(
  config$,
  params$,
  computed$
).map(([config, params, computed]) => ({
  config, params, computed
}));
```

**新代码**:
```typescript
// TypeErrorsApp 管理全局状态
// ControlPanel 通过 isolate 管理 params
// Chart 通过 props 接收数据
const stateTree = {
  config: {...},      // 只读，来自 driver
  params: {...},      // 由 ControlPanel 管理
  computed: {...}     // 由 TypeErrorsApp 计算
};
```

### 从单一组件到组合组件

**旧代码**:
```typescript
// type-errors/index.ts
function main(sources) {
  const actions = intent(sources);
  const state$ = model(actions, sources);
  const vdom$ = view(state$);
  return { DOM: vdom$ };
}
```

**新代码**:
```typescript
// TypeErrorsApp/index.ts
function TypeErrorsApp(sources) {
  const actions = intent(sources);
  const { reducer$ } = model(actions, sources);

  // 组合子组件
  const controlPanelSinks = isolate(ControlPanel, 'params')(sources);
  const chartSinks = Chart({ props: chartProps$ });

  const vdom$ = view(controlPanelSinks.DOM, chartSinks.DOM);

  return {
    DOM: vdom$,
    state: xs.merge(reducer$, controlPanelSinks.state)
  };
}
```

## 优势

✅ **可测试性**: 每个组件可独立测试
  - Model: 测试 reducer 逻辑
  - Intent: 测试 DOM 事件到 actions 的转换
  - View: 测试 virtual DOM 生成

✅ **可复用性**: ControlPanel 和 Chart 可在其他项目中复用

✅ **可维护性**: 清晰的职责划分
  - TypeErrorsApp: 协调和计算
  - ControlPanel: 用户输入
  - Chart: 可视化渲染

✅ **类型安全**: 每个 component 有明确的 Sources/Sinks 类型

✅ **性能优化**: 细粒度的状态更新，避免不必要的重渲染
  - ControlPanel 状态隔离
  - Chart 纯展示，只在 props 变化时重渲染

✅ **符合规范**: 完全遵循 Cycle.js Three Iron Laws
  - 每个组件都是纯函数
  - 所有交互通过 Sources/Sinks
  - 状态由 @cycle/state 管理

## 测试策略

### TDD 方法

项目使用测试驱动开发（TDD），主要关注：

1. **Model 测试** - 验证状态转换逻辑
2. **Intent 测试** - 验证事件到 actions 的转换
3. **View 测试** - 验证 DOM 生成

### 使用 fromDiagram 测试异步流

```typescript
import fromDiagram from 'xstream/extra/fromDiagram';

describe('ControlPanel model', () => {
  it('should update alpha from actions', (done) => {
    const actions = {
      alpha$: fromDiagram('a-b-|').mapTo(0.08),
      nullMean$: xs.never(),
      trueMean$: xs.never(),
      stdDev$: xs.never()
    };

    const { reducer$ } = model(actions);

    let reducerCount = 0;
    reducer$.addListener({
      next: (reducer) => {
        if (reducerCount === 0) {
          // 第一个 reducer: defaultReducer
          const state = reducer(undefined);
          expect(state.alpha).to.equal(0.05);
        } else if (reducerCount === 1) {
          // 第二个 reducer: alphaReducer
          const state = reducer(previousState);
          expect(state.alpha).to.equal(0.08);
          done();
        }
        reducerCount++;
      }
    });
  });
});
```

### 测试辅助工具

```typescript
// test/helpers/test-utils.ts

// 创建 mock DOM source
export function createMockDOMSource(events) {
  const sources = {};
  for (const [selector, diagram] of Object.entries(events)) {
    sources[selector] = {
      input: fromDiagram(diagram).mapTo({ target: { value: '0.05' } })
    };
  }
  return mockDOMSource(sources);
}

// 验证流序列
export function expectStreamSequence(stream, expected, done) {
  const actual = [];
  stream.addListener({
    next: (val) => actual.push(val),
    complete: () => {
      expect(actual).to.deep.equal(expected);
      done();
    }
  });
}
```

### 测试覆盖

- ✅ TypeErrorsApp/model - computed state 计算
- ✅ ControlPanel/intent - DOM 事件处理
- ✅ ControlPanel/model - reducer 逻辑
- ✅ Chart/view - DOM 渲染

## 性能优化

### 1. 细粒度状态更新

使用 `isolate` 确保 ControlPanel 的状态更新不会影响整个应用：

```typescript
// 只有 state.params 变化，不会触发 state.computed 重新计算
// 直到 TypeErrorsApp.model 监听到变化
```

### 2. 纯展示组件

Chart 不维护状态，只在 props 变化时重渲染：

```typescript
const chartProps$ = sources.state.stream.map(state => ({
  scales: state.computed.scales,
  // ...
}));

const chartSinks = Chart({ props: chartProps$ });
```

### 3. 避免不必要的计算

使用 xstream 的操作符避免重复计算：

```typescript
// 使用 compose 而不是多次 map
const scales$ = params$.compose(createScales$());
```

## 最佳实践

### 1. 类型定义

- 每个组件都有明确的 `Sources` 和 `Sinks` 接口
- 使用 TypeScript 严格模式
- 为所有公共 API 定义类型

### 2. 组件大小

- 保持组件小而专注
- 单个文件不超过 200 行
- 职责单一

### 3. 状态管理

- 优先使用 reducer 模式
- 避免在组件间直接传递状态
- 使用 props向下传递数据，使用 reducers向上传递事件

### 4. 测试

- 为每个组件编写测试
- 使用 fromDiagram 模拟异步流
- 测试应该快速且独立

### 5. 文档

- 为复杂逻辑添加注释
- 更新架构文档
- 记录重要的设计决策
