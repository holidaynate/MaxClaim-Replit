interface SkipLinkProps {
  targetId?: string;
  className?: string;
}

export function SkipLink({ targetId = "main-content", className = "" }: SkipLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={`skip-link ${className}`}
      data-testid="skip-to-content"
    >
      Skip to main content
    </a>
  );
}
