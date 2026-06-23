import { Text, Billboard } from '@react-three/drei'

const AXES = [
  { label: 'X', color: '#ff4444', rotation: [0, 0, -Math.PI / 2], labelPos: [5.7, 0,   0  ] },
  { label: 'Y', color: '#44dd44', rotation: [0, 0,  0            ], labelPos: [0,   5.7, 0  ] },
  { label: 'Z', color: '#4499ff', rotation: [Math.PI / 2, 0, 0   ], labelPos: [0,   0,   5.7] },
]

const SHAFT_LEN = 4.65
const CONE_LEN  = 0.5
const CONE_R    = 0.09

function AxisArrow({ rotation, color }) {
  return (
    <group rotation={rotation}>
      {/* Shaft */}
      <mesh position={[0, SHAFT_LEN / 2, 0]}>
        <cylinderGeometry args={[0.025, 0.025, SHAFT_LEN, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Arrowhead */}
      <mesh position={[0, SHAFT_LEN + CONE_LEN / 2, 0]}>
        <coneGeometry args={[CONE_R, CONE_LEN, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  )
}

export default function CustomAxes() {
  return (
    <group>
      {AXES.map(({ label, color, rotation, labelPos }) => (
        <group key={label}>
          <AxisArrow rotation={rotation} color={color} />

          {/* Label — billboarded so it always faces the camera */}
          <Billboard position={labelPos}>
            <Text
              fontSize={0.42}
              color={color}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.04}
              outlineColor="#000000"
            >
              {label}
            </Text>
          </Billboard>
        </group>
      ))}

      {/* Origin sphere — depthTest off so it's always visible */}
      <mesh renderOrder={999}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#ffffff" depthTest={false} />
      </mesh>
    </group>
  )
}
