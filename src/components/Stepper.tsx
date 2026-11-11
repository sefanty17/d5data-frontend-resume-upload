import checkIcon from "../assets/icon-check.svg";
import "./Stepper.css";

type StepState = "done" | "current" | "upcoming";

type Step = {
  id: number;
  state: StepState;
};

/** Matches the frame: step 1 and 2 are completed, step 3 is the current one. */
const STEPS: Step[] = [
  { id: 1, state: "done" },
  { id: 2, state: "done" },
  { id: 3, state: "current" },
];

const STATE_LABEL: Record<StepState, string> = {
  done: "completed",
  current: "current step",
  upcoming: "upcoming",
};

/** 343 x 4 progress bar with three 32px dots (Figma: "Bar", "Oval"). */
export function Stepper() {
  return (
    <ol className="stepper" aria-label="Upload progress">
      {STEPS.map((step) => (
        <li
          key={step.id}
          className={`stepper__item stepper__item--${step.id}`}
          data-state={step.state}
        >
          {step.state === "done" ? (
            <img
              className="stepper__check"
              src={checkIcon}
              width={10}
              height={7}
              alt=""
              aria-hidden="true"
            />
          ) : (
            <span className="stepper__number" aria-hidden="true">
              {step.id}
            </span>
          )}
          <span className="sr-only">
            Step {step.id} of {STEPS.length}: {STATE_LABEL[step.state]}
          </span>
        </li>
      ))}
    </ol>
  );
}
