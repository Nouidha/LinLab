import { describe, it, expect } from 'vitest'
import {
  identity, multiply, translation,
  rotationX, rotationY, rotationZ,
  scale, shear, planeMatrix, poseMatrix, lineMatrix,
  det3, reflection,
} from './matrices.js'

// Apply a 4×4 column-major matrix to a point [x,y,z] (homogeneous w=1).
function applyMat(m, [x, y, z]) {
  return [
    m[0]*x + m[4]*y + m[8]*z  + m[12],
    m[1]*x + m[5]*y + m[9]*z  + m[13],
    m[2]*x + m[6]*y + m[10]*z + m[14],
  ]
}

// Apply only the rotation/scale block (no translation) to a vector.
function applyRot(m, [x, y, z]) {
  return [
    m[0]*x + m[4]*y + m[8]*z,
    m[1]*x + m[5]*y + m[9]*z,
    m[2]*x + m[6]*y + m[10]*z,
  ]
}

function near(a, b, eps = 1e-9) {
  return Math.abs(a - b) < eps
}

function matNear(a, b, eps = 1e-9) {
  return a.every((v, i) => near(v, b[i], eps))
}

// ── identity ─────────────────────────────────────────────────────────────────

describe('identity', () => {
  it('returns the 4×4 identity matrix', () => {
    const I = identity()
    expect(I).toHaveLength(16)
    // diagonal
    expect(I[0]).toBe(1);  expect(I[5]).toBe(1)
    expect(I[10]).toBe(1); expect(I[15]).toBe(1)
    // off-diagonal
    const offDiag = [1,2,3,4,6,7,8,9,11,12,13,14]
    offDiag.forEach(i => expect(I[i]).toBe(0))
  })

  it('leaves a point unchanged', () => {
    const p = applyMat(identity(), [3, -1, 7])
    expect(p).toEqual([3, -1, 7])
  })
})

// ── multiply ─────────────────────────────────────────────────────────────────

describe('multiply', () => {
  it('I * I = I', () => {
    expect(matNear(multiply(identity(), identity()), identity())).toBe(true)
  })

  it('A * I = A', () => {
    const A = rotationZ(37)
    expect(matNear(multiply(A, identity()), A)).toBe(true)
  })

  it('I * A = A', () => {
    const A = rotationX(55)
    expect(matNear(multiply(identity(), A), A)).toBe(true)
  })

  it('translations compose by addition', () => {
    const result = multiply(translation(1, 2, 3), translation(4, 5, 6))
    expect(matNear(result, translation(5, 7, 9))).toBe(true)
  })

  it('rotation composed with its inverse gives identity', () => {
    const R  = rotationY(60)
    const Rt = rotationY(-60)
    expect(matNear(multiply(R, Rt), identity(), 1e-10)).toBe(true)
  })

  it('scale then scale multiplies component-wise', () => {
    const result = multiply(scale(2, 3, 4), scale(5, 6, 7))
    expect(matNear(result, scale(10, 18, 28))).toBe(true)
  })
})

// ── translation ───────────────────────────────────────────────────────────────

describe('translation', () => {
  it('moves a point by the given offset', () => {
    const p = applyMat(translation(1, -2, 3, 1), [0, 0, 0])
    expect(p).toEqual([1, -2, 3])
  })

  it('applies the uniform scale correctly', () => {
    const p = applyMat(translation(1, -2, 3, -3), [0, 0, 0])
    expect(p).toEqual([-3, 6, -9])
  })

  it('does not affect the origin direction (rotation block = I)', () => {
    const T = translation(5, 5, 5)
    // Upper-left 3×3 should be identity
    expect(T[0]).toBe(1); expect(T[5]).toBe(1); expect(T[10]).toBe(1)
    expect(T[1]).toBe(0); expect(T[4]).toBe(0)
  })
})

// ── rotationX ────────────────────────────────────────────────────────────────

