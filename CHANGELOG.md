# Changelog

本文件记录统计学习可视化平台自上次提交以来的显著变更。

## [Unreleased] - 2026-06-26

继「还债第二步 整合配置和无用的/通用的工具类」之后的架构大改与 i18n 重组。
本次变更共 107 个文件，净减约 9000 行代码（+1348 / −10419）。

### 架构 — 单 SPA 构建

- **删除所有子应用独立构建配置**：移除 `apps/confidence-interval`、`apps/mes-*`（4 个）、
  `apps/regression`、`apps/simulation-*`（6 个）、`apps/type-error` 下的 `package.json` /
  `tsconfig.json` / `vite.config.ts`，统一由根 `vite.config.ts` 执行单次 `vite build`，
  依赖根 `package.json` 的 workspaces。
- **App 注册表 TypeScript 化**：删除 `scripts/apps.mjs` / `apps.d.mts` /
  `generate-wals-apps.mjs`（共 ~2290 行），新增 `scripts/apps.ts` 作为 app 注册表
  的单一数据源（被 `appRegistry.tsx`、`Sidebar.tsx`、`AppShell.tsx` 及测试共享）。
- **Shell 直接动态导入**：删除 `src/visualizers.ts`，`src/shell/appRegistry.tsx` 改为
  通过 Vite glob 自动发现各 app 的 `main.tsx`，新增 app 无需改注册逻辑。
- 清理临时文件 `conversation-2026-06-20-125322.txt`（3649 行）。
- 新增 `start.bat`（Windows 一键启动脚本）。

### i18n 重组

- **删除 `apps/shared/i18n/legacy.ts`**（732 行硬编码字典）。
- **新增 `apps/shared/i18n/copy.ts`**：集中 `platformCopy`（Shell 文案）与
  `visualizerLabels`（导航标签）作为唯一数据源，Sidebar 通过 `getVisualizerLabel`
  消费，不再在 `AppRecord` 上重复 `label/shortLabel/pageTitle` 字段。
- **新增 `apps/shared/i18n/en-zh-dictionary.json`**：将英中翻译字典外置为 JSON。
- **重写 `runtime-dictionary.ts`**（220 行）：从 JSON 加载，移除已废弃的
  `localizeDeep` 等死代码。
- **精简 `index.tsx`**：仅保留翻译机制（`LanguageProvider`、`t()`/`useT()`、
  查找辅助函数），数据迁出到 `copy.ts`。

### WALS engine 模块化

- **`apps/shared/wals/engine.ts` 大幅瘦身**（−792 行）。
- **新增 `apps/shared/wals/engine/` 子目录**，按职责拆分为 10 个模块：
  `clt`、`distributions`、`inference`、`internal`、`mcmc`、`monte-carlo`、
  `regression`、`resampling`、`samplers`、`variance-reduction`。
- 同步更新 `WalsApp.tsx`、`charts.tsx`、`types.ts` 以适配新结构。
- 修复 `WalsApp.tsx` 中 CLT 采样均值累积 bug（追加而非覆盖）。

### App 组件拆分

- **`apps/regression/src/App.tsx`** 从 628 行拆出：
  `ControlPanel`、`RegressionChart`、`StatisticsPanel`、`constants`、
  `useCustomLine`、`useDatasets`；删除 `dataBaseUrl.ts`。
- **`apps/confidence-interval/src/App.tsx`** 拆出：
  `ConfidenceIntervalChart`、`ControlSidebar`、`MetricsGrid`、
  `constants`、`useConfidenceIntervals`。
- **`apps/type-error/src/App.tsx`** 重构（190 行变更），改用共享
  `formatNumber` 与统一图表尺寸常量。

### Shared 工具

- 新增 `apps/shared/chart-utils.ts`、`confidence-interval.ts`、
  `regression.ts`、`jstat.d.ts`（jstat 类型声明）。
- `apps/shared/math.ts`、`format.ts`、`index.ts` 同步更新导出。

### 测试

- **新增**：`test/components.test.tsx`、`test/modules.test.ts`、
  `test/setup.ts`、`test/wals-engine.test.ts`。
- **删除**：各子应用下的 `test/module.test.ts`（11 个）与
  `test/regression-style.test.ts`。
- **更新**：`platform-inventory.test.ts`、`regression-main.test.ts`、
  `visualizers.test.ts`、`template-zh-completeness.test.ts`、
  `textbook-regression-data.test.ts` 以适配新结构。

### 其他

- 更新 `.gitignore`、`README.md`、`docs/integration/platform-inventory.md`。
- `package.json` / `package-lock.json` 同步依赖与脚本。
