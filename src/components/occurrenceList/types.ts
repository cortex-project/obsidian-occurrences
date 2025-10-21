export type GroupByOption = "none" | "day" | "month" | "year"

export interface GroupSelectorOptions {
  initialValue?: GroupByOption
  onChange?: (value: GroupByOption) => void
}

export interface OccurrenceListItemOptions {
  showDate?: boolean
  showTime?: boolean
}

export interface OccurrenceListOptions {
  listItemOptions?: OccurrenceListItemOptions
  groupBy?: "none" | "day" | "month" | "year"
}