describe('rotationX', () => {
  it('0° is identity', () => {
    expect(matNear(rotationX(0), identity())).toBe(true)
  })

  it('90°: Y-axis maps to Z-axis', () => {
    const [x, y, z] = applyRot(rotationX(90), [0, 1, 0])
    expect(near(x, 0)).toBe(true)
    expect(near(y, 0)).toBe(true)
    expect(near(z, 1)).toBe(true)
  })

  it('90°: Z-axis maps to -Y-axis', () => {
    const [x, y, z] = applyRot(rotationX(90), [0, 0, 1])
    expect(near(x, 0)).toBe(true)
    expect(near(y, -1)).toBe(true)
    expect(near(z, 0)).toBe(true)
  })

  it('360° is identity', () => {
    expect(matNear(rotationX(360), identity(), 1e-10)).toBe(true)
  })
})

// ── rotationY ────────────────────────────────────────────────────────────────

describe('rotationY', () => {
  it('0° is identity', () => {
    expect(matNear(rotationY(0), identity())).toBe(true)
  })

  it('90°: Z-axis maps to X-axis', () => {
    const [x, y, z] = applyRot(rotationY(90), [0, 0, 1])
    expect(near(x, 1)).toBe(true)
    expect(near(y, 0)).toBe(true)
    expect(near(z, 0)).toBe(true)
  })

  it('90°: X-axis maps to -Z-axis', () => {
    const [x, y, z] = applyRot(rotationY(90), [1, 0, 0])
    expect(near(x, 0)).toBe(true)
    expect(near(y, 0)).toBe(true)
    expect(near(z, -1)).toBe(true)
  })
})

// ── rotationZ ────────────────────────────────────────────────────────────────

describe('rotationZ', () => {
  it('0° is identity', () => {
    expect(matNear(rotationZ(0), identity())).toBe(true)
  })

  it('90°: X-axis maps to Y-axis', () => {
    const [x, y, z] = applyRot(rotationZ(90), [1, 0, 0])
    expect(near(x, 0)).toBe(true)
    expect(near(y, 1)).toBe(true)
    expect(near(z, 0)).toBe(true)
  })

  it('90°: Y-axis maps to -X-axis', () => {
    const [x, y, z] = applyRot(rotationZ(90), [0, 1, 0])
    expect(near(x, -1)).toBe(true)
    expect(near(y, 0)).toBe(true)
    expect(near(z, 0)).toBe(true)
  })
})

// ── scale ─────────────────────────────────────────────────────────────────────

describe('scale', () => {
  it('scales each axis independently', () => {
    const [x, y, z] = applyMat(scale(2, 3, 4), [1, 1, 1])
    expect(x).toBeCloseTo(2)
    expect(y).toBeCloseTo(3)
    expect(z).toBeCloseTo(4)
  })

  it('uniform scale(1,1,1) = identity', () => {
    expect(matNear(scale(1, 1, 1), identity())).toBe(true)
  })

  it('scale(0,...) collapses an axis', () => {
    const [x, y, z] = applyMat(scale(0, 1, 1), [5, 3, 2])
    expect(x).toBe(0)
    expect(y).toBe(3)
    expect(z).toBe(2)
  })
})

// ── shear ─────────────────────────────────────────────────────────────────────

describe('shear', () => {
  it('shear(xy=1) moves X by the Y value', () => {
    // shear(xy, xz, yx, yz, zx, zy)
    // In the matrix: m[4]=yx, m[1]=xy → affects which component?
    // From the code: [1,xy,xz,0, yx,1,yz,0, zx,zy,1,0, 0,0,0,1]
    // col0=[1,xy,xz,0], col1=[yx,1,yz,0], col2=[zx,zy,1,0]
    // row0: [1, yx, zx, 0] → x' = x + yx*y + zx*z
    // row1: [xy, 1, zy, 0] → y' = xy*x + y + zy*z
    // row2: [xz, yz, 1, 0] → z' = xz*x + yz*y + z
    const S = shear(1, 0, 0, 0, 0, 0) // xy=1: y' = xy*x + y
    const [x, y, z] = applyMat(S, [3, 0, 0])
    expect(near(x, 3)).toBe(true)
    expect(near(y, 3)).toBe(true) // y += xy * x = 1 * 3
    expect(near(z, 0)).toBe(true)
  })

  it('no shear = identity', () => {
    expect(matNear(shear(0, 0, 0, 0, 0, 0), identity())).toBe(true)
  })
})

