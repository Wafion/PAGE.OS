"use client";

import { useEffect, useState, type CSSProperties, type MouseEvent } from "react";

export type FloatingCard = {
  id: number | string;
  imgSrc: string;
  title?: string;
  author?: string;
  href?: string;
};

type FloatingCardsProps = {
  cards: FloatingCard[];
};

export default function FloatingCards({ cards }: FloatingCardsProps) {
  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollOffset(window.scrollY * 0.18);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const moveCard = (event: MouseEvent<HTMLAnchorElement>, lift: string) => {
    event.currentTarget.style.setProperty("--card-lift", lift);
  };

  return (
    <div
      className="floating-cards"
      style={{ "--floating-scroll": `${scrollOffset * 0.08}px` } as CSSProperties}
      aria-label="Three-dimensional recommendation shelf"
    >
      <div className="floating-cards-stack">
        {cards.map((card, index) => {
          const content = (
            <>
              <img src={card.imgSrc || "/placeholder.svg"} alt={card.title ? `${card.title} cover` : `Recommendation ${index + 1}`} loading="lazy" />
              <span className="floating-card-number">{String(index + 1).padStart(2, "0")}</span>
              {card.title ? <strong>{card.title}</strong> : null}
              {card.author ? <small>{card.author}</small> : null}
            </>
          );

          return card.href ? (
            <a
              key={card.id}
              href={card.href}
              className="floating-card"
              style={{ "--card-rotation": `${(index - 2.5) * 3}deg` } as CSSProperties}
              onMouseEnter={(event) => moveCard(event, "-12px")}
              onMouseLeave={(event) => moveCard(event, "0px")}
            >
              {content}
            </a>
          ) : (
            <div key={card.id} className="floating-card" style={{ "--card-rotation": `${(index - 2.5) * 3}deg` } as CSSProperties}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
