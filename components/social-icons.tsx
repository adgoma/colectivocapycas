export type SocialPlatform = "facebook" | "tiktok" | "youtube" | "telegram" | "website";

type SocialIconProps = {
  platform: SocialPlatform;
  className?: string;
};

export function SocialIcon({ platform, className }: SocialIconProps) {
  if (platform === "facebook") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path
          d="M13.2 21v-7.2h2.3l.4-2.8h-2.7V9.1c0-.8.2-1.3 1.4-1.3h1.5V5.2c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2H7.6v2.8h2.3V21h3.3z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (platform === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path
          d="M14.2 3.5h2.4c.2 1 .8 1.8 1.7 2.4.7.5 1.6.8 2.5.8v2.5c-1.4 0-2.7-.4-3.8-1.1v6.2c0 1.6-.6 3-1.7 4.1A5.78 5.78 0 0 1 11 20a5.9 5.9 0 0 1-4.2-1.7A5.65 5.65 0 0 1 5 14.1a5.8 5.8 0 0 1 5.8-5.8c.4 0 .8 0 1.2.1v2.6c-.4-.1-.8-.2-1.2-.2-1.8 0-3.2 1.5-3.2 3.3 0 .9.3 1.7.9 2.3.6.6 1.5.9 2.3.9 1.8 0 3.2-1.5 3.2-3.3V3.5h.2z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (platform === "youtube") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path
          d="M21.2 8.2c-.2-1-.9-1.8-1.9-2-1.7-.4-8.3-.4-8.3-.4s-6.6 0-8.3.4c-1 .2-1.8 1-1.9 2C.5 9.9.5 12 .5 12s0 2.1.3 3.8c.2 1 .9 1.8 1.9 2 1.7.4 8.3.4 8.3.4s6.6 0 8.3-.4c1-.2 1.8-1 1.9-2 .3-1.7.3-3.8.3-3.8s0-2.1-.3-3.8zM9.5 15.3V8.7L15.3 12l-5.8 3.3z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (platform === "telegram") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path
          d="m20.8 4.8-2.5 13.3c-.2.9-.8 1.1-1.6.7l-4.5-3.3-2.2 2.1c-.2.2-.4.4-.8.4l.3-4.6 8.4-7.6c.4-.3-.1-.5-.6-.2L7 12.2l-4.4-1.4c-.9-.3-.9-.9.2-1.3L19 3.2c.8-.3 1.6.2 1.8 1.6z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.7 9h-3.1a15.8 15.8 0 0 0-1.2-5.2A8.06 8.06 0 0 1 18.7 11zM12 4.1c.9 1.2 1.6 3.2 1.9 5.9h-3.8c.3-2.7 1-4.7 1.9-5.9zM4.3 13h3.1c.1 1.9.5 3.7 1.2 5.2A8.06 8.06 0 0 1 4.3 13zm3.1-2H4.3a8.06 8.06 0 0 1 4.3-5.2A15.8 15.8 0 0 0 7.4 11zm4.6 8.9c-.9-1.2-1.6-3.2-1.9-5.9h3.8c-.3 2.7-1 4.7-1.9 5.9zm2.2-7.9h-4.4a19.2 19.2 0 0 1 0-2h4.4a19.2 19.2 0 0 1 0 2zm.2 6.2c.7-1.5 1.1-3.3 1.2-5.2h3.1a8.06 8.06 0 0 1-4.3 5.2z"
        fill="currentColor"
      />
    </svg>
  );
}