// ── det3 ──────────────────────────────────────────────────────────────────────

describe('det3', () => {
  it('det(I) = 1', () => {
    expect(det3(identity())).toBeCloseTo(1)
  })

  it('det(scale(2,3,4)) = 24', () => {
    expect(det3(scale(2, 3, 4))).toBeCloseTo(24)
  })

  it('det of any pure rotation = 1', () => {
    const R = multiply(rotationX(30), multiply(rotationY(60), rotationZ(120)))
    expect(det3(R)).toBeCloseTo(1)
  })

  it('reflection flips det sign → -1', () => {
    expect(det3(reflection('XY'))).toBeCloseTo(-1)
    expect(det3(reflection('XZ'))).toBeCloseTo(-1)
    expect(det3(reflection('YZ'))).toBeCloseTo(-1)
  })

  it('singular matrix (one axis zeroed) → det = 0', () => {
    expect(det3(scale(0, 1, 1))).toBeCloseTo(0)
  })
})

// ── reflection ────────────────────────────────────────────────────────────────

describe('reflection', () => {
  it('XY plane: flips Z, keeps X and Y', () => {
    const [x, y, z] = applyRot(reflection('XY'), [1, 2, 3])
    expect(near(x,  1)).toBe(true)
    expect(near(y,  2)).toBe(true)
    expect(near(z, -3)).toBe(true)
  })

  it('XZ plane: flips Y, keeps X and Z', () => {
    const [x, y, z] = applyRot(reflection('XZ'), [1, 2, 3])
    expect(near(x,  1)).toBe(true)
    expect(near(y, -2)).toBe(true)
    expect(near(z,  3)).toBe(true)
  })

  it('YZ plane: flips X, keeps Y and Z', () => {
    const [x, y, z] = applyRot(reflection('YZ'), [1, 2, 3])
    expect(near(x, -1)).toBe(true)
    expect(near(y,  2)).toBe(true)
    expect(near(z,  3)).toBe(true)
  })

  it('applied twice = identity', () => {
    const R = reflection('XY')
    expect(matNear(multiply(R, R), identity(), 1e-10)).toBe(true)
  })

  it('unknown axis returns identity', () => {
    expect(matNear(reflection('??'), identity())).toBe(true)
  })
})

// ── planeMatrix ───────────────────────────────────────────────────────────────

describe('planeMatrix', () => {
  it('normal=[0,0,1], d=0 → identity (plane already at Z=0)', () => {
    expect(matNear(planeMatrix([0, 0, 1], 0), identity(), 1e-9)).toBe(true)
  })

  it('normal=[0,0,1], d=5 → translates center to (0,0,5)', () => {
    const M = planeMatrix([0, 0, 1], 5)
    expect(near(M[12], 0)).toBe(true)
    expect(near(M[13], 0)).toBe(true)
    expect(near(M[14], 5)).toBe(true)
  })

  it('local +Z column (world normal) matches normalized input normal', () => {
    const normals = [[1, 0, 0], [0, 1, 0], [1, 1, 0], [1, 1, 1]]
    for (const n of normals) {
      const len = Math.sqrt(n[0]**2 + n[1]**2 + n[2]**2)
      const M = planeMatrix(n, 0)
      // col 2 = indices 8,9,10 = world normal
      expect(near(M[8],  n[0]/len, 1e-9)).toBe(true)
      expect(near(M[9],  n[1]/len, 1e-9)).toBe(true)
      expect(near(M[10], n[2]/len, 1e-9)).toBe(true)
    }
  })

  it('center point lies on the plane (n·center = d)', () => {
    const cases = [
      { n: [1, 0, 0], d: 3 },
      { n: [0, 1, 0], d: -2 },
      { n: [1, 1, 1], d: 5 },
    ]
    for (const { n, d } of cases) {
      const M = planeMatrix(n, d)
      const cx = M[12], cy = M[13], cz = M[14]
      const len = Math.sqrt(n[0]**2 + n[1]**2 + n[2]**2)
      const dot = n[0]*cx + n[1]*cy + n[2]*cz
      expect(dot / len).toBeCloseTo(d / len, 9)
    }
  })

  it('normal=[0,0,-1] (opposite Z) → handled without NaN', () => {
    const M = planeMatrix([0, 0, -1], 0)
    expect(M.every(v => !isNaN(v))).toBe(true)
    // col2 should point in -Z direction
    expect(near(M[8],   0)).toBe(true)
    expect(near(M[9],   0)).toBe(true)
    expect(near(M[10], -1)).toBe(true)
  })
})

