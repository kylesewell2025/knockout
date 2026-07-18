interface SectionHeaderProps {
  title: string;
}

export function SectionHeader({
  title,
}: SectionHeaderProps) {
  return (
    <h2 className="text-xl font-semibold tracking-tight">
      {title}
    </h2>
  );
}