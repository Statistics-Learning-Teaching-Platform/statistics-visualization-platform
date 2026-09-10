export const MAX_EXPORT_SOURCE_CHARACTERS = 600_000;
export const MAX_EXPORT_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_EXPORT_TOTAL_IMAGE_BYTES = 16 * 1024 * 1024;
export const MAX_EXPORT_IMAGES = 40;
export const MAX_EXPORT_TABLE_CELLS = 2_000;
export const MAX_EXPORT_OUTPUT_BYTES = 32 * 1024 * 1024;

export class ExportBudgetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExportBudgetError";
  }
}

export interface ExportBudget {
  imageBytes: number;
  images: number;
  tableCells: number;
}

export function createExportBudget(): ExportBudget {
  return { imageBytes: 0, images: 0, tableCells: 0 };
}

export function assertExportSourceBudget(characters: number): void {
  if (!Number.isSafeInteger(characters) || characters < 0 || characters > MAX_EXPORT_SOURCE_CHARACTERS) {
    throw new ExportBudgetError("试卷文字内容过多，请减少题目或关闭答案后重试");
  }
}

export function reserveExportImage(budget: ExportBudget, bytes: number): void {
  if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > MAX_EXPORT_IMAGE_BYTES) {
    throw new ExportBudgetError("试卷包含过大的图片附件");
  }
  if (budget.images + 1 > MAX_EXPORT_IMAGES || budget.imageBytes + bytes > MAX_EXPORT_TOTAL_IMAGE_BYTES) {
    throw new ExportBudgetError("试卷图片总量过大，请减少包含图片的题目");
  }
  budget.images += 1;
  budget.imageBytes += bytes;
}

export function reserveExportTableCells(budget: ExportBudget, cells: number): void {
  if (!Number.isSafeInteger(cells) || cells < 0 || budget.tableCells + cells > MAX_EXPORT_TABLE_CELLS) {
    throw new ExportBudgetError("试卷表格过于复杂，请减少表格题目");
  }
  budget.tableCells += cells;
}

export function assertExportOutputBudget(bytes: number): void {
  if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > MAX_EXPORT_OUTPUT_BYTES) {
    throw new ExportBudgetError("生成的 DOCX 文件过大，请减少题目后重试");
  }
}
