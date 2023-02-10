export async function sequential<A, B>(arr: A[], fnc: (item: A) => Promise<B>): Promise<B[]> {
  const acc = [];
  for(const item of arr) {
    acc.push(await fnc(item));
  }
  return acc;
};
