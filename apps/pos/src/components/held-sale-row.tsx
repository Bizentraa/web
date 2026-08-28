import type { SaleListRow } from "@bizentra/contracts";
import { Button, formatDateTime, formatMoney } from "@bizentra/design-system";

/**
 * One ticket that is still open, with the only two ways it can end.
 *
 * The same row serves the held-carts dialog and the close-shift drawer, because they are the same
 * question asked at different moments: this ticket is unfinished, do you want to go back to it or
 * let it go. It replaced a whole-row button in the dialog, which had nowhere to put a second
 * action without nesting one button inside another.
 */
export function HeldSaleRow({
  busy,
  onDiscard,
  onResume,
  sale,
}: {
  busy: boolean;
  onDiscard: (sale: SaleListRow) => void;
  onResume: (saleId: string) => void;
  sale: SaleListRow;
}) {
  return (
    <div className="ui-pos-blocker-row">
      <strong>{sale.receiptNumber ?? sale.number}</strong>
      <strong className="ui-money">{formatMoney(sale.total)}</strong>
      <small>
        {sale.customerName ?? "Walk-in"} · {sale.lineCount}{" "}
        {sale.lineCount === 1 ? "line" : "lines"} · {formatDateTime(sale.createdAt)}
      </small>
      <div className="ui-pos-blocker-actions">
        <Button disabled={busy} onClick={() => onResume(sale.id)} variant="secondary">
          Resume
        </Button>
        <Button disabled={busy} onClick={() => onDiscard(sale)} variant="ghost">
          Discard
        </Button>
      </div>
    </div>
  );
}
