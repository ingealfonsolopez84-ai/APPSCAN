import ARKit
import simd

/// Convierte las mallas de ARKit (`ARMeshAnchor`) en archivos STL binario u OBJ.
///
/// Los modelos se exportan en **milímetros** y con el eje **Z hacia arriba**
/// (convención habitual de los laminadores de impresión 3D), a partir del
/// sistema de ARKit que usa metros con el eje Y hacia arriba.
enum MeshExporter {

    enum Format: String, CaseIterable, Identifiable {
        case stl
        case obj

        var id: String { rawValue }

        var fileExtension: String { rawValue }

        var displayName: String {
            switch self {
            case .stl: return "STL (binario)"
            case .obj: return "OBJ"
            }
        }
    }

    enum ExportError: LocalizedError {
        case emptyMesh

        var errorDescription: String? {
            switch self {
            case .emptyMesh:
                return "Todavía no hay superficies escaneadas. Mueve el iPhone despacio para capturar la escena."
            }
        }
    }

    struct Triangle {
        var v0: SIMD3<Float>
        var v1: SIMD3<Float>
        var v2: SIMD3<Float>

        var normal: SIMD3<Float> {
            let n = simd_cross(v1 - v0, v2 - v0)
            let length = simd_length(n)
            return length > 0 ? n / length : SIMD3<Float>(0, 0, 1)
        }
    }

    static func export(anchors: [ARMeshAnchor], format: Format, to url: URL) throws {
        let triangles = triangles(from: anchors)
        guard !triangles.isEmpty else { throw ExportError.emptyMesh }

        switch format {
        case .stl:
            try writeBinarySTL(triangles: triangles, to: url)
        case .obj:
            try writeOBJ(triangles: triangles, to: url)
        }
    }

    // MARK: - Extracción de geometría

    /// Extrae todos los triángulos en coordenadas de mundo, convertidos a
    /// milímetros y con Z hacia arriba.
    static func triangles(from anchors: [ARMeshAnchor]) -> [Triangle] {
        var result: [Triangle] = []

        for anchor in anchors {
            let geometry = anchor.geometry
            let vertices = geometry.vertices
            let faces = geometry.faces

            guard faces.indexCountPerPrimitive == 3 else { continue }

            let transform = anchor.transform
            result.reserveCapacity(result.count + faces.count)

            for faceIndex in 0..<faces.count {
                var corners = [SIMD3<Float>](repeating: .zero, count: 3)
                var valid = true

                for corner in 0..<3 {
                    let index = vertexIndex(of: faces, primitive: faceIndex, corner: corner)
                    guard index >= 0, index < vertices.count else {
                        valid = false
                        break
                    }
                    let local = vertex(at: index, source: vertices)
                    let world = transform * SIMD4<Float>(local.x, local.y, local.z, 1)
                    corners[corner] = toPrintSpace(SIMD3<Float>(world.x, world.y, world.z))
                }

                if valid {
                    result.append(Triangle(v0: corners[0], v1: corners[1], v2: corners[2]))
                }
            }
        }

        return result
    }

    /// Metros con Y arriba (ARKit) -> milímetros con Z arriba (impresión 3D).
    private static func toPrintSpace(_ v: SIMD3<Float>) -> SIMD3<Float> {
        SIMD3<Float>(v.x, -v.z, v.y) * 1000
    }

    private static func vertex(at index: Int, source: ARGeometrySource) -> SIMD3<Float> {
        let pointer = source.buffer.contents()
            .advanced(by: source.offset + source.stride * index)
        let floats = pointer.assumingMemoryBound(to: Float.self)
        return SIMD3<Float>(floats[0], floats[1], floats[2])
    }

    private static func vertexIndex(of element: ARGeometryElement, primitive: Int, corner: Int) -> Int {
        let byteOffset = (primitive * element.indexCountPerPrimitive + corner) * element.bytesPerIndex
        let pointer = element.buffer.contents().advanced(by: byteOffset)
        switch element.bytesPerIndex {
        case 2:
            return Int(pointer.assumingMemoryBound(to: UInt16.self).pointee)
        case 4:
            return Int(pointer.assumingMemoryBound(to: UInt32.self).pointee)
        default:
            return -1
        }
    }

    // MARK: - STL binario

    private static func writeBinarySTL(triangles: [Triangle], to url: URL) throws {
        var data = Data()
        data.reserveCapacity(84 + triangles.count * 50)

        // Cabecera de 80 bytes.
        var header = Array("Escaner 3D - iPhone LiDAR (mm, Z-up)".utf8)
        header.append(contentsOf: [UInt8](repeating: 0, count: max(0, 80 - header.count)))
        data.append(contentsOf: header.prefix(80))

        appendLittleEndian(UInt32(triangles.count), to: &data)

        for triangle in triangles {
            appendVector(triangle.normal, to: &data)
            appendVector(triangle.v0, to: &data)
            appendVector(triangle.v1, to: &data)
            appendVector(triangle.v2, to: &data)
            appendLittleEndian(UInt16(0), to: &data)
        }

        try data.write(to: url, options: .atomic)
    }

    private static func appendVector(_ v: SIMD3<Float>, to data: inout Data) {
        appendLittleEndian(v.x.bitPattern, to: &data)
        appendLittleEndian(v.y.bitPattern, to: &data)
        appendLittleEndian(v.z.bitPattern, to: &data)
    }

    private static func appendLittleEndian<T: FixedWidthInteger>(_ value: T, to data: inout Data) {
        var littleEndian = value.littleEndian
        withUnsafeBytes(of: &littleEndian) { data.append(contentsOf: $0) }
    }

    // MARK: - OBJ

    private static func writeOBJ(triangles: [Triangle], to url: URL) throws {
        var text = "# Escaner 3D - iPhone LiDAR\n# Unidades: milimetros, eje Z hacia arriba\n"
        text.reserveCapacity(triangles.count * 120)

        for triangle in triangles {
            text += "v \(triangle.v0.x) \(triangle.v0.y) \(triangle.v0.z)\n"
            text += "v \(triangle.v1.x) \(triangle.v1.y) \(triangle.v1.z)\n"
            text += "v \(triangle.v2.x) \(triangle.v2.y) \(triangle.v2.z)\n"
        }

        for index in 0..<triangles.count {
            let base = index * 3 + 1
            text += "f \(base) \(base + 1) \(base + 2)\n"
        }

        try text.write(to: url, atomically: true, encoding: .utf8)
    }
}
