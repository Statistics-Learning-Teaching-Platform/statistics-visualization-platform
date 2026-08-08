# 外部开放题库

本目录保存经过人工筛选、独立解题和格式规范化的外部开放题库导入包。

## ROTEL curated v1

- 来源：*Statistical Problem Sets in WeBWorK*
- 作者：Rachael Norton、Peter Staab（2023）
- 原始网址：https://rotel.pressbooks.pub/statsproblemsets/
- 许可：Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
- 许可文本：https://creativecommons.org/licenses/by-nc-sa/4.0/
- 处理方式：中文化、自包含改写、Markdown/LaTeX 规范化、题型和知识点重标、答案独立推导。

导入包不会收录依赖**缺失**图片、外部表格或前题上下文的题目。图片题只有在图片已经本地化、题干中标注准确插入位置和替代文字、并通过预览检查后才会进入题库。每道题保留原始页面、原题编号、作者与许可证字段。

验证导入包：

```bash
python3 scripts/import_rotel_curated.py --check
```

写入章节题库：

```bash
python3 scripts/import_rotel_curated.py
```
