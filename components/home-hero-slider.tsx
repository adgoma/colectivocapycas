"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SlideAction = {
  href: string;
  label: string;
  variant?: "primary" | "ghost";
};

export type HomeHeroSlide = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  imageAlt?: string;
  primaryAction: SlideAction;
  secondaryAction?: SlideAction;
};

type HomeHeroSliderProps = {
  slides: HomeHeroSlide[];
  autoPlayMs?: number;
};

export function HomeHeroSlider({ slides, autoPlayMs = 7000 }: HomeHeroSliderProps) {
  const safeSlides = useMemo(() => slides.filter((slide) => Boolean(slide.title)), [slides]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (safeSlides.length < 2) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((previous) => (previous + 1) % safeSlides.length);
    }, autoPlayMs);

    return () => window.clearInterval(timer);
  }, [safeSlides.length, autoPlayMs]);

  useEffect(() => {
    if (activeIndex > safeSlides.length - 1) {
      setActiveIndex(0);
    }
  }, [safeSlides.length, activeIndex]);

  if (safeSlides.length === 0) {
    return null;
  }

  const currentSlide = safeSlides[activeIndex];

  return (
    <section className="hero-slider card" aria-label="Slider principal de portada">
      <div className="hero-slider__main">
        <div className="hero-slider__content">
          <p className="hero-slider__eyebrow">{currentSlide.eyebrow}</p>
          <h1 className="hero-slider__title">{currentSlide.title}</h1>
          <p className="hero-slider__description">{currentSlide.description}</p>
          <div className="actions hero-slider__actions">
            <Link href={currentSlide.primaryAction.href} className={`button button--${currentSlide.primaryAction.variant ?? "primary"}`}>
              {currentSlide.primaryAction.label}
            </Link>
            {currentSlide.secondaryAction ? (
              <Link href={currentSlide.secondaryAction.href} className={`button button--${currentSlide.secondaryAction.variant ?? "ghost"}`}>
                {currentSlide.secondaryAction.label}
              </Link>
            ) : null}
          </div>
        </div>

        {currentSlide.imageUrl ? (
          <div className="hero-slider__media">
            <img
              src={currentSlide.imageUrl}
              alt={currentSlide.imageAlt ?? currentSlide.title}
              width={1200}
              height={900}
              loading="eager"
            />
          </div>
        ) : null}
      </div>

      <div className="hero-slider__controls" aria-label="Controles de slider">
        <button
          type="button"
          className="button button--ghost"
          onClick={() => setActiveIndex((previous) => (previous - 1 + safeSlides.length) % safeSlides.length)}
        >
          Anterior
        </button>

        <div className="hero-slider__dots">
          {safeSlides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Ir a slide ${index + 1}`}
              className={`hero-slider__dot ${index === activeIndex ? "is-active" : ""}`}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>

        <button
          type="button"
          className="button button--ghost"
          onClick={() => setActiveIndex((previous) => (previous + 1) % safeSlides.length)}
        >
          Siguiente
        </button>
      </div>
    </section>
  );
}
