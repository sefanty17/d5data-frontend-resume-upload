import { Button } from "./Button";
import { Dropzone } from "./Dropzone";
import { Stepper } from "./Stepper";
import "./UploadCard.css";

type UploadCardProps = {
  file: File | null;
  error: string | null;
  onSelect: (file: File | null) => void;
};

/**
 * 943 x 922 white card: title, drop area, the two step buttons and the
 * progress indicator.
 */
export function UploadCard({ file, error, onSelect }: UploadCardProps) {
  return (
    <section className="card" aria-labelledby="upload-card-title">
      <h2 className="card__title" id="upload-card-title">
        Upload file
      </h2>

      <Dropzone
        className="card__dropzone"
        file={file}
        error={error}
        onSelect={onSelect}
      />

      <div className="card__actions">
        <Button variant="secondary">Last step</Button>
        <Button variant="primary">Finish</Button>
      </div>

      <div className="card__stepper">
        <Stepper />
      </div>
    </section>
  );
}
