/** Resume upload helpers: accepted formats, size limit and display formatting. */

/** Inclusive limit: exactly 10 MB (10,485,760 bytes) is accepted. */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx"] as const;

const MIME_BY_EXTENSION: Record<string, string[]> = {
  pdf: ["application/pdf"],
  doc: ["application/msword"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
  ],
};

export function getExtension(fileName: string): string {
  const index = fileName.lastIndexOf(".");
  if (index <= 0) return "";
  return fileName.slice(index + 1).toLowerCase();
}

/** Short human label used under the file name ("PDF", "DOC", ...). */
export function getFileKind(fileName: string): string {
  const extension = getExtension(fileName);
  return extension ? extension.toUpperCase() : "FILE";
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const power = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** power;
  const digits = power === 0 || value >= 100 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[power]}`;
}

/** Returns an error message, or null when the file can be accepted. */
export function validateResumeFile(file: File): string | null {
  const extension = getExtension(file.name);
  const allowedMime = MIME_BY_EXTENSION[extension];

  const typeIsValid =
    Boolean(allowedMime) &&
    (file.type === "" || allowedMime.includes(file.type));

  if (!typeIsValid) {
    return "This file type is not supported. Please upload a PDF, DOC or DOCX file.";
  }

  if (file.size > MAX_FILE_SIZE) {
    // Include the exact bytes: 10 MB + 1 B formats as "10.0 MB", which would
    // otherwise read like the accepted limit.
    return `This file is ${formatFileSize(file.size)} (${file.size.toLocaleString(
      "en-US",
    )} bytes). The maximum size is 10 MB (${MAX_FILE_SIZE.toLocaleString(
      "en-US",
    )} bytes).`;
  }

  return null;
}
