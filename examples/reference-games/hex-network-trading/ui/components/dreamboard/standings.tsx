import {
  Table,
  TableCaption,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import "./tokens.css";
import type { ComponentProps, ReactNode } from "react";
export type StandingDisplay = {
  id: string;
  rank: number;
  name: string;
  score: ReactNode;
};
export type StandingsProps = ComponentProps<"table"> & {
  standings: readonly StandingDisplay[];
  caption: string;
  scoreLabel?: string;
};
/** Preserve the supplied order and rank, including ties; never infer a winner. */
export function Standings({
  standings,
  caption,
  scoreLabel = "Score",
  className = "",
  ...props
}: StandingsProps) {
  return (
    <Table {...props} className={`db-standings tabular-nums ${className}`}>
      <TableCaption className="mb-3 mt-0 caption-top text-start font-bold text-foreground">
        {caption}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Rank</TableHead>
          <TableHead scope="col">Player</TableHead>
          <TableHead scope="col" className="text-end">
            {scoreLabel}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {standings.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{row.rank}</TableCell>
            <TableHead scope="row">{row.name}</TableHead>
            <TableCell className="text-end">{row.score}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
