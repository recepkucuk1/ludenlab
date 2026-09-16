import React from "react";
import { renderToFile } from "@react-pdf/renderer";
import { CardPDFDocument } from "@studio/components/cards/CardPDFDocument";
import type { GeneratedCard } from "@studio/lib/prompts";
import { r2Card } from "../../src/reels/r2-kartlar/cardData";

export const renderCardPdf = (outPath: string) =>
  renderToFile(<CardPDFDocument card={r2Card as unknown as GeneratedCard} />, outPath);
