import type { Data, Element as HastElement } from "hast";

export interface TagNode {
  type: "tagNode";
  value: string;
  data: TagNodeData;
}

export interface MentionNode {
  type: "mentionNode";
  value: string;
  data: MentionNodeData;
}

export interface DueDateNode {
  type: "dueDateNode";
  value: string;
  data: DueDateNodeData;
}

export interface TagNodeData {
  hName: "span";
  hProperties: TagNodeProperties;
  hChildren: Array<{ type: "text"; value: string }>;
}

export interface MentionNodeData {
  hName: "span";
  hProperties: MentionNodeProperties;
  hChildren: Array<{ type: "text"; value: string }>;
}

export interface DueDateNodeData {
  hName: "span";
  hProperties: DueDateNodeProperties;
  hChildren: Array<{ type: "text"; value: string }>;
}

export interface TagNodeProperties {
  className: string;
  "data-tag": string;
}

export interface MentionNodeProperties {
  className: string;
  "data-mention": string;
}

export interface DueDateNodeProperties {
  className: string;
  "data-due-date": string;
  "data-has-time": "true" | "false";
}

export interface ExtendedData extends Data {
  mdastType?: string;
}

export function hasExtendedData(node: unknown): node is { data: ExtendedData } {
  return typeof node === "object" && node !== null && "data" in node && typeof (node as { data: unknown }).data === "object";
}

export function isTagElement(node: HastElement): boolean {
  if (hasExtendedData(node) && node.data.mdastType === "tagNode") {
    return true;
  }

  const dataTag = node.properties?.["data-tag"];
  if (typeof dataTag === "string" && dataTag !== "") {
    return true;
  }

  const className = node.properties?.className;
  if (Array.isArray(className) && className.includes("tag")) {
    return true;
  }
  if (typeof className === "string" && className.split(/\s+/).includes("tag")) {
    return true;
  }

  return false;
}

export function isMentionElement(node: HastElement): boolean {
  if (hasExtendedData(node) && node.data.mdastType === "mentionNode") {
    return true;
  }

  const dataMention = node.properties?.["data-mention"];
  if (typeof dataMention === "string" && dataMention !== "") {
    return true;
  }

  const className = node.properties?.className;
  if (Array.isArray(className) && className.includes("mention")) {
    return true;
  }
  if (typeof className === "string" && className.split(/\s+/).includes("mention")) {
    return true;
  }

  return false;
}

export function isDueDateElement(node: HastElement): boolean {
  if (hasExtendedData(node) && node.data.mdastType === "dueDateNode") {
    return true;
  }

  const dataDueDate = node.properties?.["data-due-date"];
  if (typeof dataDueDate === "string" && dataDueDate !== "") {
    return true;
  }

  const className = node.properties?.className;
  if (Array.isArray(className) && className.includes("due-date")) {
    return true;
  }
  if (typeof className === "string" && className.split(/\s+/).includes("due-date")) {
    return true;
  }

  return false;
}

export function isTaskListItemElement(node: HastElement): boolean {
  const type = node.properties?.type;
  return typeof type === "string" && type === "checkbox";
}
