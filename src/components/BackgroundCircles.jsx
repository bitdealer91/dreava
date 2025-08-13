// src/components/BackgroundCircles.jsx
import leftCircle from '../assets/blurry circle on the left.svg';
import rightCircle from '../assets/blurry circle on the right.svg';

const BackgroundCircles = () => (
  <>
    <img
      src={leftCircle}
      alt=""
      className="fixed top-[-400px] left-0 w-[800px] translate-x-[-50%] translate-y-[50%] pointer-events-none select-none z-0"
    />
    <img
      src={rightCircle}
      alt=""
      className="fixed top-[-80px] right-0 w-[800px] translate-x-[50%] pointer-events-none select-none z-0"
    />
  </>
);

export default BackgroundCircles;
