// Inline icons: no requests, inherit the text colour. Size and stroke come from the `.icon` class.
type IconProps = { className?: string };
const icon = (path: string, filled = false) =>
  function Icon({ className }: IconProps) {
    return (
      <svg
        className={`icon${filled ? " icon-filled" : ""}${className ? ` ${className}` : ""}`}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d={path} />
      </svg>
    );
  };

export const MenuIcon = icon("M4 6h16M4 12h16M4 18h10");
export const CloseIcon = icon("M6 6l12 12M18 6L6 18");
export const PlayIcon = icon("M8 5.5v13l10.5-6.5z", true);
export const PauseIcon = icon("M7 5h3.5v14H7zM13.5 5H17v14h-3.5z", true);
export const LoopIcon = icon("M7 7h9.5l-2-2M17 17H7.5l2 2M4 12a5 5 0 0 1 3-5M20 12a5 5 0 0 1-3 5");
/** A circular arrow round a dot: back to the starting view. */
export const ResetViewIcon = icon("M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v3.2h3.2M12 11.2v1.6");
export const StarIcon = icon(
  "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z",
);
/** A magnifying glass: search. */
export const SearchIcon = icon("M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM15.5 15.5L20 20");
export const GitHubIcon = icon(
  "M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1-.07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z",
  true,
);
/** An arrow curling back left: undo. */
export const UndoIcon = icon("M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11");
/** An arrow curling on right: redo. */
export const RedoIcon = icon("M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13");
/** An hourglass: let time run a moment. */
export const WaitIcon = icon("M7 4h10M7 20h10M8 4c0 4 8 4 8 8s-8 4-8 8M16 4c0 4-8 4-8 8s8 4 8 8");
/** A rewind-and-play arrow: replay from the start. */
export const ReplayIcon = icon("M4 12a8 8 0 1 0 2.3-5.6M4 4.5v4h4M10.5 9.2v5.6l4.5-2.8z");
/** An open hand: let go. */
export const LetGoIcon = icon(
  "M8 13V6.5a1.5 1.5 0 0 1 3 0V12M11 11.5V5a1.5 1.5 0 0 1 3 0v6.5M14 11.5V6.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-.5a6 6 0 0 1-5-2.7L3.8 14.5a1.5 1.5 0 0 1 2.4-1.8L8 15",
);
/** Two sheets: copy. */
export const CopyIcon = icon("M9 9h10v11H9zM6 15H5V4h10v1");
/** Six dots: something to drag. */
export const DragIcon = icon("M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01");
/** A chevron pointing up: fold away. */
export const ExpandIcon = icon("M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7");

export const FoldIcon = icon("M6 15l6-6 6 6");
/** An arrow leaving a tray: share. */
export const ShareIcon = icon("M12 15V4M8 8l4-4 4 4M5 13v6h14v-6");
export const CheckIcon = icon("M5 12.5l4.5 4.5L19 7");
/** An open eye: the controls are showing. */
export const EyeIcon = icon(
  "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
);
/** A struck-through eye: the controls are hidden. */
export const EyeOffIcon = icon(
  "M3 12s3.5-6.5 9-6.5c1.4 0 2.7.4 3.8 1M21 12s-3.5 6.5-9 6.5c-1.4 0-2.7-.4-3.8-1M4 4l16 16M10 10a2.5 2.5 0 0 0 3.5 3.5",
);
export const ChevronLeftIcon = icon("M15 5l-7 7 7 7");
export const ArrowRightIcon = icon("M5 12h14M13 6l6 6-6 6");
export const InfoIcon = icon("M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 11v5M12 8h.01");
export const ListIcon = icon("M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01");
export const WarningIcon = icon("M12 4L3 20h18zM12 10v4M12 17h.01");
