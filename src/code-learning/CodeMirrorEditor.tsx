import { python } from "@codemirror/lang-python";
import { Compartment, Prec } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { r } from "codemirror-lang-r";
import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";
import "./code-mirror-editor.css";

type Props = {
  id: string;
  labelId?: string;
  language: "r" | "python";
  label: string;
  minHeight: number;
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
};

type EditorAttributes = Pick<Props, "id" | "label" | "labelId">;
type EditorConfiguration = EditorAttributes & Pick<Props, "language" | "value">;

function languageExtension(language: Props["language"]) {
  return language === "r" ? r() : python();
}

function contentAttributes({ id, label, labelId }: EditorAttributes) {
  return EditorView.contentAttributes.of({
    id,
    role: "textbox",
    ...(labelId ? { "aria-labelledby": labelId } : { "aria-label": label }),
    "aria-multiline": "true",
    autocapitalize: "off",
    autocomplete: "off",
    spellcheck: "false",
  });
}

export function CodeMirrorEditor({
  id,
  labelId,
  language,
  label,
  minHeight,
  value,
  onChange,
  onRun,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  const syncingExternalValueRef = useRef(false);
  const compartmentsRef = useRef({
    contentAttributes: new Compartment(),
    language: new Compartment(),
  });
  const initialConfigurationRef = useRef<EditorConfiguration>({
    id,
    label,
    labelId,
    language,
    value,
  });

  onChangeRef.current = onChange;
  onRunRef.current = onRun;
  initialConfigurationRef.current = { id, label, labelId, language, value };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const initialConfiguration = initialConfigurationRef.current;
    const compartments = compartmentsRef.current;

    const view = new EditorView({
      parent: host,
      doc: initialConfiguration.value,
      extensions: [
        basicSetup,
        compartments.language.of(languageExtension(initialConfiguration.language)),
        oneDark,
        EditorView.lineWrapping,
        // basicSetup's defaultKeymap also binds Mod-Enter (insertBlankLine);
        // a highest-precedence keymap keeps Ctrl/Cmd+Enter meaning "run".
        Prec.high(
          keymap.of([
            {
              key: "Mod-Enter",
              preventDefault: true,
              run: () => {
                onRunRef.current();
                return true;
              },
            },
          ]),
        ),
        compartments.contentAttributes.of(contentAttributes(initialConfiguration)),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !syncingExternalValueRef.current) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });
    viewRef.current = view;

    return () => {
      viewRef.current = null;
      view.destroy();
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: compartmentsRef.current.language.reconfigure(languageExtension(language)),
    });
  }, [language]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: compartmentsRef.current.contentAttributes.reconfigure(
        contentAttributes({ id, label, labelId }),
      ),
    });
  }, [id, label, labelId]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentValue = view.state.doc.toString();
    if (currentValue === value) return;

    syncingExternalValueRef.current = true;
    try {
      view.dispatch({
        changes: { from: 0, to: currentValue.length, insert: value },
      });
    } finally {
      syncingExternalValueRef.current = false;
    }
  }, [value]);

  return (
    <div
      ref={hostRef}
      className="ed-code-editor"
      data-language={language}
      style={
        {
          "--ed-code-editor-height": `${minHeight}px`,
        } as CSSProperties
      }
    />
  );
}
