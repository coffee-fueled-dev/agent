import React from "react";
import { cn } from "@/lib/utils";
import { Empty } from "../ui/empty";
import { Spinner } from "../ui/spinner";

type MapFn<TList extends Array<object>, TContext extends object> = (
  item: TList[number],
  index: number,
  context?: TContext,
) => React.ReactNode;

interface ListSectionProps<TList extends Array<object>, TContext extends object>
  extends Omit<React.ComponentProps<"div">, "children"> {
  context?: TContext;
  list: TList;
  loading?: boolean;
  children:
    | MapFn<TList, TContext>
    | (React.ReactNode | MapFn<TList, TContext>)[];
}

const ListSectionContext = React.createContext<{
  values: Array<object> | null;
  loading: boolean;
} | null>(null);

export function ListSection<
  TList extends Array<object>,
  TContext extends object,
>({
  context,
  list,
  loading = false,
  children,
  className,
  ...props
}: ListSectionProps<TList, TContext>) {
  const contextValue = { values: list, loading };

  let before: React.ReactNode[] = [];
  let mapFn: MapFn<TList, TContext> | null = null;
  let after: React.ReactNode[] = [];

  if (typeof children === "function") {
    mapFn = children;
  } else {
    const rawChildren = Array.isArray(children) ? children : [children];
    const arr: (React.ReactNode | MapFn<TList, TContext>)[] = [];
    for (const [rawIndex, child] of rawChildren.entries()) {
      if (typeof child === "function") {
        arr.push(child);
        continue;
      }
      React.Children.forEach(
        child as React.ReactNode,
        (nestedChild, childIndex) => {
          if (React.isValidElement(nestedChild)) {
            arr.push(
              React.cloneElement(nestedChild, {
                key: `list-section-${rawIndex}-${String(nestedChild.key ?? childIndex)}`,
              }),
            );
            return;
          }

          if (
            nestedChild !== null &&
            nestedChild !== undefined &&
            nestedChild !== false
          ) {
            arr.push(nestedChild);
          }
        },
      );
    }
    const fnIndex = arr.findIndex((c) => typeof c === "function");
    if (fnIndex >= 0) {
      mapFn = arr[fnIndex] as MapFn<TList, TContext>;
      before = arr.slice(0, fnIndex) as React.ReactNode[];
      after = arr.slice(fnIndex + 1) as React.ReactNode[];
    } else {
      before = arr as React.ReactNode[];
    }
  }

  const listContent = mapFn
    ? list.map((item, index) => mapFn?.(item, index, context))
    : [];

  return (
    <div className={cn("flex flex-col gap-3", className)} {...props}>
      <ListSectionContext.Provider value={contextValue}>
        {before}
        {listContent}
        {after}
      </ListSectionContext.Provider>
    </div>
  );
}

ListSection.Empty = function ListSectionEmpty({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  const ctx = React.useContext(ListSectionContext);
  if (!ctx) throw new Error("ListSectionEmpty must be used inside ListSection");

  const { values, loading } = ctx;
  if (loading) return null;
  if ((values ?? []).length > 0) return null;

  return (
    <Empty className={cn("border border-dashed", className)} {...props}>
      {children}
    </Empty>
  );
};

ListSection.Loading = function ListSectionLoading({
  ...props
}: Omit<React.ComponentProps<"div">, "children">) {
  const ctx = React.useContext(ListSectionContext);
  if (!ctx)
    throw new Error("ListSectionLoading must be used inside ListSection");

  const { loading } = ctx;
  if (!loading) return null;

  return (
    <Empty {...props}>
      <Spinner />
    </Empty>
  );
};
