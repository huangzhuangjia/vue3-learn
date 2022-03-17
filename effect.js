


let activeEffect;

// effect执行栈，为解决嵌套effect，正确收集副作用
const effectStack = [];

const ITERATE_KEY = Symbol('');

let shouldTrack = true;

function hasOwn(target, key) {
  return Object.prototype.hasOwnProperty.call(target, key);
}

function pauseTracking() {
  shouldTrack = false;
}

function resetTracking() {
  shouldTrack = true;
}

function effect(fn, options) {
  const effectFn = () => {
    cleanup(effectFn);
    activeEffect = effectFn;
    // 当前effect入栈
    effectStack.push(effectFn);
    const res = fn();
    // 执行完弹出
    effectStack.pop();
    // 修改为上一个副作用
    activeEffect = effectStack[effectStack.length - 1];
    return res;
  }
  effectFn.options = options || {};
  effectFn.deps = [];

  // 延迟执行副作用
  if (!options?.lazy) {
    effectFn();
  }
  return effectFn;
}

// 执行副作用回调之前先清楚之前收集的副作用，避免之前不必要的副作用依然残留着
function cleanup(effectFn) {
  for (let i = 0; i < effectFn.deps.length; i++) {
    const deps = effectFn.deps[i];
    deps.delete(effectFn);
  }

  effectFn.deps.length = 0;
}

const targetMap = new WeakMap();

// 收集依赖
function track(target, key) {
  if (!activeEffect || !shouldTrack) return;

  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }
  let deps = depsMap.get(key);
  if (!deps) {
    depsMap.set(key, (deps = new Set()));
  }
  deps.add(activeEffect);
}

// 触发依赖
function trigger(target, key, type, newVal) {
  let depsMap = targetMap.get(target);
  if (!depsMap) return;

  const deps = [];

  // 数组中修改length属性，只有索引值大于等于length属性值时才需要触发响应
  if (Array.isArray(target) && key === 'length') {
    depsMap.forEach((dep, key) => {
      if (key >= newVal || key === 'length') {
        deps.push(dep);
      }
    });
  } else {
    deps.push(depsMap.get(key));
  }

  // 数组中，当设置索引值改变了数组长度length，需触发length属性收集的副作用
  if (type === 'ADD' && Array.isArray(target)) {
    deps.push(depsMap.get('length'));
  }

  if (type === 'ADD' || type === 'DELETE') {
    deps.push(depsMap.get(ITERATE_KEY));
  }

  const effects = []
  for (const dep of deps) {
    if (dep) {
      effects.push(...dep)
    }
  }

  // 这里需要过滤掉当前trigger的activeEffect，避免死循环，因为读取操作都是在同个effect下，如果赋值跟读取同时，可能一直自调用造成死循环
  triggerEffects(new Set(effects));
}

function triggerEffects(dep) {
  // 遍历执行副作用回调
  for(const effect of Array.isArray(dep) ? dep : [...dep]) {
    if (effect !== activeEffect) {
      if (effect.options.scheduler) {
        effect.options.scheduler(effect);
      } else {
        effect();
      }
    }
  }
}