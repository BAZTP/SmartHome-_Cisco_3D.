import { useState } from "react";
import { useDesign, roomNames, validateDesign, designSnapshot } from "./design";
import { useNetwork } from "./network";
import { useScene } from "./store";
export default function RoomEditor() {
  const design = useDesign(),
    network = useNetwork();
  const [id, I] = useState(0),
    [name, N] = useState("Sala"),
    [message, M] = useState("");
  const room = design.rooms.find((r) => r.id === id);
  function change(action: "save" | "delete") {
    try {
      const rooms = design.rooms.filter((r) => r.id !== id);
      if (action === "save") rooms.push({ id, name: name.trim() });
      const next = validateDesign(
        {
          ...designSnapshot(network),
          rooms: rooms.sort((a, b) => a.id - b.id),
        },
        network,
      );
      useDesign.setState({ rooms: next.rooms });
      if (useScene.getState().selected === room?.name)
        useScene.setState({ selected: action === "save" ? name.trim() : null });
      M(
        action === "save"
          ? "Habitación actualizada; guarda el proyecto"
          : "Habitación eliminada; guarda el proyecto",
      );
    } catch (e) {
      M(String(e));
    }
  }
  return (
    <details className="advanced">
      <summary>Editar habitaciones</summary>
      <p>
        La casa tiene nueve espacios. Puedes renombrarlos, retirar espacios
        vacíos y volver a crearlos. Mueve primero sus equipos para eliminar una
        habitación.
      </p>
      <label>
        Espacio de la casa
        <select
          aria-label="Espacio de habitación"
          value={id}
          onChange={(e) => {
            const id = Number(e.target.value);
            I(id);
            N(design.rooms.find((r) => r.id === id)?.name ?? roomNames[id]);
          }}
        >
          {roomNames.map((label, i) => (
            <option key={i} value={i}>
              {i + 1} ·{" "}
              {design.rooms.find((r) => r.id === i)?.name ?? label + " (vacío)"}
            </option>
          ))}
        </select>
      </label>
      <label>
        Nombre de habitación
        <input
          aria-label="Nombre de habitación"
          value={name}
          maxLength={60}
          onChange={(e) => N(e.target.value)}
        />
      </label>
      <button onClick={() => change("save")}>
        {room ? "Actualizar habitación" : "Crear habitación"}
      </button>
      <button disabled={!room} onClick={() => change("delete")}>
        Eliminar habitación
      </button>
      <p aria-live="polite" aria-label="Estado de habitación">
        {message}
      </p>
    </details>
  );
}