// ── lineMatrix ────────────────────────────────────────────────────────────────

describe('lineMatrix', () => {
  it('local Z (col 2) matches normalized direction', () => {
    const M = lineMatrix(0, 0, 0, 3, 0, 0)  // direction along X
    const len = 3
    expect(near(M[8],  3/len)).toBe(true)
    expect(near(M[9],  0)).toBe(true)
    expect(near(M[10], 0)).toBe(true)
  })

  it('translation is foot of perpendicular from origin onto line', () => {
    // Line through (2,0,0) in direction Y: foot = (2,0,0)
    const M = lineMatrix(2, 0, 0, 0, 1, 0)
    expect(near(M[12], 2)).toBe(true)
    expect(near(M[13], 0)).toBe(true)
    expect(near(M[14], 0)).toBe(true)
  })

  it('foot of perpendicular from origin: line through (1,1,0) along Z', () => {
    // Direction = Z, foot = point on line closest to origin = (1,1,0)
    const M = lineMatrix(1, 1, 0, 0, 0, 1)
    expect(near(M[12], 1)).toBe(true)
    expect(near(M[13], 1)).toBe(true)
    expect(near(M[14], 0)).toBe(true)
  })

  it('zero direction returns identity', () => {
    expect(matNear(lineMatrix(1, 2, 3, 0, 0, 0), identity())).toBe(true)
  })
})

// ── poseMatrix ────────────────────────────────────────────────────────────────

describe('poseMatrix', () => {
  it('translation column matches given position', () => {
    const M = poseMatrix(1, 2, 3, 0, 0, 1)
    expect(near(M[12], 1)).toBe(true)
    expect(near(M[13], 2)).toBe(true)
    expect(near(M[14], 3)).toBe(true)
  })

  it('local Z (col 2) matches normalized direction', () => {
    const M = poseMatrix(0, 0, 0, 0, 3, 0)  // direction = Y
    expect(near(M[8],  0)).toBe(true)
    expect(near(M[9],  1)).toBe(true)
    expect(near(M[10], 0)).toBe(true)
  })

  it('produces an orthonormal frame (cols 0,1,2 are unit & mutually ⊥)', () => {
    const M = poseMatrix(5, -3, 1, 1, 2, 3)
    const col = (c) => [M[c*4], M[c*4+1], M[c*4+2]]
    const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2]
    const norm = (v) => Math.sqrt(dot(v, v))
    const [c0, c1, c2] = [col(0), col(1), col(2)]
    expect(norm(c0)).toBeCloseTo(1)
    expect(norm(c1)).toBeCloseTo(1)
    expect(norm(c2)).toBeCloseTo(1)
    expect(dot(c0, c1)).toBeCloseTo(0)
    expect(dot(c0, c2)).toBeCloseTo(0)
    expect(dot(c1, c2)).toBeCloseTo(0)
  })

  it('zero direction returns identity', () => {
    expect(matNear(poseMatrix(0, 0, 0, 0, 0, 0), identity())).toBe(true)
  })
})
