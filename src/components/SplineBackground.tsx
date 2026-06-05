'use client';

import Spline from '@splinetool/react-spline';

export default function SplineBackground() {
  return (
    <div className="absolute inset-0 w-full h-full z-0 opacity-40 pointer-events-none overflow-hidden flex items-center justify-center">
      <Spline scene="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode" />
    </div>
  );
}
