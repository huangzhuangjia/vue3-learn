// 计算属性，延迟执行副作用回调，有值缓存特性
function computed(getter) {
  let value;
  let dirty = true; // 标志是否已获取值，避免重复计算，实现值缓存

  const effectFn = effect(getter, {
    lazy: true,
    scheduler() { // 依赖的响应式数据进行set操作时执行
      // 重设dirty为true，保证重新计算获取正确的值
      if (!dirty) {
        dirty = true;
        trigger(obj, 'value'); // 手动触发执行收集的副作用回调
      }
    }
  });

  const obj = {
    get value() {
      if (dirty) {
        value = effectFn();
        dirty = false;
      }
      // 计算属性读取值时，手动收集副作用，主要是因为副作用回调中读取计算属性值时，
      // 依赖的响应式此时收集的副作用是当前计算属性内部定义的effect，而不是外层正在读取计算属性的副作用
      // 因此这里需要手动track，在响应式数据set时，再手动trigger
      track(obj, 'value');
      return value;
    }
  };

  return obj; 
}