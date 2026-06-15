"use client";

import { useMediaQuery } from "@/hooks/use-media-query";
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import Link from "next/link";
import { useState, useRef } from "react";
import confetti from "canvas-confetti";
import NumberFlow from "@number-flow/react";

export interface PricingPlan {
  name: string;
  price: number | null;
  yearlyPrice: number | null;
  period: string;
  yearlyPeriod?: string;
  features: string[];
  description: string;
  buttonText: string;
  /**
   * Either `href` (Link navigation) or `onSelect` (in-page handler) must be
   * supplied — `onSelect` takes precedence when both are present. Pass `null`
   * for both to render a disabled button (e.g. "Mevcut Planınız").
   */
  href: string | null;
  /**
   * Called with the active billing cycle when the user clicks the plan button.
   * Use this for in-page modal flows instead of navigating to a checkout page.
   */
  onSelect?: (cycle: "monthly" | "yearly") => void;
  isPopular: boolean;
  customPriceLabel?: string;
}

interface PricingProps {
  plans: PricingPlan[];
  title?: string;
  description?: string;
  creditNote?: string;
}

export function Pricing({
  plans,
  title = "Şeffaf fiyatlandırma",
  description = "İhtiyacınıza uygun planı seçin. İstediğiniz zaman geçiş yapın.",
  creditNote,
}: PricingProps) {
  const [isMonthly, setIsMonthly] = useState(true);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const switchRef = useRef<HTMLDivElement>(null);

  const handleToggle = (yearly: boolean) => {
    setIsMonthly(!yearly);
    if (yearly && switchRef.current) {
      const rect = switchRef.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      confetti({
        particleCount: 50,
        spread: 60,
        origin: {
          x: x / window.innerWidth,
          y: y / window.innerHeight,
        },
        colors: ["#fe703a", "#ffce52", "#2cc069", "#4a90e2"],
        ticks: 200,
        gravity: 1.2,
        decay: 0.94,
        startVelocity: 30,
        shapes: ["circle"],
      });
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div
          style={{
            display: "inline-block",
            padding: "6px 14px",
            borderRadius: 999,
            background: "var(--poster-accent)",
            border: "2px solid var(--poster-ink)",
            boxShadow: "0 3px 0 var(--poster-ink)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: "#fff",
            fontFamily: "var(--font-display)",
            marginBottom: 14,
          }}
        >
          Fiyatlandırma
        </div>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(32px, 5vw, 44px)",
            letterSpacing: "-.02em",
            color: "var(--poster-ink)",
            margin: 0,
          }}
        >
          {title}
        </h2>
        <p
          style={{
            marginTop: 10,
            fontSize: 15,
            color: "var(--poster-ink-2)",
            fontFamily: "var(--font-display)",
          }}
        >
          {description}
        </p>
      </div>

      {/* Billing toggle — poster pill */}
      <div
        ref={switchRef}
        style={{
          display: "inline-flex",
          margin: "0 auto 36px",
          left: "50%",
          position: "relative",
          transform: "translateX(-50%)",
          padding: 4,
          background: "var(--poster-panel)",
          border: "2px solid var(--poster-ink)",
          borderRadius: 999,
          boxShadow: "0 4px 0 var(--poster-ink)",
        }}
      >
        <button
          type="button"
          onClick={() => handleToggle(false)}
          style={{
            padding: "8px 20px",
            borderRadius: 999,
            border: "none",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            background: isMonthly ? "var(--poster-ink)" : "transparent",
            color: isMonthly ? "#fff" : "var(--poster-ink-2)",
            transition: "background .15s, color .15s",
          }}
        >
          Aylık
        </button>
        <button
          type="button"
          onClick={() => handleToggle(true)}
          style={{
            padding: "8px 20px",
            borderRadius: 999,
            border: "none",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            background: !isMonthly ? "var(--poster-accent)" : "transparent",
            color: !isMonthly ? "#fff" : "var(--poster-ink-2)",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            transition: "background .15s, color .15s",
          }}
        >
          Yıllık
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              padding: "2px 6px",
              borderRadius: 6,
              background: !isMonthly ? "#fff" : "var(--poster-yellow)",
              color: "var(--poster-ink)",
              border: "1.5px solid var(--poster-ink)",
            }}
          >
            -%15
          </span>
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 20,
          paddingTop: 16,
        }}
      >
        {plans.map((plan, index) => (
          <motion.div
            key={index}
            initial={{ y: 30, opacity: 1 }}
            whileInView={
              isDesktop
                ? {
                    y: plan.isPopular ? -16 : 0,
                    opacity: 1,
                  }
                : {}
            }
            viewport={{ once: true }}
            transition={{
              duration: 1.2,
              type: "spring",
              stiffness: 100,
              damping: 30,
              delay: 0.2,
              opacity: { duration: 0.4 },
            }}
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              background: "var(--poster-panel)",
              border: "2px solid var(--poster-ink)",
              borderRadius: 18,
              boxShadow: plan.isPopular
                ? "0 8px 0 var(--poster-accent)"
                : "0 6px 0 var(--poster-ink)",
              padding: "24px 20px",
            }}
          >
            {plan.isPopular && (
              <div
                style={{
                  position: "absolute",
                  top: -14,
                  right: 16,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  background: "var(--poster-accent)",
                  color: "#fff",
                  border: "2px solid var(--poster-ink)",
                  borderRadius: 999,
                  boxShadow: "0 3px 0 var(--poster-ink)",
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                <Star size={12} fill="currentColor" />
                Popüler
              </div>
            )}

            <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  color: "var(--poster-ink-2)",
                  fontFamily: "var(--font-display)",
                  margin: 0,
                }}
              >
                {plan.name}
              </p>

              <div
                style={{
                  marginTop: 18,
                  display: "flex",
                  alignItems: "baseline",
                  gap: 4,
                  color: "var(--poster-ink)",
                  fontFamily: "var(--font-display)",
                }}
              >
                {plan.customPriceLabel ? (
                  <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-.02em" }}>
                    {plan.customPriceLabel}
                  </span>
                ) : (
                  <>
                    <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-.02em" }}>
                      <NumberFlow
                        value={isMonthly ? (plan.price ?? 0) : (plan.yearlyPrice ?? 0)}
                        format={{
                          style: "currency",
                          currency: "TRY",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                          currencyDisplay: "narrowSymbol",
                        }}
                        transformTiming={{ duration: 500, easing: "ease-out" }}
                        willChange
                      />
                    </span>
                    {plan.period && (
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--poster-ink-2)" }}>
                        / {isMonthly ? plan.period : (plan.yearlyPeriod ?? plan.period)}
                      </span>
                    )}
                  </>
                )}
              </div>

              {!plan.customPriceLabel && (
                <p
                  style={{
                    marginTop: 2,
                    fontSize: 11,
                    color: "var(--poster-ink-3)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {isMonthly ? "aylık faturalandırılır" : "yıllık faturalandırılır"}
                </p>
              )}

              <ul
                style={{
                  marginTop: 22,
                  display: "flex",
                  flex: 1,
                  flexDirection: "column",
                  gap: 10,
                  padding: 0,
                  listStyle: "none",
                }}
              >
                {plan.features.map((feature, idx) => (
                  <li key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        background: "var(--poster-accent)",
                        border: "1.5px solid var(--poster-ink)",
                        color: "#fff",
                        marginTop: 1,
                      }}
                    >
                      <Check size={12} strokeWidth={3} />
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        lineHeight: 1.5,
                        color: "var(--poster-ink-2)",
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <div
                style={{
                  margin: "22px 0 16px",
                  height: 2,
                  background: "var(--poster-ink)",
                  opacity: 0.1,
                }}
              />

              {plan.onSelect ? (
                <button
                  type="button"
                  onClick={() => plan.onSelect!(isMonthly ? "monthly" : "yearly")}
                  style={{
                    width: "100%",
                    padding: "11px 16px",
                    textAlign: "center",
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: "var(--font-display)",
                    borderRadius: 12,
                    border: "2px solid var(--poster-ink)",
                    boxShadow: "0 4px 0 var(--poster-ink)",
                    background: plan.isPopular ? "var(--poster-accent)" : "var(--poster-panel)",
                    color: plan.isPopular ? "#fff" : "var(--poster-ink)",
                    cursor: "pointer",
                    transition: "transform .1s, box-shadow .1s",
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = "translateY(3px)";
                    e.currentTarget.style.boxShadow = "0 1px 0 var(--poster-ink)";
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow = "0 4px 0 var(--poster-ink)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow = "0 4px 0 var(--poster-ink)";
                  }}
                >
                  {plan.buttonText}
                </button>
              ) : plan.href ? (
                <Link
                  href={`${plan.href}${plan.href.includes("?") ? "&" : "?"}cycle=${isMonthly ? "monthly" : "yearly"}`}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "11px 16px",
                    textAlign: "center",
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: "var(--font-display)",
                    borderRadius: 12,
                    border: "2px solid var(--poster-ink)",
                    boxShadow: "0 4px 0 var(--poster-ink)",
                    background: plan.isPopular ? "var(--poster-accent)" : "var(--poster-panel)",
                    color: plan.isPopular ? "#fff" : "var(--poster-ink)",
                    textDecoration: "none",
                    transition: "transform .1s, box-shadow .1s",
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = "translateY(3px)";
                    e.currentTarget.style.boxShadow = "0 1px 0 var(--poster-ink)";
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow = "0 4px 0 var(--poster-ink)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow = "0 4px 0 var(--poster-ink)";
                  }}
                >
                  {plan.buttonText}
                </Link>
              ) : (
                <button
                  disabled
                  style={{
                    width: "100%",
                    padding: "11px 16px",
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: "var(--font-display)",
                    borderRadius: 12,
                    border: "2px dashed var(--poster-ink)",
                    background: "transparent",
                    color: "var(--poster-ink-3)",
                    cursor: "not-allowed",
                  }}
                >
                  {plan.buttonText}
                </button>
              )}

              <p
                style={{
                  marginTop: 14,
                  textAlign: "center",
                  fontSize: 11,
                  color: "var(--poster-ink-3)",
                  fontFamily: "var(--font-display)",
                }}
              >
                {plan.description}
              </p>

              {creditNote && (
                <p
                  style={{
                    marginTop: 12,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "var(--poster-bg-2)",
                    border: "1.5px solid var(--poster-ink)",
                    fontSize: 11,
                    lineHeight: 1.5,
                    color: "var(--poster-ink-2)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  <span style={{ fontWeight: 700, color: "var(--poster-ink)" }}>Kredi nedir?</span>{" "}
                  {creditNote}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
