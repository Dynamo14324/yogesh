import {
  AmbientLight,
  BoxGeometry,
  Clock,
  Color,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';

export interface RenderingContext {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  tick: (deltaSeconds: number) => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;
}

export function createRenderingContext(canvasHost: HTMLElement): RenderingContext {
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(canvasHost.clientWidth, canvasHost.clientHeight);
  renderer.setClearColor(new Color('#050816'));

  const scene = new Scene();
  const camera = new PerspectiveCamera(70, canvasHost.clientWidth / canvasHost.clientHeight, 0.1, 100);
  camera.position.set(0, 0.5, 2.4);

  const ambient = new AmbientLight('#ffffff', 0.5);
  const directional = new DirectionalLight('#9ec2ff', 2.2);
  directional.position.set(2, 3, 2);
  scene.add(ambient, directional);

  const cube = new Mesh(
    new BoxGeometry(1, 1, 1),
    new MeshStandardMaterial({ color: '#59a4ff', metalness: 0.2, roughness: 0.4 }),
  );
  scene.add(cube);

  const clock = new Clock();

  canvasHost.replaceChildren(renderer.domElement);

  const tick = (deltaSeconds: number) => {
    cube.rotation.x += deltaSeconds * 0.65;
    cube.rotation.y += deltaSeconds * 0.9;
    renderer.render(scene, camera);
  };

  const resize = (width: number, height: number) => {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };

  const dispose = () => {
    cube.geometry.dispose();
    (cube.material as MeshStandardMaterial).dispose();
    renderer.dispose();
  };

  const animateWarmup = () => {
    tick(clock.getDelta());
  };

  animateWarmup();

  return { renderer, scene, camera, tick, resize, dispose };
}
