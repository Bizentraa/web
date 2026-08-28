import { Skeleton } from "@bizentra/design-system";

/**
 * The loading shapes of the till.
 *
 * Each one is the real thing with its text removed: the same grid, the same row height, the same
 * number of items. A cashier watching a terminal wake up sees the layout it is about to get
 * rather than a spinner followed by a jump, and nothing moves when the data lands.
 */

export function CatalogSkeleton({ tiles = 12 }: { tiles?: number }) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading the catalogue"
      className="ui-pos-results"
      role="status"
    >
      {Array.from({ length: tiles }).map((_, index) => (
        <div className="ui-pos-skeleton-tile" key={index}>
          <Skeleton style={{ width: index % 3 === 0 ? "62%" : "84%" }} />
          <Skeleton style={{ height: 10, width: "46%" }} />
          <Skeleton style={{ height: 16, marginTop: "auto", width: "52%" }} />
        </div>
      ))}
    </div>
  );
}

export function SaleListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading sales" className="ui-pos-list" role="status">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="ui-pos-skeleton-row" key={index}>
          <Skeleton style={{ width: "44%" }} />
          <Skeleton style={{ height: 14, width: 68 }} />
          <Skeleton style={{ height: 10, width: "70%" }} />
        </div>
      ))}
    </div>
  );
}

export function ReturnDetailSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading the sale" className="ui-pos-lines" role="status">
      {Array.from({ length: lines }).map((_, index) => (
        <div className="ui-pos-skeleton-line" key={index}>
          <Skeleton style={{ width: "52%" }} />
          <Skeleton style={{ height: 14, width: 72 }} />
          <Skeleton style={{ height: 32, width: 106 }} />
          <Skeleton style={{ height: 10, width: "40%" }} />
        </div>
      ))}
    </div>
  );
}

/** The whole selling surface, for the moment before the terminal knows whether a shift is open. */
export function SellScreenSkeleton() {
  return (
    <div aria-busy="true" aria-label="Opening the till" className="ui-pos-layout" role="status">
      <section className="ui-pos-panel">
        <div className="ui-pos-scan">
          <Skeleton className="ui-pos-skeleton-field" />
          <Skeleton style={{ borderRadius: 8, height: 34, width: 84 }} />
        </div>
        <div className="ui-pos-chips">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton
              key={index}
              style={{ borderRadius: 999, flex: "none", height: 32, width: 84 + index * 14 }}
            />
          ))}
        </div>
        <CatalogSkeleton tiles={10} />
      </section>

      <section className="ui-pos-panel">
        <Skeleton style={{ height: 18, width: 96 }} />
        <Skeleton style={{ borderRadius: 12, height: 44 }} />
        <div className="ui-pos-lines">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} style={{ borderRadius: 14, height: 62 }} />
          ))}
        </div>
        <Skeleton style={{ borderRadius: 16, height: 62, marginTop: "auto" }} />
        <Skeleton style={{ borderRadius: 8, height: 52 }} />
      </section>
    </div>
  );
}
