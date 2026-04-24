export interface EditorFileRef {
  branch: string;
  relativePath: string;
}

export interface EditorFileOption extends EditorFileRef {
  isLocalOnly?: boolean;
}

const REMOTE_PREFIX = "origin/";

export function normalizeBranchName(branch?: string | null) {
  const value = (branch ?? "").trim();
  return value.startsWith(REMOTE_PREFIX)
    ? value.slice(REMOTE_PREFIX.length)
    : value;
}

export function normalizeRelativePath(path: string) {
  return path
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean)
    .join("/");
}

export function isValidRelativePath(path: string) {
  const normalizedPath = normalizeRelativePath(path);
  if (!normalizedPath) {
    return false;
  }

  return normalizedPath.split("/").every((segment) => segment !== "." && segment !== "..");
}

export function isModelFilePath(path: string) {
  if (!isValidRelativePath(path)) {
    return false;
  }

  const fileName = normalizeRelativePath(path).split("/").at(-1) ?? "";
  const parts = fileName.split(".").filter(Boolean);
  return parts.length >= 3 && parts.at(-2)?.toLowerCase() === "fc";
}

export function normalizeEditorFileRef(file?: {
  branch?: string | null;
  relativePath?: string | null;
}): EditorFileRef | null {
  const branch = normalizeBranchName(file?.branch);
  const relativePath = normalizeRelativePath(file?.relativePath ?? "");
  if (!branch || !relativePath) {
    return null;
  }

  return { branch, relativePath };
}

export function toFileKey(file: EditorFileRef) {
  return `${normalizeBranchName(file.branch)}::${normalizeRelativePath(file.relativePath)}`;
}

export function compareFileRefs(left: EditorFileRef, right: EditorFileRef) {
  return left.relativePath.localeCompare(right.relativePath, undefined, {
    sensitivity: "accent",
  });
}
