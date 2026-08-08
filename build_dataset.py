#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将 Data/Origin/ 中的 Word 作业文档转换为 Data/Formed/ChXX/questions.json 数据集。

流程：
1. .doc -> .docx (LibreOffice headless)
2. .docx -> markdown (pandoc, OMML -> LaTeX)
3. 解析 markdown：按顶级题号切分题目；识别 "Ans:"/"Solution:" 区段作为答案
4. 图片公式/配图/数据集 -> 拷贝到 ChXX/Assests/，正文用 [FORMULA:xxx] / [IMG:xxx] / [DATA:xxx] 占位
5. 输出 questions.json（type=unknown, difficulty=1）

文件 -> chapter 映射、合并章节切分点在 FILE_CHAPTER_MAP 中维护。
"""
import os
import re
import sys
import json
import shutil
import hashlib
import subprocess
from pathlib import Path
from urllib.parse import unquote

# ============== 路径配置 ==============
ROOT = Path(__file__).resolve().parent
ORIGIN = ROOT / "Data" / "Origin"
FORMED = ROOT / "Data" / "Formed"
WORK = ROOT / "Data" / "_work"  # 中间产物：转换后的 docx / markdown / media

SOFFICE = shutil.which("soffice") or shutil.which("soffice.exe") or os.environ.get("SOFFICE", "")
PANDOC = shutil.which("pandoc") or shutil.which("pandoc.exe") or os.environ.get("PANDOC", "")
POWERSHELL = shutil.which("powershell") or shutil.which("powershell.exe") or ""

AUDIT = {
    "missing_sources": [],
    "conversion_warnings": [],
    "unmatched_answers": [],
    "unconverted_pdf_sources": [],
}

# ============== 文件 -> chapter 映射 ==============
# 每项: (相对 ORIGIN 的路径, chapter 或 chapter 切分规则)
# 切分规则: list of (起始题号, chapter)  -- 按顶级题号分段
#   题号匹配: 行首 "N." 或 "**N.**" 或 "N." 加粗；也支持 Prof Lv 的 "N.M" 格式（取 N）
FILE_CHAPTER_MAP = [
    # ---- Semester 1 ----
    # Assignment 与 Solution 分开文件，分别处理（答案从 Solution 文件抽）
    ("Assigments for Speaking of Statistics-Semester1-2014-2015/Assignment_ Chapter 3.docx", 3),
    ("Assigments for Speaking of Statistics-Semester1-2014-2015/Solution_Chapter 3.docx", ("answer", 3)),
    ("Assigments for Speaking of Statistics-Semester1-2014-2015/Assignment_Chapter4_Probability.doc", 4),
    ("Assigments for Speaking of Statistics-Semester1-2014-2015/Solution-Chapter4_Probability.doc", ("answer", 4)),
    ("Assigments for Speaking of Statistics-Semester1-2014-2015/Assignment and solution_Chap_5_discrete random variable.docx", 5),
    ("Assigments for Speaking of Statistics-Semester1-2014-2015/Assignment and solution_Chap_6_Continuous Random Variable.doc", 6),
    ("Assigments for Speaking of Statistics-Semester1-2014-2015/Assignment Chap 8_Confidence interval.docx", 8),
    ("Assigments for Speaking of Statistics-Semester1-2014-2015/Solutions_Chapter8 Confidence interval.pdf", ("pdf_answer_asset", 8)),
    ("Assigments for Speaking of Statistics-Semester1-2014-2015/Assignment_Chapter 9 Hypothesis Testing Questions.docx", 9),
    ("Assigments for Speaking of Statistics-Semester1-2014-2015/Solution_Chapter 9 Hypothesis Testing.docx", ("answer", 9)),
    ("Assigments for Speaking of Statistics-Semester1-2014-2015/Assignment and solution_Chap10_Two sample testing.doc", 10),
    # 合并章节（含题目+答案）
    ("Assigments for Speaking of Statistics-Semester1-2014-2015/Assignment and solution_Chap 1&2.docx",
     [(1, 1), (5, 2)]),  # 题1-4 -> Ch1, 题5-12 -> Ch2
    ("Assigments for Speaking of Statistics-Semester1-2014-2015/Assignment and solution_chap7&13_ Sampling distribution_regression.docx",
     [(1, 7), (8, 13)]),  # 题1-7 -> Ch7, 题8-10 -> Ch13

    # ---- Semester 2 ----
    ("Assigments for Speaking of Statistics-Semester2-2014-2015/Assignment-Chapter03/GCNU1003 Sp of Stat_assignment ch3 sem2 2014-2015.docx", 3),
    ("Assigments for Speaking of Statistics-Semester2-2014-2015/Assignment-Chapter04.docx", 4),
    ("Assigments for Speaking of Statistics-Semester2-2014-2015/Assignment-Chapter04_Solution.docx", ("answer", 4)),
    ("Assigments for Speaking of Statistics-Semester2-2014-2015/Assignment-Chapter05.docx", 5),
    ("Assigments for Speaking of Statistics-Semester2-2014-2015/Assignment-Chapter06_Continuous Random Variables.docx", 6),
    ("Assigments for Speaking of Statistics-Semester2-2014-2015/Assignment-Chapter07_Sample Mean.docx", 7),
    ("Assigments for Speaking of Statistics-Semester2-2014-2015/Assignment-Chapter07_Sample Mean_Solutions.docx", ("answer", 7)),
    ("Assigments for Speaking of Statistics-Semester2-2014-2015/Assignment-Chapter08_Confidence interval.docx", 8),
    ("Assigments for Speaking of Statistics-Semester2-2014-2015/Assignment-Chapter08_Confidence interval_solution.docx", ("answer", 8)),
    ("Assigments for Speaking of Statistics-Semester2-2014-2015/Assignment-Chapter09_Hypothesis Testing.doc", 9),
    ("Assigments for Speaking of Statistics-Semester2-2014-2015/Assignment-Chapter10_Two sample testing.doc", 10),
    ("Assigments for Speaking of Statistics-Semester2-2014-2015/Assignment-Chapter10_Two sample testing_Solution.doc", ("answer", 10)),
    ("Assigments for Speaking of Statistics-Semester2-2014-2015/Assignment-Chapter11_Simple Regression Models.docx", 11),
    # 合并章节（仅题目）
    ("Assigments for Speaking of Statistics-Semester2-2014-2015/Assignment-Chapter01-02/Assignment-Chapter01-02.docx",
     [(1, 1), (3, 2)]),  # 题1-2 -> Ch1, 题3-10 -> Ch2
    ("Assigments for Speaking of Statistics-Semester2-2014-2015/Assignment-Chapter01-02/Assignment-Chapter01-02_Solutions.docx",
     ("answer_segments", [(1, 1), (3, 2)])),

    # ---- Prof Lv (assignmentN-Lu.doc = chapter N) ----
    ("Assignment Prof Lv/assignment1-Lu.doc", 1),
    ("Assignment Prof Lv/assignment2-Lu.doc", 2),
    ("Assignment Prof Lv/Assignment3-Lu.doc", 3),
    ("Assignment Prof Lv/Assignment4-Lu.doc", 4),
    ("Assignment Prof Lv/assignment5-lu.doc", 5),
    ("Assignment Prof Lv/Assignment 6-lu.doc", 6),
    ("Assignment Prof Lv/Assignment7-lu.doc", 7),
    ("Assignment Prof Lv/Assignment8-lu.doc", 8),
    ("Assignment Prof Lv/assignment9-Lu.doc", 9),
    ("Assignment Prof Lv/assignment10-Lu.doc", 10),
    # Prof Lv 的答案文件
    ("Assignment Prof Lv/Solution of assignment1.doc", ("answer", 1)),
    ("Assignment Prof Lv/Solution of assignment2.doc", ("answer", 2)),
    ("Assignment Prof Lv/Solution to Assignment3-Lu.doc", ("answer", 3)),
    ("Assignment Prof Lv/Solution to assignment2-Lu.doc", ("answer", 2)),
    ("Assignment Prof Lv/Solution Of Assignment4-lu.doc", ("answer", 4)),
    ("Assignment Prof Lv/Solution of assignment5.doc", ("answer", 5)),
    ("Assignment Prof Lv/Solution of assignment6.doc", ("answer", 6)),
    ("Assignment Prof Lv/Solution of assignment7.doc", ("answer", 7)),
    ("Assignment Prof Lv/Solution of assignment8.doc", ("answer", 8)),
    ("Assignment Prof Lv/Solution of assignment9.doc", ("answer", 9)),
    ("Assignment Prof Lv/Solution_of_assignment9.doc", ("answer", 9)),
    ("Assignment Prof Lv/Solution of assignment10.doc", ("answer", 10)),

    # ---- STAT 2010 (assignmentN.doc = chapter N，但需注意编号未必=章节，先按编号) ----
    ("Assignments for STAT 2010/assignment01.doc", 1),
    ("Assignments for STAT 2010/assign2.doc", 2),
    ("Assignments for STAT 2010/assign3.doc", 3),
    ("Assignments for STAT 2010/assign4.doc", 4),
    ("Assignments for STAT 2010/assign5.doc", 5),
    ("Assignments for STAT 2010/assign6.doc", 6),
    ("Assignments for STAT 2010/assign8.doc", 8),
    ("Assignments for STAT 2010/Assignment 9.doc", 9),
    ("Assignments for STAT 2010/solution_assign02.doc", ("answer", 2)),
    ("Assignments for STAT 2010/solution_assign03.doc", ("answer", 3)),
    ("Assignments for STAT 2010/solution_assign04.doc", ("answer", 4)),
    ("Assignments for STAT 2010/solution-assign5.doc", ("answer", 5)),
    ("Assignments for STAT 2010/solution-assign6.doc", ("answer", 6)),
    ("Assignments for STAT 2010/solution-assign7.doc", 7),  # 注: 无 assignment7.doc；该文件含题目+答案
    ("Assignments for STAT 2010/solution-assign8.doc", ("answer", 8)),
    ("Assignments for STAT 2010/Solution-assign9.pdf", ("pdf_answer_asset", 9)),
    ("Assignments for STAT 2010/Solution_assign01.doc", ("answer", 1)),

    # ---- STAT 2012 (Assignment_N.doc = chapter N) ----
    # 注: Assignment_1.doc 含 Ch1+Ch2（题号跨章连续），用 ("by_chapter_title", default_ch) 模式
    ("Assignments for STAT 2012/Assignment_1.doc", ("by_chapter_title", 1)),
    ("Assignments for STAT 2012/Assignment_2.doc", 2),
    ("Assignments for STAT 2012/Assignment_3.doc", 3),
    ("Assignments for STAT 2012/Assignment-4.doc", 4),
    ("Assignments for STAT 2012/Assignment_5.doc", 5),
    ("Assignments for STAT 2012/Assignment_6.doc", 6),
    ("Assignments for STAT 2012/Assignment-7.doc", 7),
    ("Assignments for STAT 2012/Assignment_8.doc", 8),
    ("Assignments for STAT 2012/Solution_1.doc", ("answer_by_chapter_title", 1)),
    ("Assignments for STAT 2012/solution-2.doc", ("answer", 2)),
    ("Assignments for STAT 2012/Solution_3.doc", ("answer", 3)),
    ("Assignments for STAT 2012/Solution_4.doc", ("answer", 4)),
    ("Assignments for STAT 2012/solution_5.doc", ("answer", 5)),
    ("Assignments for STAT 2012/Solution_6.doc", ("answer", 6)),
    ("Assignments for STAT 2012/Solution_7.doc", ("answer", 7)),
    ("Assignments for STAT 2012/solution_8.doc", ("answer", 8)),
]

# 顶级题号匹配：行首 可选** 加粗；数字；后跟 . 或 )
# 形如: "1." / "**2.**" / "3." / "3) " / "10. "
TOPIC_NUM_RE = re.compile(r'^\s*(?:>\s*)?\*{0,2}\s*(\d{1,2})\s*(?:\\?[.):])\s*\*{0,2}\s*', re.MULTILINE)
TOPIC_SPACE_RE = re.compile(r'^\s*(?:>\s*)?\*{0,2}\s*(\d{1,2})\s+(?=[A-Z])', re.MULTILINE)

# 章节内题号格式："N.M"（如 Prof Lv Solution 中的 6.8 / 10.1 / 6.11）
# 取 M 作为 qid（因为 Assignment 文件用 1./2./3. 编号）
TOPIC_DOTTED_RE = re.compile(r'^\s*(?:>\s*)?\*{0,2}\s*\d{1,2}\\?\.\s*(\d{1,3})\s*[\.):]?\s*\*{0,2}\s*', re.MULTILINE)

# 答案标记（在题目内部出现）
ANSWER_MARKERS = ['Ans:', 'Ans.', 'Ans :', 'Solution:', 'Solution.', 'Answer:', 'Answer.', '解答:', '答案:', 'Sol:']
ANSWER_BLOCK_START = re.compile(r'^\s*(?:>\s*)?(Ans|Solution|Answer|Sol)\s*[:.：]\s*', re.IGNORECASE | re.MULTILINE)
INLINE_ANSWER_START = re.compile(r'(?:\*\*)?\b(Ans|Solution|Answer|Sol)\s*[:.：]\s*(?:\*\*)?', re.IGNORECASE)
# 整行仅为答案标记词（无冒号）："Solution" / "> Solution" / "**Solution**" / "Solution:"
ANSWER_LINE_RE = re.compile(r'^\s*(?:>\s*)?[*_]*\s*(Ans|Solution|Answer|Sol|Answers?)\s*[*_]*\s*[:.：]?\s*$', re.IGNORECASE)


def run(cmd, check=True, capture=False):
    """执行命令"""
    print(f"  $ {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    res = subprocess.run(cmd if isinstance(cmd, list) else cmd, shell=isinstance(cmd, str),
                        capture_output=capture, text=True)
    if check and res.returncode != 0:
        print(f"  STDERR: {res.stderr if capture else '(no capture)'}")
        raise RuntimeError(f"command failed: {cmd}")
    return res


def ps_string(value: Path | str) -> str:
    """PowerShell single-quoted string literal."""
    return "'" + str(value).replace("'", "''") + "'"


def word_save_as(src: Path, dst: Path, file_format: int):
    """Use local Microsoft Word COM via PowerShell as a Windows fallback."""
    if not POWERSHELL:
        raise RuntimeError("PowerShell is unavailable; cannot use Word COM fallback")
    dst.parent.mkdir(parents=True, exist_ok=True)
    script = f"""
