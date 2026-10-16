"use client";

import { useTranslations } from "next-intl";
import { field } from "@/components/styles";
import {
  CARD_LAYOUTS,
  SIGNATURE_MAX,
  TEXTURE_NAMES,
  TEXTURES,
  type CardLayout,
  type CardStyle,
} from "@/lib/card-style";

const pill =
  "flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-full px-3 text-center text-[16px] leading-tight text-ink-soft has-[:checked]:bg-button has-[:checked]:text-surface has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink";

/**
 * The owner dresses the card: layout, table, the phrase short layouts show, a signature.
 * Everything starts on a good default, so changing nothing is fine. Changes are saved by the parent.
 */
export function CardStyler({
  style,
  onChange,
  palette,
  sentences,
  status,
}: {
  style: CardStyle;
  onChange: (style: CardStyle) => void;
  /** Table colours taken from the photo, strongest first. */
  palette: { table: string }[];
  /** Sentences of the story the owner may show large. */
  sentences: string[];
  status: "idle" | "saving" | "saved" | "error";
}) {
  const t = useTranslations("CardStyle");
  const LAYOUT_LABEL: Record<CardLayout, string> = {
    page: t("layoutPage"),
    polaroid: t("layoutPolaroid"),
    photo: t("layoutPhoto"),
  };
  const swatch =
    "size-11 flex-none rounded-full border border-ink/20 aria-pressed:outline-2 aria-pressed:outline-offset-2 aria-pressed:outline-ink";

  return (
    <div className="grid gap-6">
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="mb-2.5 p-0 text-[16px] text-ink-soft">{t("layoutLabel")}</legend>
        <div className="flex min-w-0 gap-1 rounded-full border border-line bg-surface p-1">
          {CARD_LAYOUTS.map((layout) => (
            <label key={layout} className={pill}>
              <input
                type="radio"
                name="card-layout"
                value={layout}
                checked={style.layout === layout}
                onChange={() => onChange({ ...style, layout })}
                className="sr-only"
              />
              {LAYOUT_LABEL[layout]}
            </label>
          ))}
        </div>
      </fieldset>

      {style.layout !== "photo" && (
        <div>
          <div className="mb-2.5 text-[16px] text-ink-soft" id="table-label">
            {t("tableLabel")}
          </div>
          <div role="group" aria-labelledby="table-label" className="flex flex-wrap gap-2.5">
            {palette.map((color, index) => (
              <button
                key={index}
                type="button"
                aria-pressed={style.table.kind === "photo" && style.table.index === index}
                aria-label={t("tablePhoto", { n: index + 1 })}
                onClick={() => onChange({ ...style, table: { kind: "photo", index } })}
                className={swatch}
                style={{ backgroundColor: color.table }}
              />
            ))}
            {TEXTURE_NAMES.map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={style.table.kind === "texture" && style.table.name === name}
                aria-label={t(`texture_${name}`)}
                title={t(`texture_${name}`)}
                onClick={() => onChange({ ...style, table: { kind: "texture", name } })}
                className={swatch}
                style={{
                  backgroundColor: TEXTURES[name].color,
                  backgroundImage: TEXTURES[name].image === "none" ? undefined : TEXTURES[name].image,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {style.layout !== "page" && sentences.length > 0 && (
        <div>
          <div className="mb-2.5 text-[16px] text-ink-soft" id="quote-label">
            {t("quoteLabel")}
          </div>
          <div role="group" aria-labelledby="quote-label" className="flex flex-col gap-2">
            {[null, ...sentences.slice(0, 6)].map((quote) => (
              <button
                key={quote ?? "auto"}
                type="button"
                aria-pressed={style.quote === quote}
                onClick={() => onChange({ ...style, quote })}
                className="border border-line bg-surface px-4 py-3 text-left font-serif text-[17px] leading-snug text-ink aria-pressed:border-ink aria-pressed:bg-print aria-pressed:shadow-[inset_3px_0_0_var(--ink)]"
              >
                {quote ?? <span className="font-sans text-ink-soft">{t("quoteAuto")}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label htmlFor="card-signature" className="text-[16px] text-ink-soft">
          {t("signatureLabel")}
        </label>
        <input
          id="card-signature"
          type="text"
          maxLength={SIGNATURE_MAX}
          value={style.signature ?? ""}
          onChange={(e) => onChange({ ...style, signature: e.target.value || null })}
          placeholder={t("signaturePlaceholder")}
          className={`mt-1.5 w-full font-hand text-[24px] ${field}`}
        />
      </div>

      <p aria-live="polite" className="m-0 min-h-[1.4em] text-[15px] text-ink-soft">
        {status === "saving" && t("saving")}
        {status === "saved" && t("saved")}
        {status === "error" && t("error")}
      </p>
    </div>
  );
}
