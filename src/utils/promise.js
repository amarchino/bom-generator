// @ts-check
exports.sequential = async (arr, fnc) => {
  const acc = [];
  for(const item of arr) {
    acc.push(await fnc(item));
  }
  return acc;
};
