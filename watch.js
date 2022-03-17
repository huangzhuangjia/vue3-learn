function watch(source, cb, options) {
  let getter;
  if (typeof source === 'function') {
    getter = source();
  } else {
    getter = () => traverse(source);
  }
  let newValue, oldValue;
  let cleanup; // 存储过期函数
  function onInvalidate(fn) {
    cleanup = fn;
  }
  const job = () => {
    newValue = effectFn();
    if (cleanup) {
      cleanup();
    }
    cb(newValue, oldValue, onInvalidate);
    oldValue = newValue;
  }
  const effectFn = effect(
    () => getter(),
    {
      lazy: true,
      scheduler() {
        job();
      }
    }
  );
  if (options.immediate) {
    job();
  } else {
    oldValue = effectFn();
  }
}

function traverse(value, seen = new Set()) {
  if (typeof value !== 'object' || value === null || seen.has(value)) return;
  seen.add(value);

  for(const k in value) {
    traverse(value[k], seen);
  }

  return value;
}