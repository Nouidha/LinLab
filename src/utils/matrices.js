// All matrices: flat 16-element arrays in column-major order (THREE.Matrix4.fromArray compatible).
// Element at row r, column c → index r + c*4.

const DEG = Math.PI / 180

export function identity() {
  return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]
}

// C = A * B  (column-major)
export function multiply(a, b) {
  const r = new Array(16).fill(0)
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let s = 0
      for (let k = 0; k < 4; k++) s += a[row + k * 4] * b[k + col * 4]
      r[row + col * 4] = s
    }
  }
  return r
}

export function translation(x, y, z, scale) {
  return [1,0,0,0, 0,1,0,0, 0,0,1,0, x*scale,y*scale,z*scale,1]
}

export function rotationX(deg) {
  const t = deg * DEG, c = Math.cos(t), s = Math.sin(t)
  return [1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]
}

export function rotationY(deg) {
  const t = deg * DEG, c = Math.cos(t), s = Math.sin(t)
  return [c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]
}

export function rotationZ(deg) {
  const t = deg * DEG, c = Math.cos(t), s = Math.sin(t)
  return [c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]
}

export function scale(x, y, z) {
  return [x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1]
}

// xy = "x sheared by y factor", etc.
export function shear(xy, xz, yx, yz, zx, zy) {
  return [1,xy,xz,0, yx,1,yz,0, zx,zy,1,0, 0,0,0,1]
}

// Position a plane defined by n·x = d.
// Rotates PlaneGeometry (+Z normal) to align with normalize(n), then translates.
export function planeMatrix(normal, distance) {
  const [a, b, c] = normal
  const len2 = a*a + b*b + c*c
  if (len2 < 1e-20) return identity()

  const len = Math.sqrt(len2)
  const nx = a/len, ny = b/len, nz = c/len

  // Point on plane closest to origin = normalize(n) * (d / |n|)
  const t = distance / len
  const tx = nx*t, ty = ny*t, tz = nz*t

  // Special case: n already ≈ +Z (PlaneGeometry default)
  if (nz > 1 - 1e-10) return [1,0,0,0, 0,1,0,0, 0,0,1,0, tx,ty,tz,1]

  // Special case: n ≈ −Z → flip 180° around X
  if (nz < -1 + 1e-10) return [1,0,0,0, 0,-1,0,0, 0,0,-1,0, tx,ty,tz,1]

  // Rodrigues' rotation: axis = cross([0,0,1], [nx,ny,nz]) = [−ny, nx, 0]
  const sinA = Math.sqrt(nx*nx + ny*ny)   // = sin(angle)
  const cosA = nz                          // = cos(angle)  (dot [0,0,1]·n = nz)
  const T    = 1 - cosA
  const ux = -ny/sinA, uy = nx/sinA, uz = 0

  // Column-major 4×4: rotation cols 0-2 + translation col 3
  return [
    T*ux*ux + cosA,      T*ux*uy + sinA*uz, T*ux*uz - sinA*uy, 0,
    T*ux*uy - sinA*uz,   T*uy*uy + cosA,    T*uy*uz + sinA*ux, 0,
    T*ux*uz + sinA*uy,   T*uy*uz - sinA*ux, T*uz*uz + cosA,    0,
    tx, ty, tz, 1,
  ]
}

// Pose matrix from an explicit position P and direction d.
// Translation = exactly P (unlike lineMatrix which uses the foot of perpendicular from origin).
// Local Z = normalized d. Local X, Y = arbitrary orthonormal frame perpendicular to Z.
export function poseMatrix(px, py, pz, dx, dy, dz) {
  const len = Math.sqrt(dx*dx + dy*dy + dz*dz)
  if (len < 1e-10) return identity()

  const nx = dx/len, ny = dy/len, nz = dz/len

  let ux, uy, uz
  if (Math.abs(nx) < 0.9) {
    const cl = Math.sqrt(nz*nz + ny*ny)
    ux = 0; uy = nz/cl; uz = -ny/cl
  } else {
    const cl = Math.sqrt(nz*nz + nx*nx)
    ux = -nz/cl; uy = 0; uz = nx/cl
  }

  const vx = ny*uz - nz*uy
  const vy = nz*ux - nx*uz
  const vz = nx*uy - ny*ux

  return [ux,uy,uz,0, vx,vy,vz,0, nx,ny,nz,0, px,py,pz,1]
}

// Pose matrix for a line defined by point P and direction d.
// - Translation = orthogonal projection of origin onto the line
// - Local Z     = normalized direction
// - Local X, Y  = arbitrary orthonormal frame perpendicular to Z
export function lineMatrix(px, py, pz, dx, dy, dz) {
  const len = Math.sqrt(dx*dx + dy*dy + dz*dz)
  if (len < 1e-10) return identity()

  const nx = dx/len, ny = dy/len, nz = dz/len

  // proj of origin: P - (P·n̂)*n̂
  const dot = px*nx + py*ny + pz*nz
  const tx = px - dot*nx, ty = py - dot*ny, tz = pz - dot*nz

  // Local X: cross(n̂, ref) — ref is whichever world axis is least parallel to n̂
  let ux, uy, uz
  if (Math.abs(nx) < 0.9) {
    // cross(n̂, [1,0,0]) = [0, nz, -ny]
    const cl = Math.sqrt(nz*nz + ny*ny)
    ux = 0; uy = nz/cl; uz = -ny/cl
  } else {
    // cross(n̂, [0,1,0]) = [-nz, 0, nx]
    const cl = Math.sqrt(nz*nz + nx*nx)
    ux = -nz/cl; uy = 0; uz = nx/cl
  }

  // Local Y = n̂ × localX  (right-handed frame)
  const vx = ny*uz - nz*uy
  const vy = nz*ux - nx*uz
  const vz = nx*uy - ny*ux

  return [ux,uy,uz,0, vx,vy,vz,0, nx,ny,nz,0, tx,ty,tz,1]
}

// Determinant of the 3×3 rotation/scale block (upper-left of column-major 4×4)
export function det3(m) {
  return m[0] * (m[5]*m[10] - m[9]*m[6])
       - m[4] * (m[1]*m[10] - m[9]*m[2])
       + m[8] * (m[1]*m[6]  - m[5]*m[2])
}

export function reflection(axis) {
  switch (axis) {
    case 'X':  return [1,0,0,0, 0,-1,0,0, 0,0,-1,0, 0,0,0,1]   // keep X, flip Y,Z
    case 'Y':  return [-1,0,0,0, 0,1,0,0, 0,0,-1,0, 0,0,0,1]   // keep Y, flip X,Z
    case 'Z':  return [-1,0,0,0, 0,-1,0,0, 0,0,1,0, 0,0,0,1]   // keep Z, flip X,Y
    case 'XY': return [1,0,0,0, 0,1,0,0, 0,0,-1,0, 0,0,0,1]    // flip Z (XY plane)
    case 'XZ': return [1,0,0,0, 0,-1,0,0, 0,0,1,0, 0,0,0,1]    // flip Y (XZ plane)
    case 'YZ': return [-1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]    // flip X (YZ plane)
    default:   return identity()
  }
}