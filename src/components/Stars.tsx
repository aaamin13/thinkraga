export function Stars({ count, className = "" }: { count: number; className?: string }) {
  return (
    <span className={className} role="img" aria-label={`${count} of 3 stars`}>
      {[1, 2, 3].map((n) => (
        <span key={n} className={n <= count ? "text-saffron" : "text-white/20"}>
          ★
        </span>
      ))}
    </span>
  );
}
