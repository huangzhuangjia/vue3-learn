const RAW = 'raw';

const proxyMap = new Map();

const arrayInstrumentations = createArrayInstrumentations();
// 重写数组方法
function createArrayInstrumentations() {
  const instrumentations = {};

  (['includes', 'indexOf', 'lastIndexOf']).forEach(key => {
    const originMethod = Array.prototype[key];
    instrumentations[key] = function(...args) {
      let res = originMethod.apply(this, args);

      if (res === false) {
        res = originMethod.apply(this[RAW], args);
      }

      return res;
    }
  });

  // 这些方法会间接读取数据length属性，需屏蔽对length属性的读取，避免收集到依赖
  (['push', 'pop', 'shift', 'unshift', 'splice']).forEach(key => {
    const originMethod = Array.prototype[key];
    instrumentations[key] = function(...args) {
      pauseTracking();
      let res = originMethod.apply(this, args);
      resetTracking();
      return res;
    }
  });

  return instrumentations;
}
function createReactive(data, isShallow = false, isReadonly = false) {
  const existingProxy = proxyMap.get(data);
  if (existingProxy) {
    return existingProxy;
  }
  const proxy = new Proxy(data, {
    get(target, key, receiver) {
      // 读取raw属性时返回代理对象target
      if (key === RAW) {
        return target;
      }

      // 重写数组方法进行代理
      if (Array.isArray(target) && hasOwn(arrayInstrumentations, key)) {
        return Reflect.get(arrayInstrumentations, key, receiver);
      }

      if (!isReadonly) {
        track(target, key);
      }

      const res = Reflect.get(target, key, receiver);
      if (isShallow) {
        return res;
      }

      if (typeof res === 'object' && res !== null) {
        return isReadonly ? readonly(res) : reactive(res);
      }
      return res;
    },
    set(target, key, newVal, receiver) {
      if (isReadonly) return isReadonly;

      const oldVal = target[key];
      
      const hadKey =  Array.isArray(target) ? Number(key) < target.length : hasOwn(target, key)
      const type = hadKey ? 'SET' : 'ADD';
      const res = Reflect.set(target, key, newVal, receiver);

      // 先判断receiver是否为target的代理对象，避免不要的更新
      if (target === receiver[RAW]) {
        if (oldVal !== newVal && (oldVal === oldVal || newVal === newVal)) {
          trigger(target, key, type, newVal)
        }
      }
      return res;
    },
    has(target, key) {
      track(target, key);
      return Reflect.has(target, key);
    },
    deleteProperty(target, key) {
      if (isReadonly) return isReadonly;

      const hadKey = hasOwn(target, key);
      const res = Reflect.defineProperty(target, key);

      if (res && hadKey) {
        trigger(target, key, 'delete');
      }

      return res;
    }
  });
  proxyMap.set(data, proxy);
  return proxy;
}

function reactive(data) {
  return createReactive(data);
}

function shallowReactive(data) {
  return createReactive(data, true);
}

function readonly(data) {
  return createReactive(data, false, true);
}

function shallowReadonly(data) {
  return createReactive(data, true, true);
}