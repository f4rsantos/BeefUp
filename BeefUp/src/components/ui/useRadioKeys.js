import { useRef } from "react";

const STEP= { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

export function useRadioKeys(count, index, select) {
  const refs= useRef([]);

  function onKeyDown(e) {
    let next= null;
    if (e.key in STEP) next= (index + STEP[e.key] + count) % count;
    else if (e.key === "Home") next= 0;
    else if (e.key === "End") next= count - 1;
    if (next === null || count === 0) return;
    e.preventDefault();
    select(next);
    refs.current[next]?.focus();
  }

  function itemProps(i) {
    return {
      ref: (el) => { refs.current[i]= el; },
      tabIndex: i === index ? 0 : -1,
    };
  }

  return { onKeyDown, itemProps };
}
