import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { radius, shadow } from '../../tokens';

export interface ListTableColumn<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
}

/** @deprecated Usa ListTableColumn en su lugar */
export type Column<T> = ListTableColumn<T>;

interface ListTableProps<T> {
  data: T[];
  columns: ListTableColumn<T>[];
  keyExtractor: (item: T) => string | number;
  onRowClick?: (item: T) => void;
  emptyState?: React.ReactNode;
  className?: string;
}

export function ListTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  emptyState,
  className,
}: ListTableProps<T>) {
  if (!data || data.length === 0) {
    return emptyState ? (
      <>{emptyState}</>
    ) : (
      <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
        No hay elementos para mostrar
      </div>
    );
  }

  return (
    <div
      className={cn(
        'overflow-hidden border border-border/50 bg-card',
        radius.card,
        shadow.card,
        className
      )}
    >
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            {columns.map((col, index) => (
              <TableHead key={index} className={cn('h-10', col.className)}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map(item => (
            <TableRow
              key={keyExtractor(item)}
              onClick={() => onRowClick?.(item)}
              className={cn(
                onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''
              )}
            >
              {columns.map((col, index) => (
                <TableCell key={index} className={cn('py-3', col.className)}>
                  {col.cell
                    ? col.cell(item)
                    : col.accessorKey
                      ? (item[col.accessorKey] as React.ReactNode)
                      : null}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
