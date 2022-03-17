const component = {
  tag: 'div',
  props: {
    onClick: () => {
      alert('click me');
    }
  },
  children: 'click me'
};

const myComponent  = function() {
  return component;
}

const vnode = {
  tag: myComponent
}

// 渲染器
function renderer(vnode, container) {
  if (typeof vnode.tag === 'string') {
    mountElement(vnode, container);
  } else if (typeof vnode.tag === 'function') {
    mountComponent(vnode, container);
  }
}

// 挂载渲染标签
function mountElement(vnode, container) {
  const el = document.createElement(vnode.tag);

  for(const key in vnode.props) {
    if (/^on/.test(key)) {
      el.addEventListener(
        key.substr(2).toLowerCase(),
        vnode.props[key]
      )
    }
  }

  if (typeof vnode.children === 'string') {
    el.appendChild(document.createTextNode(vnode.children))
  } else if (Array.isArray(vnode.children)) {
    vnode.children.forEach((child) => {
      renderer(child, el)
    });
  }

  container.appendChild(el);
}
// 渲染组件
function mountComponent(vnode, container) {
  const subtree = vnode.tag();

  renderer(subtree, container);
}
