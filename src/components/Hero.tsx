import illustration from "../assets/illustration@2x.png";
import "./Hero.css";

/**
 * Left hand column of the page: headline, supporting copy and the
 * decorative illustration that is pinned to the bottom-left corner of
 * the 1920 x 1080 frame.
 */
export function Hero() {
  return (
    <>
      <img
        className="page__art"
        src={illustration}
        width={763}
        height={569}
        alt="Illustration of a cat sitting next to a phone full of chat bubbles."
        draggable={false}
      />

      <section className="hero" aria-labelledby="hero-title">
        <h1 className="hero__title" id="hero-title">
          Finish!
          <br />
          Upload Your Resume
        </h1>
        <p className="hero__lead">
          Upload your resume, the platform will help you parse and optimize, you
          can also skip this step
        </p>
      </section>
    </>
  );
}
