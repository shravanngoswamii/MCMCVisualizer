export function transform(
  real: number[] | Float64Array,
  imag: number[] | Float64Array,
): void {
  const n = real.length;
  if (n !== imag.length) throw new RangeError('Mismatched lengths');
  if (n === 0) return;
  if ((n & (n - 1)) === 0) transformRadix2(real, imag);
  else transformBluestein(real, imag);
}

export function inverseTransform(
  real: number[] | Float64Array,
  imag: number[] | Float64Array,
): void {
  transform(imag, real);
}

function transformRadix2(
  real: number[] | Float64Array,
  imag: number[] | Float64Array,
): void {
  const n = real.length;
  if (n === 1) return;

  let levels = -1;
  for (let i = 0; i < 32; i++) {
    if (1 << i === n) levels = i;
  }
  if (levels === -1) throw new RangeError('Length is not a power of 2');

  const cosTable = new Array<number>(n / 2);
  const sinTable = new Array<number>(n / 2);
  for (let i = 0; i < n / 2; i++) {
    cosTable[i] = Math.cos((2 * Math.PI * i) / n);
    sinTable[i] = Math.sin((2 * Math.PI * i) / n);
  }

  for (let i = 0; i < n; i++) {
    const j = reverseBits(i, levels);
    if (j > i) {
      let temp = real[i]!;
      real[i] = real[j]!;
      real[j] = temp;
      temp = imag[i]!;
      imag[i] = imag[j]!;
      imag[j] = temp;
    }
  }

  for (let size = 2; size <= n; size *= 2) {
    const halfsize = size / 2;
    const tablestep = n / size;
    for (let i = 0; i < n; i += size) {
      for (let j = i, k = 0; j < i + halfsize; j++, k += tablestep) {
        const l = j + halfsize;
        const tpre = real[l]! * cosTable[k]! + imag[l]! * sinTable[k]!;
        const tpim = -real[l]! * sinTable[k]! + imag[l]! * cosTable[k]!;
        real[l] = real[j]! - tpre;
        imag[l] = imag[j]! - tpim;
        real[j] = real[j]! + tpre;
        imag[j] = imag[j]! + tpim;
      }
    }
  }
}

function reverseBits(val: number, width: number): number {
  let result = 0;
  for (let i = 0; i < width; i++) {
    result = (result << 1) | (val & 1);
    val >>>= 1;
  }
  return result;
}

function transformBluestein(
  real: number[] | Float64Array,
  imag: number[] | Float64Array,
): void {
  const n = real.length;
  let m = 1;
  while (m < n * 2 + 1) m *= 2;

  const cosTable = new Array<number>(n);
  const sinTable = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const j = (i * i) % (n * 2);
    cosTable[i] = Math.cos((Math.PI * j) / n);
    sinTable[i] = Math.sin((Math.PI * j) / n);
  }

  const areal = zeros(m);
  const aimag = zeros(m);
  for (let i = 0; i < n; i++) {
    areal[i] = real[i]! * cosTable[i]! + imag[i]! * sinTable[i]!;
    aimag[i] = -real[i]! * sinTable[i]! + imag[i]! * cosTable[i]!;
  }

  const breal = zeros(m);
  const bimag = zeros(m);
  breal[0] = cosTable[0]!;
  bimag[0] = sinTable[0]!;
  for (let i = 1; i < n; i++) {
    breal[i] = breal[m - i] = cosTable[i]!;
    bimag[i] = bimag[m - i] = sinTable[i]!;
  }

  const creal = new Array<number>(m);
  const cimag = new Array<number>(m);
  convolveComplex(areal, aimag, breal, bimag, creal, cimag);

  for (let i = 0; i < n; i++) {
    real[i] = creal[i]! * cosTable[i]! + cimag[i]! * sinTable[i]!;
    imag[i] = -creal[i]! * sinTable[i]! + cimag[i]! * cosTable[i]!;
  }
}

function convolveComplex(
  xreal: number[],
  ximag: number[],
  yreal: number[],
  yimag: number[],
  outreal: number[],
  outimag: number[],
): void {
  const n = xreal.length;
  xreal = xreal.slice();
  ximag = ximag.slice();
  yreal = yreal.slice();
  yimag = yimag.slice();

  transform(xreal, ximag);
  transform(yreal, yimag);

  for (let i = 0; i < n; i++) {
    const temp = xreal[i]! * yreal[i]! - ximag[i]! * yimag[i]!;
    ximag[i] = ximag[i]! * yreal[i]! + xreal[i]! * yimag[i]!;
    xreal[i] = temp;
  }
  inverseTransform(xreal, ximag);

  for (let i = 0; i < n; i++) {
    outreal[i] = xreal[i]! / n;
    outimag[i] = ximag[i]! / n;
  }
}

function zeros(n: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < n; i++) result.push(0);
  return result;
}
