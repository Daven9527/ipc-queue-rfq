export type RfqArea = "system" | "mb";

export interface RfqRecord {
  rfqNo: string;
  workflowStatus?: string;
  assignee?: string;
  updatedAt?: string;
  [key: string]: string | undefined;
}