$ErrorActionPreference = 'Stop'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {{
  $doc = $word.Documents.Open({ps_string(src)}, $false, $true)
  $doc.SaveAs2({ps_string(dst)}, {file_format})
  $doc.Close(0)
}} finally {{
  $word.Quit()
}}
"""
    res = subprocess.run(
        [POWERSHELL, "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
        capture_output=True,
        text=True,
        timeout=120,
    )
    if res.returncode != 0 or not dst.exists():
        raise RuntimeError(f"Word COM conversion failed for {src.name}: {res.stderr.strip()}")


def _html_inline_text(node, html_path: Path) -> str:
    parts = []
    if node.text:
        parts.append(node.text)
    for child in node:
        tag = (child.tag or "").lower()
        if tag == "img":
            src = child.get("src", "")
            img_path = (html_path.parent / unquote(src)).resolve()
            parts.append(f"![]({img_path})")
        else:
            parts.append(_html_inline_text(child, html_path))
        if child.tail:
            parts.append(child.tail)
    text = "".join(parts)
    text = text.replace("\xa0", " ")
    text = re.sub(r"[ \t\f\v]+", " ", text)
    return text.strip()


def _html_table_to_md(table, html_path: Path) -> str:
    rows = []
    for tr in table.xpath("./tr|./thead/tr|./tbody/tr"):
        cells = []
        for cell in tr.xpath("./th|./td"):
            cells.append(_html_inline_text(cell, html_path).replace("|", "\\|"))
        if cells:
            rows.append(cells)
    if not rows:
        return ""
    width = max(len(r) for r in rows)
    rows = [r + [""] * (width - len(r)) for r in rows]
    out = ["| " + " | ".join(rows[0]) + " |"]
    out.append("| " + " | ".join(["---"] * width) + " |")
    out.extend("| " + " | ".join(r) + " |" for r in rows[1:])
    return "\n".join(out)


def html_to_markdown(html_path: Path) -> str:
    """Minimal Word-filtered-HTML to markdown converter used when pandoc is absent."""
    try:
        from lxml import html
    except Exception as e:
        raise RuntimeError(f"lxml is required for Word HTML fallback: {e}")
    raw = html_path.read_bytes()
    doc = html.fromstring(raw)
    blocks = []
    block_xpath = (
        "//body//*[self::p or self::h1 or self::h2 or self::h3 or self::h4 "
        "or self::li or self::table]"
    )
    for node in doc.xpath(block_xpath):
        tag = (node.tag or "").lower()
        if tag != "table" and node.xpath("ancestor::table"):
            continue
        if tag == "table":
            text = _html_table_to_md(node, html_path)
        else:
            text = _html_inline_text(node, html_path)
        if text:
            blocks.append(text)
    return "\n\n".join(blocks).strip() + "\n"


def convert_word_to_md_with_word(word_path: Path, media_dir: Path, out_md: Path):
    html_dir = WORK / "html" / word_path.stem
    html_path = html_dir / (word_path.stem + ".htm")
    word_save_as(word_path, html_path, 10)  # wdFormatFilteredHTML
    out_md.parent.mkdir(parents=True, exist_ok=True)
    out_md.write_text(html_to_markdown(html_path), encoding="utf-8")
    media_dir.mkdir(parents=True, exist_ok=True)


def resolve_origin_path(rel_path: str) -> Path | None:
    """Resolve rel_path case-insensitively on case-sensitive filesystems."""
    exact = ORIGIN / rel_path
    if exact.exists():
        return exact
    cur = ORIGIN
    for part in Path(rel_path).parts:
        if not cur.exists():
            return None
        matches = [p for p in cur.iterdir() if p.name.lower() == part.lower()]
        if not matches:
            return None
        cur = matches[0]
    return cur if cur.exists() else None


def convert_doc_to_docx(doc_path: Path, outdir: Path) -> Path:
    """Convert .doc to .docx with LibreOffice or Word COM fallback."""
    outdir.mkdir(parents=True, exist_ok=True)
    docx_path = outdir / (doc_path.stem + ".docx")
    if docx_path.exists():
        return docx_path
    if SOFFICE:
        profile = ROOT / "Data" / f".lo_profile_{os.getpid()}"
        cmd = [
            SOFFICE,
            "--headless",
            f"-env:UserInstallation=file:///{profile.as_posix()}",
            "--convert-to",
            "docx",
            "--outdir",
            str(outdir),
            str(doc_path),
        ]
        res = run(cmd, check=False, capture=True)
        if res.returncode == 0 and docx_path.exists():
            return docx_path
    if os.name == "nt":
        word_save_as(doc_path, docx_path, 16)  # wdFormatXMLDocument
        return docx_path
    raise RuntimeError(f"conversion failed, no docx found: {doc_path}")
    return docx_path


def convert_docx_to_md(docx_path: Path, media_dir: Path, out_md: Path):
    """Convert DOCX to markdown, reusing existing markdown if needed."""
    if out_md.exists() and not PANDOC:
        return
    media_dir.mkdir(parents=True, exist_ok=True)
    if PANDOC:
        run([PANDOC, str(docx_path), "-t", "markdown",
             "--wrap=none", "--extract-media=" + str(media_dir),
             "-o", str(out_md)], check=True, capture=True)
        return
    convert_word_to_md_with_word(docx_path, media_dir, out_md)


def split_topics(md_text: str):
    """
    按顶级题号切分 markdown 文本。
    返回: [(顶级题号(int), 该题对应的原文行范围 start..end, 段落列表), ...]

    识别规则（按优先级）：
      1. "Problem N." / "**Problem N**" / "Problem N"（高优先，作为题目起点）
      2. 行首 "N." / "**N.**" / "N)" 形式（普通题号）
      但排除：
        - 短行 + 标题词（Hypotheses/Significance level/Test statistic/P-value/Conclusion 等小节标题）
        - 表格行
        - 引用块内的子编号（如 > 1.）
    """
    lines = md_text.splitlines()
    topics = []

    # 小节标题排除词（出现这些词说明该 N. 是目录/小节，非题目）
    section_header_words = {
        'hypotheses', 'significance level', 'test statistic', 'test statistics',
        'p-value', 'pvalue', 'conclusion', 'summary',
        'step 1', 'step 2', 'step 3', 'step 4', 'step 5',
    }
    # Problem 形式（支持引用块内）：可选前缀 "> " + 可选** + Problem + N + 可选 .):+ 可选**
    # 匹配: "**Problem 1.**" / "**Problem 2**" / "**Problem 3:**" / "> **Problem 1.**"
    problem_re = re.compile(
        r'^\s*(?:>\s*)?\s*\*{0,2}\s*Problem\s*(\d{1,2})\s*[\.):]?\s*\*{0,2}\s*',
        re.IGNORECASE)

    # 记录每个候选题号的类型（'problem' / 'dotted' / 'plain'），
    # 供后续对普通题号做"单调递增"过滤（排除题目内部的子列表 1. 2. 3.）
    kinds = []
    for i, ln in enumerate(lines):
        # 跳过表格分隔行
        if ln.startswith('|') or ln.startswith('+-') or ln.startswith('---'):
            continue

        # 1) 优先匹配 Problem N（即使在引用块 > 内也识别）
        m = problem_re.match(ln)
        if m:
            num = int(m.group(1))
            topics.append((num, i, ln)); kinds.append('problem')
            continue

        # 2) 匹配 "N.M" 形式题号（如 "6.8" / "10.1" / "**6.11 a.**"）
        # 取 M 作为 qid
        m = TOPIC_DOTTED_RE.match(ln)
        if m:
            text_after = ln[m.end():].lower().strip()
            numeric_tail = text_after.replace('|', '').strip()
            if (not text_after or text_after.startswith('to ') or text_after.startswith('percent')
                    or re.match(r'^[\d\s,.;:+\-]+$', numeric_tail)):
                continue
            num = int(m.group(1))
            topics.append((num, i, ln)); kinds.append('dotted')
            continue

        # 3) 普通题号。Pandoc 有时把整道题放在 blockquote 中（"> 1\\."）。
        m = TOPIC_NUM_RE.match(ln)
        if m:
            num = int(m.group(1))
            # 排除小节标题（"1. Hypotheses" / "1. **[Hypotheses]**" 等）
            text_after = ln[m.end():].lower().strip()
            if text_after.startswith('p(') or text_after.startswith('percent'):
                continue
            # 去除 markdown 标记字符（* [ ] _ { } .）
            text_clean = re.sub(r'[\*\[\]\_{}\.]', ' ', text_after).strip()
            head = text_clean[:30]
            if not text_clean or re.match(r'^[\d\s,.;:+\-]+$', text_clean):
                continue
            if any(head.startswith(w) for w in section_header_words):
                continue
            # 缩进 >= 4 空格的编号（如 "    1."）几乎总是题目内部子列表，跳过
            if re.match(r'^\s{4,}\d', ln):
                continue
            topics.append((num, i, ln)); kinds.append('plain')
            continue

        m = TOPIC_SPACE_RE.match(ln)
        if m:
            num = int(m.group(1))
            text_after = ln[m.end():].lower().strip()
            if text_after.startswith('percent'):
                continue
            text_clean = re.sub(r'[\*\[\]\_{}\.]', ' ', text_after).strip()
            if not text_clean or re.match(r'^[\d\s,.;:+\-]+$', text_clean):
                continue
            topics.append((num, i, ln)); kinds.append('plain')

    # 单调递增过滤：若文档中出现多个 "1"（子列表重启信号），且首个不是 1，
    # 说明有嵌套子列表；此时对普通题号启用递增过滤，排除子列表项。
    # 但若文档题号本身就是乱序高号（答案文件），则跳过过滤。
    plain_nums = [num for (num, _, _), kind in zip(topics, kinds) if kind == 'plain']
    if len(plain_nums) >= 3 and plain_nums.count(1) > 1:
        # 多个 "1" 出现 -> 有子列表重启
        filtered = []
        last_plain = 0
        for (num, idx, ln), kind in zip(topics, kinds):
            if kind == 'plain':
                if num <= last_plain:
                    continue
                last_plain = num
            filtered.append((num, idx, ln))
        topics = filtered

    # 若文档中已存在 Problem N 模式题号，则忽略所有普通数字题号
    # （普通 N. 极可能是答案中的步骤子编号 "4. the 95%..."，非真实题目）
    has_problem = any(re.match(r'\s*\*{0,2}\s*Problem\s*\d+', t[2], re.IGNORECASE) for t in topics)
    if has_problem:
        dedup = []
        for num, idx, ln in topics:
            if re.match(r'\s*(?:>\s*)?\s*\*{0,2}\s*Problem\s*\d+', ln, re.IGNORECASE):
                if not dedup or dedup[-1][0] != num:
                    dedup.append((num, idx, ln))
        return dedup, lines

    # 合并相邻重复（同一题号只取第一个）
    dedup = []
    last_num = None
    for num, idx, ln in topics:
        if num != last_num:
            dedup.append((num, idx, ln))
            last_num = num
    return dedup, lines


def segment_lines_for_chapter(segments, lines):
    """
    根据 segments=[(start_topic_num, chapter), ...] 把 lines 切分到各 chapter。
    返回: {chapter: [lines...]}
    """
    topics, _ = split_topics('\n'.join(lines))
    if not topics:
        return {}
    # 找每个 segment 的起始行
    result = {}
    # segments 形如 [(1, ch1), (5, ch2)] 表示题号>=5 归 ch2，<5 归 ch1
    seg_starts = sorted(segments, key=lambda s: s[0])
    # 题号 -> 行号映射
    num_to_line = {num: idx for num, idx, _ in topics}
    chapter_ranges = []
    for i, (start_num, ch) in enumerate(seg_starts):
        start_line = num_to_line.get(start_num, 0)
        if i + 1 < len(seg_starts):
            next_num = seg_starts[i + 1][0]
            end_line = num_to_line.get(next_num, len(lines))
        else:
            end_line = len(lines)
        chapter_ranges.append((ch, start_line, end_line))
    for ch, s, e in chapter_ranges:
        result.setdefault(ch, []).extend(lines[s:e])
    return result


def extract_answer_from_topic_lines(topic_lines):
    """
    从一道题的文本行中抽取 "Ans:" / "Solution:" 之后的答案部分。
    返回 (question_lines, answer_text)。
    """
    # 找答案块开始位置；支持 "2. Solution:" 和题干后接 "**Solution:**"。
    answer_start = None
    inline_match = None
    for i, ln in enumerate(topic_lines):
        stripped_num = TOPIC_NUM_RE.sub('', ln, count=1).strip()
        # 整行仅为标记词（含无冒号的 "Solution" / "> Solution"）：答案从下一行开始
        if ANSWER_LINE_RE.match(ln):
            answer_start = i
            inline_match = (ln, 0, len(ln), ln)  # tail 为空
            break
        m = ANSWER_BLOCK_START.match(ln) or ANSWER_BLOCK_START.match(stripped_num)
        if m:
            answer_start = i
            inline_match = (ln, 0, m.end(), stripped_num if stripped_num != ln else ln)
            break
        m = INLINE_ANSWER_START.search(ln)
        if m:
            answer_start = i
            inline_match = (ln, m.start(), m.end(), ln)
            break
    if answer_start is None:
        return topic_lines, ""
    original, start, end, marker_line = inline_match
    q_lines = topic_lines[:answer_start]
    a_lines = topic_lines[answer_start + 1:]
    if start > 0:
        before = original[:start].strip()
        if before:
            q_lines.append(before)
    elif marker_line != original:
        prefix = original[:original.find(marker_line)].strip()
        if prefix:
            q_lines.append(prefix)
    tail = marker_line[end:].strip()
    if tail:
        a_lines = [tail] + a_lines
    return q_lines, '\n'.join(a_lines).strip()


def remap_media_refs(text: str, media_src: Path, chapter: int, qid: str, media_counter):
    """
    把 markdown 中的 ![](/abs/path/media/xxx.png) 替换为：
      - 图片拷贝到 ChXX/Assests/{qid}_{idx}_{原名}
      - 正文用占位符：若是公式图（wmf/emf/gif 等公式类）-> [FORMULA:filename]
                     若是配图（png/jpeg/jpg）-> [IMG:filename]
    media_counter: dict 用于编号
    """
    if not media_src.exists():
        return text
    # 匹配 ![alt](path){...} 或 ![alt](path)
    pattern = re.compile(r'!\[[^\]]*\]\(([^)]+)\)(?:\{[^}]*\})?')

    def resolve_media_path(url: str) -> Path:
        p = Path(url)
        if p.exists():
            return p
        norm_url = url.replace('\\', '/')
        marker = 'Data/_work/media/'
        candidates = []
        if marker in norm_url:
            tail = norm_url.split(marker, 1)[1]
            candidates.append(WORK / "media" / Path(tail))
        candidates.extend([
            media_src / p.name,
            media_src / "media" / p.name,
        ])
        for cand in candidates:
            if cand.exists():
                return cand
        return p

    def repl(m):
        url = m.group(1)
        # 处理绝对路径（pandoc --extract-media 输出的绝对路径）
        p = resolve_media_path(url)
        if not p.is_absolute() and not p.exists():
            p = media_src / p
        # 跳过 http(s) URL
        if url.startswith('http'):
            return m.group(0)
        if not p.exists():
            # wmf/emf 等可能仍存在；若不存在，保留占位
            return f"[IMG_MISSING:{p.name}]"
        ext = p.suffix.lower()
        media_counter[0] += 1
        new_name = f"{qid}_f{media_counter[0]:02d}_{p.name}"
        dst = FORMED / f"Ch{chapter:02d}" / "Assests" / new_name
        try:
            shutil.copy2(p, dst)
        except Exception as e:
            print(f"  ! copy failed {p} -> {dst}: {e}")
            return f"[IMG_MISSING:{p.name}]"
        # 区分公式图 vs 配图
        formula_exts = {'.wmf', '.emf', '.gif'}
        if ext in formula_exts:
            return f"[FORMULA:{new_name}]"
        return f"[IMG:{new_name}]"

    return pattern.sub(repl, text)


def clean_question_text(text: str) -> str:
    """清理 markdown 残留：去掉多余空行、表格管道残留等。"""
    # 去掉 pandoc 的 HTML 注释残留 <!-- -->
    text = re.sub(r'<!--\s*-->', '', text)
    # 多个空行合并
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def strip_topic_marker(text: str) -> str:
    if not text:
        return text
    text = TOPIC_DOTTED_RE.sub('', text, count=1)
    text = TOPIC_NUM_RE.sub('', text, count=1)
    text = TOPIC_SPACE_RE.sub('', text, count=1)
    return text.strip()


def normalize_for_match(text: str, limit: int | None = None) -> str:
    text = re.sub(r'!\[[^\]]*\]\([^)]+\)(?:\{[^}]*\})?', '', text or '')
    text = re.sub(r'\[(?:FORMULA|IMG|DATA):[^\]]+\]', '', text)
    text = re.sub(r'<!--\s*-->', '', text)
    text = re.sub(r'[^0-9a-zA-Z]+', '', text).lower()
    return text[:limit] if limit else text


def source_key(rel_path: str, chapter: int) -> str:
    s = rel_path.replace('\\', '/').lower()
    base = Path(s).stem.lower()
    compact = re.sub(r'[^a-z0-9]+', '', base)
    if 'assignment prof lv' in s:
        m = re.search(r'(?:assignment|solutionofassignment|solutiontoassignment)(\d{1,2})', compact)
        if m:
            return f'prof_lv_{int(m.group(1)):02d}'
    if 'assignments for stat 2010' in s:
        m = re.search(r'(?:assignment|assign|solutionassign)(\d{1,2})', compact)
        if m:
            return f'stat2010_{int(m.group(1)):02d}'
    if 'assignments for stat 2012' in s:
        m = re.search(r'(?:assignment|solution)(\d{1,2})', compact)
        if m:
            return f'stat2012_{int(m.group(1)):02d}'
    if 'speaking of statistics-semester2' in s:
        return f'sem2_ch{chapter:02d}'
    if 'speaking of statistics-semester1' in s:
        return f'sem1_ch{chapter:02d}'
    return f'ch{chapter:02d}:{compact}'


def segment_by_chapter_title(lines, default_ch):
    """
    按 markdown 中 "Chapter N" 标题切分文档。
    支持格式：**[Chapter N]{.underline}** / **Chapter N** / Chapter N / Chapter-N
    返回: {chapter: [lines]}，无 Chapter 标题的部分归 default_ch
    """
    chap_re = re.compile(r'^\s*\*{0,2}\[?\*?Chapter\s*(\d{1,2})', re.IGNORECASE)
    seg_result = {}
    current_ch = default_ch
    buf = []
    for ln in lines:
        m = chap_re.match(ln)
        if m:
            # flush 之前的
            if buf:
                seg_result.setdefault(current_ch, []).extend(buf)
                buf = []
            current_ch = int(m.group(1))
            buf.append(ln)
        else:
            buf.append(ln)
    if buf:
        seg_result.setdefault(current_ch, []).extend(buf)
    return seg_result


def process_file(rel_path: str, spec, converted_cache: dict):
    """
    处理单个文件：
      - spec 形式：
        * int (chapter)              -> 整文件归该章
        * ("answer", chapter)        -> 答案文件，整文件归该章
        * [(start_num, chapter), ...] -> 按题号区间切分到不同章
        * ("by_chapter_title", default_ch) -> 按 "Chapter N" 标题切分
        * ("answer_by_chapter_title", default_ch) -> 答案文件 + 按 Chapter 标题切分
      - converted_cache: {abs_path: (docx_path, media_dir, md_path)} 复用转换结果
    返回: [(chapter, is_answer, [items])]
    """
    abs_path = resolve_origin_path(rel_path)
    if not abs_path:
        print(f"  ! SKIP (not found): {rel_path}")
        AUDIT["missing_sources"].append(rel_path)
        return []
    print(f"\n>>> Processing: {rel_path}")

    if isinstance(spec, tuple) and spec[0] == "pdf_answer_asset":
        ch = spec[1]
        asset_dir = FORMED / f"Ch{ch:02d}" / "Assests"
        asset_dir.mkdir(parents=True, exist_ok=True)
        dst = asset_dir / abs_path.name
        shutil.copy2(abs_path, dst)
        AUDIT["unconverted_pdf_sources"].append({
            "chapter": ch,
            "source": rel_path,
            "asset": dst.name,
            "reason": "scanned/empty-text PDF copied as asset; OCR is required for answer text",
        })
        print(f"  + pdf asset {abs_path.name} -> Ch{ch:02d}/Assests/")
        return []

    # 1. 转 docx
    if abs_path in converted_cache:
        docx_path, media_dir, md_path = converted_cache[abs_path]
    else:
        docx_dir = WORK / "docx" / abs_path.parent.name
        docx_dir.mkdir(parents=True, exist_ok=True)
        if abs_path.suffix.lower() == '.doc':
            docx_path = convert_doc_to_docx(abs_path, docx_dir)
        else:
            # .docx 直接拷贝（避免原文件名冲突）
            docx_path = docx_dir / (abs_path.stem + ".docx")
            if abs_path.resolve() != docx_path.resolve():
                shutil.copy2(abs_path, docx_path)
        # 2. 转 md
        media_dir = WORK / "media" / abs_path.stem
        md_path = WORK / "md" / (abs_path.stem + ".md")
        md_path.parent.mkdir(parents=True, exist_ok=True)
        convert_docx_to_md(docx_path, media_dir, md_path)
        converted_cache[abs_path] = (docx_path, media_dir, md_path)

    md_text = md_path.read_text(encoding='utf-8', errors='replace')
    lines = md_text.splitlines()

    # 3. 确定 spec 类型与切分方式
    is_answer = False
    if isinstance(spec, int):
        seg_result = {spec: lines}
    elif isinstance(spec, tuple) and spec[0] == "answer":
        seg_result = {spec[1]: lines}
        is_answer = True
    elif isinstance(spec, tuple) and spec[0] == "answer_segments":
        seg_result = segment_lines_for_chapter(spec[1], lines)
        if not seg_result:
            seg_result = {spec[1][0][1]: lines}
        is_answer = True
    elif isinstance(spec, list):
        seg_result = segment_lines_for_chapter(spec, lines)
        if not seg_result:
            seg_result = {spec[0][1]: lines}
    elif isinstance(spec, tuple) and spec[0] == "by_chapter_title":
        seg_result = segment_by_chapter_title(lines, spec[1])
    elif isinstance(spec, tuple) and spec[0] == "answer_by_chapter_title":
        seg_result = segment_by_chapter_title(lines, spec[1])
        is_answer = True
    else:
        raise ValueError(f"bad spec: {spec}")

    output = []
    for ch, ch_lines in seg_result.items():
        ch_text = '\n'.join(ch_lines)
        # 4. 顶级题号切分
        topics, _ = split_topics(ch_text)
        if not topics:
            # 无题号切分：整段作为一个 "无编号" 条目
            if is_answer:
                output.append((ch, True, [{'qid': f'ch{ch:02d}_all', 'answer': clean_question_text(ch_text),
                                            'answer_context': '', 'source': rel_path,
                                            '_source_key': source_key(rel_path, ch)}]))
            else:
                output.append((ch, False, [{'qid': f'ch{ch:02d}_all', 'content': clean_question_text(ch_text),
                                             'source': rel_path, '_source_key': source_key(rel_path, ch)}]))
            continue

        topic_lines_list = []
        for i, (num, idx, _) in enumerate(topics):
            end = topics[i + 1][1] if i + 1 < len(topics) else len(ch_lines)
            topic_lines_list.append((num, ch_lines[idx:end]))

        for tnum, tlines in topic_lines_list:
            qid = f"ch{ch:02d}_q{tnum:02d}"
            q_lines, a_text = extract_answer_from_topic_lines(tlines)
            q_text = '\n'.join(q_lines)
            mc = [0]
            q_text = remap_media_refs(q_text, media_dir, ch, qid, mc)
            if a_text:
                a_text = remap_media_refs(a_text, media_dir, ch, qid + "_ans", mc)
            q_text = strip_topic_marker(q_text)
            q_text = clean_question_text(q_text)
            if is_answer:
                # 纯答案文件：若 extract_answer_from_topic_lines 没找到 Ans: 标记，
                # 则整个 topic_lines 就是答案内容
                if not a_text:
                    a_text = clean_question_text(q_text)
                    q_text = ''
                output.append((ch, True, [{
                    'qid': qid,
                    'raw_num': tnum,
                    'answer': a_text,
                    'answer_context': q_text,
                    'source': rel_path,
                    '_source_key': source_key(rel_path, ch),
                }]))
            else:
                item = {
                    'qid': qid,
                    'raw_num': tnum,
                    'content': q_text,
                    'source': rel_path,
                    '_source_key': source_key(rel_path, ch),
                }
                if a_text:
                    item['answer'] = a_text
                output.append((ch, False, [item]))
    return output


def copy_external_datasets():
    """拷贝 .xls/.xlsx 数据集到对应 chapter 的 Assests/"""
    # 已知数据集文件
    datasets = [
        ("Assigments for Speaking of Statistics-Semester2-2014-2015/Assignment-Chapter01-02/Data-Chapter01-02.xlsx", 1),
        ("Assigments for Speaking of Statistics-Semester2-2014-2015/Assignment-Chapter01-02/Data-Chapter01-02.xlsx", 2),
        ("Assigments for Speaking of Statistics-Semester2-2014-2015/Assignment-Chapter03/dataset_10K.xls", 3),
        ("Assignment Prof Lv/Assignment2  Data.xls", 2),
    ]
    for rel, ch in datasets:
        src = ORIGIN / rel
        if not src.exists():
            print(f"  ! dataset missing: {rel}")
            continue
        dst = FORMED / f"Ch{ch:02d}" / "Assests" / src.name
        try:
            shutil.copy2(src, dst)
            print(f"  + dataset {src.name} -> Ch{ch:02d}/Assests/")
        except Exception as e:
            print(f"  ! copy failed: {e}")


def append_answer(question: dict, answer: str, label: str = "from solution"):
    answer = clean_question_text(answer)
    if not answer:
        return
    old = question.get('answer', '')
    if not old:
        question['answer'] = answer
        return
    if normalize_for_match(answer, 200) and normalize_for_match(answer, 200) in normalize_for_match(old):
        return
    question['answer'] = old + f"\n\n--- ({label}) ---\n\n" + answer


def find_answer_target(ans_item: dict, questions: list[dict]) -> dict | None:
    qid = ans_item.get('qid', '')
    skey = ans_item.get('_source_key', '')

    same_key = [q for q in questions if q.get('_source_key') == skey]
    candidates = [q for q in same_key if q.get('qid') == qid]
    if len(candidates) == 1:
        return candidates[0]

    context_norm = normalize_for_match(ans_item.get('answer_context', ''), 220)
    answer_norm = normalize_for_match(ans_item.get('answer', ''), 900)
    if (context_norm and len(context_norm) >= 30) or (answer_norm and len(answer_norm) >= 60):
        scored = []
        for q in same_key or questions:
            q_norm = normalize_for_match(q.get('content', ''), 180)
            q_head = normalize_for_match(q.get('content', ''), 80)
            if q_norm and context_norm and (q_norm in context_norm or context_norm in q_norm):
                pos = context_norm.find(q_norm) if q_norm in context_norm else 0
                scored.append((pos, q))
            elif q_head and len(q_head) >= 40 and q_head in answer_norm:
                scored.append((answer_norm.find(q_head), q))
        if len(scored) == 1:
            return scored[0][1]
        if scored:
            scored.sort(key=lambda item: item[0])
            if len(scored) == 1 or scored[0][0] < scored[1][0]:
                return scored[0][1]

    # As a conservative fallback, use qid-only only when it is unique in the chapter.
    candidates = [q for q in questions if q.get('qid') == qid]
    if len(candidates) == 1:
        return candidates[0]
    return None


def merge_pending_answers(chapter: int, data: dict):
    questions = data.get('questions', [])
    for ans_item in data.get('pending_answers', []):
        answer = ans_item.get('answer', '')
        if not answer:
            continue
        target = find_answer_target(ans_item, questions)
        if target is None:
            data.setdefault('orphan_answers', []).append({
                'qid': ans_item.get('qid', ''),
                'source': ans_item.get('source', ''),
                'answer': clean_question_text(answer),
            })
            AUDIT["unmatched_answers"].append({
                "chapter": chapter,
                "qid": ans_item.get('qid', ''),
                "source": ans_item.get('source', ''),
            })
            continue
        append_answer(target, answer)


def infer_data_refs(question: dict, chapter: int) -> list[str]:
    text = (question.get('content', '') + '\n' + question.get('answer', '')).lower()
    src = question.get('source', '').lower()
    refs = []
    if chapter in (1, 2) and 'assignment-chapter01-02' in src:
        refs.append('Data-Chapter01-02.xlsx')
    if chapter == 3 and ('dataset' in text or '10k' in text or 'assignment-chapter03' in src):
        refs.append('dataset_10K.xls')
    if chapter == 2 and ('assignment2  data' in text or 'data in' in text or 'waiting time' in text):
        refs.append('Assignment2  Data.xls')
    return sorted(set(refs))


def refresh_asset_refs(question: dict, chapter: int):
    text = question.get('content', '') + '\n' + question.get('answer', '')
    formula_refs = re.findall(r'\[FORMULA:([^\]]+)\]', text)
    data_refs = re.findall(r'\[DATA:([^\]]+)\]', text)
    data_refs.extend(infer_data_refs(question, chapter))
    question['formula_refs'] = sorted(set(formula_refs))
    question['data_refs'] = sorted(set(data_refs))


def dedupe_questions(questions: list[dict]) -> list[dict]:
    seen_hash = {}
    dedup_questions = []
    for q in questions:
        norm = normalize_for_match(q.get('content', ''), 240)
        if not norm:
            dedup_questions.append(q)
            continue
        h = hashlib.md5(norm.encode('utf-8')).hexdigest()
        if h in seen_hash:
            old = dedup_questions[seen_hash[h]]
            if q.get('answer'):
                append_answer(old, q['answer'], label="merged dup")
            if q.get('source') and q.get('source') not in old.get('source', ''):
                old['source'] = old.get('source', '') + ' | ' + q.get('source', '')
        else:
            seen_hash[h] = len(dedup_questions)
            dedup_questions.append(q)
    return dedup_questions


def write_audit_report():
    audit_path = FORMED / "_conversion_audit.json"
    audit_path.write_text(json.dumps(AUDIT, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  audit -> {audit_path}")


def main():
    # _work 中已有的 pandoc markdown 质量更高；当前机器未必有 pandoc，不能删除。
    WORK.mkdir(parents=True, exist_ok=True)
    (WORK / "md").mkdir(parents=True, exist_ok=True)
    (WORK / "media").mkdir(parents=True, exist_ok=True)
    (WORK / "docx").mkdir(parents=True, exist_ok=True)
    if FORMED.exists():
        shutil.rmtree(FORMED)
    FORMED.mkdir(parents=True, exist_ok=True)
    for ch in range(1, 14):
        (FORMED / f"Ch{ch:02d}" / "Assests").mkdir(parents=True, exist_ok=True)

    # {chapter: {'questions': [...], 'pending_answers': {source: [(qid, answer)]}}}
    # 题目按 (source, original_qid) 去重；最终重排 id 为 ch{NN}_q{seq:02d}
    chapters_data = {i: {'questions': [], 'pending_answers': []} for i in range(1, 14)}

    converted_cache = {}
    for rel_path, spec in FILE_CHAPTER_MAP:
        try:
            results = process_file(rel_path, spec, converted_cache)
        except Exception as e:
            print(f"  !! ERROR processing {rel_path}: {e}")
            continue
        for ch, is_answer, items in results:
            if ch not in chapters_data:
                chapters_data[ch] = {'questions': [], 'pending_answers': []}
            if not is_answer:
                # 题目：按 (source, qid) 去重
                existing = {(q.get('source',''), q['qid']): i
                            for i, q in enumerate(chapters_data[ch]['questions'])}
                for item in items:
                    key = (item.get('source',''), item['qid'])
                    if key in existing:
                        idx = existing[key]
                        # 合并：若旧条目已有 answer，且新 item 无 answer，保留旧
                        old_ans = chapters_data[ch]['questions'][idx].get('answer', '')
                        chapters_data[ch]['questions'][idx].update(item)
                        if old_ans and not item.get('answer'):
                            chapters_data[ch]['questions'][idx]['answer'] = old_ans
                    else:
                        chapters_data[ch]['questions'].append(item)
                        existing[key] = len(chapters_data[ch]['questions']) - 1
            else:
                # 答案：暂存，待最后按 (source, qid) 匹配
                chapters_data[ch]['pending_answers'].extend(items)

    # 拷贝外部数据集
    print("\n=== Copying external datasets ===")
    copy_external_datasets()

    # 规范化字段并写入 JSON
    print("\n=== Writing JSON ===")
    for ch in sorted(chapters_data.keys()):
        data = chapters_data[ch]
        questions = data.get('questions', [])
        pending = data.get('pending_answers', [])

        merge_pending_answers(ch, data)
        questions = dedupe_questions(questions)

        # 重新分配 id（ch{NN}_q{seq:02d}），按题目在列表中的顺序
        for i, q in enumerate(questions, 1):
            q.setdefault('type', 'unknown')
            q.setdefault('difficulty', 1)
            q.setdefault('keywords', [])
            q['id'] = f"ch{ch:02d}_q{i:02d}"
            q.setdefault('content', '')
            q.setdefault('answer', '')
            q.setdefault('source', '')
            refresh_asset_refs(q, ch)
            q.pop('qid', None)
            q.pop('raw_num', None)
            q.pop('_source_key', None)
        out = {
            'chapter': ch,
            'questions': questions,
        }
        if data.get('orphan_answers'):
            out['orphan_answers'] = data['orphan_answers']
        out_path = FORMED / f"Ch{ch:02d}" / "questions.json"
        out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
        n_ans = sum(1 for q in questions if q.get('answer'))
        print(f"  Ch{ch:02d}: {len(questions)} questions ({n_ans} with answer) -> {out_path}")

    write_audit_report()
    print("\n=== DONE ===")


if __name__ == '__main__':
    main()
