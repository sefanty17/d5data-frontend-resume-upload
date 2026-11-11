import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, PointerEvent } from "react";
import cloudIcon from "../assets/icon-upload-cloud.svg";
import checkIcon from "../assets/icon-check.svg";
import { formatFileSize, getFileKind } from "../lib/file";
import "./Dropzone.css";

const HINT =
  "Drag your resume file to this area, or click on the area to select the appropriate file to upload";

type DropzoneProps = {
  file: File | null;
  error: string | null;
  onSelect: (file: File | null) => void;
  className?: string;
};

/**
 * 685 x 420 dashed drop area.
 *
 * The whole surface is a native <button> ("hit area") so that mouse, touch
 * and keyboard all open the file picker; a visually hidden <input type="file">
 * is the actual picker. Drag events are handled on the wrapper so dropping a
 * file anywhere inside the dashed area works.
 */
export function Dropzone({ file, error, onSelect, className }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  // dragenter/dragleave counting can get stuck when the pointer leaves the
  // window, the drop lands outside the zone or the OS cancels the drag.
  useEffect(() => {
    const resetDrag = () => {
      dragDepth.current = 0;
      setIsDragging(false);
    };

    window.addEventListener("dragend", resetDrag);
    window.addEventListener("drop", resetDrag);
    return () => {
      window.removeEventListener("dragend", resetDrag);
      window.removeEventListener("drop", resetDrag);
    };
  }, []);

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const next = event.target.files?.[0] ?? null;
      if (next) onSelect(next);
      // Allow picking the same file again after a removal.
      event.target.value = "";
    },
    [onSelect],
  );

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current += 1;
    setIsDragging(true);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = 0;
    setIsDragging(false);
    setIsPressed(false);

    const next = event.dataTransfer.files?.[0] ?? null;
    if (next) onSelect(next);
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button === 0) setIsPressed(true);
  };

  const resetPressed = () => setIsPressed(false);

  const hitAreaLabel = file
    ? `Replace ${file.name}. Drag and drop another file here or press Enter to browse.`
    : "Upload your resume. Drag and drop a file here or press Enter to browse your files.";

  const classes = ["dropzone", className].filter(Boolean).join(" ");

  return (
    <div
      className={classes}
      data-dragging={isDragging ? "true" : undefined}
      data-pressed={isPressed && !isDragging ? "true" : undefined}
      data-filled={file ? "true" : undefined}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPointerUp={resetPressed}
      onPointerCancel={resetPressed}
      onPointerLeave={resetPressed}
    >
      {/* Dashed 10/10 border: drawn as an SVG because CSS "dashed" borders
          cannot reproduce Figma's dash rhythm. */}
      <svg className="dropzone__border" aria-hidden="true" focusable="false">
        <rect className="dropzone__border-path" />
      </svg>

      <input
        ref={inputRef}
        className="dropzone__input"
        type="file"
        accept=".pdf,.doc,.docx"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleChange}
      />

      <button
        type="button"
        className="dropzone__hit"
        aria-label={hitAreaLabel}
        onClick={openPicker}
        onPointerDown={handlePointerDown}
      />

      <div
        className={`dropzone__content${file ? " dropzone__content--filled" : ""}`}
      >
        {file ? (
          <>
            <span className="dropzone__badge">
              <img src={checkIcon} width={22} height={16} alt="" />
            </span>
            <p className="dropzone__filename" title={file.name}>
              {file.name}
            </p>
            <p className="dropzone__meta">
              {getFileKind(file.name)} · {formatFileSize(file.size)}
            </p>
            <div className="dropzone__actions">
              <button
                type="button"
                className="dropzone__action"
                onClick={openPicker}
              >
                Replace file
              </button>
              <span className="dropzone__action-sep" aria-hidden="true" />
              <button
                type="button"
                className="dropzone__action"
                onClick={() => onSelect(null)}
              >
                Remove
              </button>
            </div>
          </>
        ) : (
          <>
            <img
              className="dropzone__icon"
              src={cloudIcon}
              width={58}
              height={39}
              alt=""
            />
            <p className="dropzone__hint" aria-hidden="true">
              {HINT}
            </p>
          </>
        )}

        {/* Rendered outside the file/empty branch, so a rejected replacement
            is always announced instead of silently keeping the old file. */}
        {error ? (
          <p className="dropzone__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {error ?? (file ? `${file.name} selected, ${formatFileSize(file.size)}.` : "")}
      </p>
    </div>
  );
}
