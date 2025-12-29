import { useEffect, useRef } from 'react';

export const useGameLoop = (callback) => {
  const requestRef = useRef();
  const previousTimeRef = useRef();
  const callbackRef = useRef(callback);

  // 每次渲染时更新回调引用，确保循环内能获取最新状态
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const animate = (time) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = time - previousTimeRef.current;
      // 调用最新的回调逻辑
      callbackRef.current(deltaTime);
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);
};

