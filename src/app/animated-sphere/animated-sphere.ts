import { Component, OnInit, OnDestroy, ElementRef, ViewChild, Input, OnChanges, SimpleChanges } from '@angular/core';
import * as THREE from 'three';

export interface SphereConfig {
  radius: number;
  widthSegments: number;
  heightSegments: number;
  color1: string;
  color2: string;
  animationSpeed: number;
  waveIntensity: number;
  audioScaleSensitivity: number;
}

@Component({
  selector: 'app-animated-sphere',
  templateUrl: './animated-sphere.html',
  styleUrls: ['./animated-sphere.css'],
  standalone: true
})
export class AnimatedSphereComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('sphereContainer', { static: true }) sphereContainer!: ElementRef;
  
  @Input() config: SphereConfig = {
    radius: 3,
    widthSegments: 64,
    heightSegments: 32,
    color1: '#00ffff', // Cyan
    color2: '#ff00ff', // Magenta
    animationSpeed: 0.02,
    waveIntensity: 0.5,
    audioScaleSensitivity: 1.5
  };

  @Input() audioIntensity: number = 0;

  private scene: THREE.Scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera();
  private renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer();
  private sphere: THREE.Mesh = new THREE.Mesh();
  private sphereGeometry: THREE.SphereGeometry = new THREE.SphereGeometry();
  private originalVertices: Float32Array = new Float32Array();
  
  private animationFrameId: number = 0;
  private time: number = 0;
  private currentScale: number = 1;
  private targetScale: number = 1;
  private previousAudioIntensity: number = 0;
  
  public isAudioActive: boolean = false;
  public errorMessage: string = '';

  ngOnInit(): void {
    this.initThreeJS();
    this.createSphere();
    this.setupLighting();
    this.animate();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && this.sphere) {
      this.updateSphereConfig();
    }
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  private initThreeJS(): void {
    const container = this.sphereContainer.nativeElement;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // Scene setup
    this.scene.background = new THREE.Color(0x0a0a0a);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = 8;

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());
  }

  private createSphere(): void {
    this.sphereGeometry = new THREE.SphereGeometry(
      this.config.radius,
      this.config.widthSegments,
      this.config.heightSegments
    );

    // Store original vertices for animation
    this.originalVertices = this.sphereGeometry.attributes['position'].array.slice() as Float32Array;

    // Create gradient material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        color1: { value: new THREE.Color(this.config.color1) },
        color2: { value: new THREE.Color(this.config.color2) },
        time: { value: 0 }
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        
        void main() {
          vPosition = position;
          vNormal = normal;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        uniform float time;
        varying vec3 vPosition;
        varying vec3 vNormal;
        
        void main() {
          float mixValue = (vPosition.y + 3.0) / 6.0;
          mixValue = smoothstep(0.0, 1.0, mixValue);
          
          vec3 color = mix(color2, color1, mixValue);
          
          // Add some glow effect
          float glow = dot(vNormal, vec3(0.0, 0.0, 1.0));
          glow = pow(glow * 0.8 + 0.2, 2.0);
          
          gl_FragColor = vec4(color * glow, 0.8);
        }
      `,
      wireframe: true,
      transparent: true
    });

    this.sphere = new THREE.Mesh(this.sphereGeometry, material);
    this.scene.add(this.sphere);
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    
    this.time += this.config.animationSpeed;
    
    // Update target scale based on audio intensity changes
    this.updateAudioScale(this.audioIntensity);
    
    // Animate sphere vertices with wave effects
    this.animateSphereVertices();
    
    // Apply audio-based scaling
    this.applyAudioScaling();
    
    // Update shader uniforms
    const material = this.sphere.material as THREE.ShaderMaterial;
    material.uniforms['time'].value = this.time;
    
    this.renderer.render(this.scene, this.camera);
  };

  private updateAudioScale(audioIntensity: number): void {
    // Only update scale if audio intensity changes significantly
    const intensityDifference = Math.abs(audioIntensity - this.previousAudioIntensity);
    
    if (intensityDifference > 0.01) { // Threshold for audio changes
      // Map audio intensity to scale (1.0 to 2.0 range)
      this.targetScale = 1.0 + audioIntensity * this.config.audioScaleSensitivity;
      this.previousAudioIntensity = audioIntensity;
    }
  }

  private applyAudioScaling(): void {
    // Smooth interpolation towards target scale
    const scaleLerpSpeed = 0.1;
    this.currentScale = THREE.MathUtils.lerp(this.currentScale, this.targetScale, scaleLerpSpeed);
    
    // Apply scale to the entire sphere
    this.sphere.scale.setScalar(this.currentScale);
  }

  private animateSphereVertices(): void {
    const positions = this.sphereGeometry.attributes['position'];
    const originalPositions = this.originalVertices;
    
    for (let i = 0; i < positions.count; i++) {
      const i3 = i * 3;
      
      // Get original position
      const x = originalPositions[i3];
      const y = originalPositions[i3 + 1];
      const z = originalPositions[i3 + 2];
      
      // Calculate spherical coordinates for wave effects
      const radius = Math.sqrt(x * x + y * y + z * z);
      const theta = Math.atan2(y, x); // Angle around Y axis
      const phi = Math.acos(z / radius); // Angle from Y axis
      
      // Create multiple wave effects for surface ripples
      const wave1 = Math.sin(this.time * 3 + theta * 8) * 0.15;
      const wave2 = Math.sin(this.time * 2 + phi * 6) * 0.1;
      const wave3 = Math.sin(this.time * 4 + (theta + phi) * 4) * 0.08;
      
      // Combine waves for complex surface effect
      const waveDisplacement = (wave1 + wave2 + wave3) * this.config.waveIntensity;
      
      // Apply wave displacement to create surface ripples
      const displacement = 1 + waveDisplacement * 0.2;
      
      positions.setXYZ(i, x * displacement, y * displacement, z * displacement);
    }
    
    positions.needsUpdate = true;
    this.sphereGeometry.computeVertexNormals();
  }

  private onWindowResize(): void {
    const container = this.sphereContainer.nativeElement;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private updateSphereConfig(): void {
    if (!this.sphere) return;
    
    // Update shader uniforms
    const material = this.sphere.material as THREE.ShaderMaterial;
    material.uniforms['color1'].value = new THREE.Color(this.config.color1);
    material.uniforms['color2'].value = new THREE.Color(this.config.color2);
  }
}
