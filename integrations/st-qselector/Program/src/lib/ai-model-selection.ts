export interface AiModelOption {
  key: string;
  displayName: string;
  quantization: string;
  params: string;
  loaded: boolean;
}

export function isSelectableAiModel(model: AiModelOption): boolean {
  return model.loaded === true;
}

export function selectLoadedAiModel(models: readonly AiModelOption[], key: string): string {
  if (!key) return "";
  const selected = models.find((model) => model.key === key);
  return selected && isSelectableAiModel(selected) ? selected.key : "";
}
