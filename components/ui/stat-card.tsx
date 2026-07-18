import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
}: StatCardProps) {
  return (
    <Card className="transition-all hover:shadow-lg hover:-translate-y-1">
      <CardContent className="p-6">
        <p className="text-sm text-muted-foreground">
          {title}
        </p>

        <h3 className="mt-3 text-3xl font-bold">
          {value}
        </h3>

        {subtitle && (
          <p className="mt-2 text-sm text-muted-foreground">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}