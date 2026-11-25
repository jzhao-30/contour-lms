import * as React from "react";
import { cn } from "@/lib/utils";

// shadcn/ui Table primitives (semantic <table> markup, so screen readers work).
// The wrapper div makes wide tables scroll horizontally on small screens.

const Table = ({ className, ...props }: React.ComponentProps<"table">) => (
  <div className="relative w-full overflow-auto">
    <table className={cn("w-full text-sm", className)} {...props} />
  </div>
);

const TableHeader = (props: React.ComponentProps<"thead">) => (
  <thead {...props} className={cn("[&_tr]:border-b", props.className)} />
);

const TableBody = (props: React.ComponentProps<"tbody">) => (
  <tbody {...props} className={cn("[&_tr:last-child]:border-0", props.className)} />
);

const TableRow = (props: React.ComponentProps<"tr">) => (
  <tr {...props} className={cn("border-b hover:bg-muted/50", props.className)} />
);

const TableHead = (props: React.ComponentProps<"th">) => (
  <th
    {...props}
    className={cn(
      "h-10 px-3 text-left align-middle font-medium text-muted-foreground",
      props.className,
    )}
  />
);

const TableCell = (props: React.ComponentProps<"td">) => (
  <td {...props} className={cn("p-3 align-middle", props.className)} />
);

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
