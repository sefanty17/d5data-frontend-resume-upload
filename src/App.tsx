import { useCallback, useState } from "react";
import { Hero } from "./components/Hero";
import { UploadCard } from "./components/UploadCard";
import { validateResumeFile } from "./lib/file";
import "./App.css";

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = useCallback((next: File | null) => {
    if (!next) {
      setFile(null);
      setError(null);
      return;
    }

    const message = validateResumeFile(next);
    if (message) {
      setError(message);
      return;
    }

    setError(null);
    setFile(next);
  }, []);

  return (
    <main className="page">
      <div className="page__inner">
        <Hero />
        <UploadCard file={file} error={error} onSelect={handleSelect} />
      </div>
    </main>
  );
}
