let jobQueue = new Set();
let isFlushing = false;
const p = Promise.resolve();

function flushJob() {
  if (isFlushing) return;

  isFlushing = true;
  p.then(() => {
    jobQueue.forEach(job => job());
  }).finally(() => {
    isFlushing = false;
  });
}
