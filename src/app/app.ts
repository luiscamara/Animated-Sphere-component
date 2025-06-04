import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimatedSphereComponent, SphereConfig } from './animated-sphere/animated-sphere';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AnimatedSphereComponent, CommonModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'animated-sphere';

  sphereConfig: SphereConfig = {
    radius: 3,
    widthSegments: 64,
    heightSegments: 32,
    color1: '#00ffff',
    color2: '#ff00ff',
    animationSpeed: 0.02,
    waveIntensity: 0.5,
    audioScaleSensitivity: 1.5
  };

  audioIntensity: number = 0;
  isAudioActive: boolean = false;
  errorMessage: string = '';

  private audioContext: AudioContext | null = null;
  private analyzer: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private frequencyData: Uint8Array = new Uint8Array();
  private animationFrameId: number = 0;

  ngOnInit(): void {
    this.initAudio();
    this.startAudioAnalysis();
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }

  private async initAudio(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyzer = this.audioContext.createAnalyser();
      this.analyzer.fftSize = 256;
      this.analyzer.smoothingTimeConstant = 0.8;
      
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyzer);
      
      this.frequencyData = new Uint8Array(this.analyzer.frequencyBinCount);
      this.isAudioActive = true;
      this.errorMessage = '';
    } catch (error) {
      console.error('Error accessing microphone:', error);
      this.errorMessage = 'Unable to access microphone. Please allow microphone access and refresh the page.';
      this.isAudioActive = false;
    }
  }

  private startAudioAnalysis = (): void => {
    this.animationFrameId = requestAnimationFrame(this.startAudioAnalysis);
    
    if (this.analyzer && this.isAudioActive) {
      this.analyzer.getByteFrequencyData(this.frequencyData);
      
      // Calculate average intensity
      const sum = this.frequencyData.reduce((acc, val) => acc + val, 0);
      this.audioIntensity = sum / this.frequencyData.length / 255;
    }
  };

  public toggleAudio(): void {
    if (this.isAudioActive && this.audioContext) {
      this.audioContext.suspend();
    } else if (this.audioContext) {
      this.audioContext.resume();
    }
  }

  public updateConfig(newConfig: Partial<SphereConfig>): void {
    this.sphereConfig = { ...this.sphereConfig, ...newConfig };
  }
}
