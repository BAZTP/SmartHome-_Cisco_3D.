import { Component, type ReactNode } from "react";
export default class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div role="alert" className="scene-error">
        <h2>No se pudo iniciar la escena 3D</h2>
        <p>Comprueba que tu navegador permita WebGL2 y aceleración gráfica.</p>
        <button onClick={() => this.setState({ failed: false })}>
          Reintentar escena
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
