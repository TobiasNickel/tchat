import { useRef, useState } from "react";

export function AudioAnalyzerPage() {
const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
const [isListening, setIsListening] = useState(false);
const canvasRef = useRef<HTMLCanvasElement>(null);

const startListening = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = 4096; // Higher resolution for better frequency accuracy

    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyserNode);

    setAudioContext(ctx);
    setAnalyser(analyserNode);
    setIsListening(true);

    drawFrequency(analyserNode);
  } catch (err) {
    console.error("Microphone access denied", err);
  }
};

const getFrequencyFromPitch = (pitch: number): string => {
  const noteNames = [
    "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"
  ];
  const a4 = 440;
  const c0 = a4 * Math.pow(2, -4.75);
  
  const halfStepsFromC0 = Math.round(12 * Math.log2(pitch / c0));
  const octave = Math.floor(halfStepsFromC0 / 12);
  const noteName = noteNames[halfStepsFromC0 % 12];
  
  return `${noteName}${octave} (${Math.round(pitch)} Hz)`;
};

const autoCorrelate = (
  buffer: Float32Array,
  sampleRate: number
): number => {
  // Implements the autocorrelation algorithm for fundamental frequency detection
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);
  let best_offset = -1;
  let best_correlation = 0;
  let rms = 0;

  // Calculate RMS to detect silence
  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i] ?? 0;
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);

  // Not enough signal
  if (rms < 0.01) return -1;

  // Find the best correlation offset
  let lastCorrelation = 1;
  for (let offset = 1; offset < MAX_SAMPLES; offset++) {
    let correlation = 0;

    for (let i = 0; i < MAX_SAMPLES; i++) {
      correlation += Math.abs(
        (buffer[i] ?? 0) - (buffer[i + offset] ?? 0)
      );
    }

    correlation = 1 - correlation / MAX_SAMPLES;
    if (correlation > 0.9 && correlation > lastCorrelation) {
      let foundGoodCorrelation = false;

      if (correlation > best_correlation) {
        best_correlation = correlation;
        best_offset = offset;
        foundGoodCorrelation = true;
      }

      if (foundGoodCorrelation) {
        // Interpolate to get a more accurate offset
        const shift =
          ((buffer[best_offset + 1] ?? 0) - (buffer[best_offset - 1] ?? 0)) /
          (2 * (2 * (buffer[best_offset] ?? 0) - (buffer[best_offset - 1] ?? 0) - (buffer[best_offset + 1] ?? 0)));
        return sampleRate / (best_offset + 8 * shift);
      }
    }
    lastCorrelation = correlation;
  }

  if (best_correlation > 0.01) {
    return sampleRate / best_offset;
  }

  return -1;
};

const drawFrequency = (analyserNode: AnalyserNode) => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const bufferLength = analyserNode.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  const timeDomainData = new Float32Array(analyserNode.fftSize);

  // Smoothing variables
  let detectedNotes: Array<{ frequency: number; amplitude: number }> = [];
  let lastUpdateTime = Date.now();
  const UPDATE_INTERVAL = 200; // Update display max 5 times per second

  const findPeaks = (data: Uint8Array, minHeight: number = 30): number[] => {
    // Find local maxima in the frequency spectrum
    const peaks: number[] = [];
    for (let i = 1; i < data.length - 1; i++) {
      const current = data[i] ?? 0;
      const prev = data[i - 1] ?? 0;
      const next = data[i + 1] ?? 0;
      if (current > minHeight && current > prev && current > next) {
        peaks.push(i);
      }
    }
    return peaks;
  };

  const frequencyToNote = (frequency: number): string => {
    const noteNames = [
      "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"
    ];
    const a4 = 440;
    const c0 = a4 * Math.pow(2, -4.75);
    
    const halfStepsFromC0 = Math.round(12 * Math.log2(frequency / c0));
    const octave = Math.floor(halfStepsFromC0 / 12);
    const noteName = noteNames[halfStepsFromC0 % 12];
    
    return `${noteName}${octave}`;
  };

  const detectMultipleNotes = (
    peakIndices: number[],
    dataArray: Uint8Array,
    sampleRate: number,
    bufferLength: number
  ): Array<{ frequency: number; amplitude: number }> => {
    const nyquistFrequency = sampleRate / 2;
    const notes: Array<{ frequency: number; amplitude: number }> = [];

    // Convert peaks to frequencies and amplitudes
    peakIndices.forEach((index) => {
      const frequency = (index / bufferLength) * nyquistFrequency;
      const amplitude = dataArray[index] ?? 0;
      
      // Only include peaks that are reasonably strong (above 20% of max)
      if (amplitude > 50) {
        notes.push({ frequency, amplitude });
      }
    });

    // Group nearby peaks (within semitone range) to avoid duplicates
    const grouped: Array<{ frequency: number; amplitude: number }> = [];
    const semitoneInHz = (freq: number) => freq * Math.pow(2, 1 / 12);

    for (const note of notes) {
      let found = false;
      for (const group of grouped) {
        // If frequencies are within a semitone, merge them
        if (
          note.frequency > group.frequency / semitoneInHz(group.frequency) &&
          note.frequency < group.frequency * semitoneInHz(group.frequency)
        ) {
          // Merge: keep the stronger one
          if (note.amplitude > group.amplitude) {
            group.frequency = note.frequency;
            group.amplitude = note.amplitude;
          }
          found = true;
          break;
        }
      }
      if (!found) {
        grouped.push(note);
      }
    }

    return grouped.sort((a, b) => b.amplitude - a.amplitude).slice(0, 5); // Max 5 notes
  };

  const draw = () => {
    requestAnimationFrame(draw);
    analyserNode.getByteFrequencyData(dataArray);
    analyserNode.getFloatTimeDomainData(timeDomainData);

    ctx.fillStyle = "rgb(200, 200, 200)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw frequency spectrum
    const barWidth = canvas.width / bufferLength;
    let maxValue = 0;
    let maxFrequencyIndex = 0;

    dataArray.forEach((value, index) => {
      ctx.fillStyle = `hsl(${(index / bufferLength) * 360}, 100%, 50%)`;
      ctx.fillRect(index * barWidth, canvas.height - value, barWidth, value);
      
      if (value > maxValue) {
        maxValue = value;
        maxFrequencyIndex = index;
      }
    });

    // Update detected notes at limited interval (smoothing)
    const now = Date.now();
    if (now - lastUpdateTime > UPDATE_INTERVAL) {
      lastUpdateTime = now;

      // Detect fundamental frequency using autocorrelation
      const fundamentalFrequency = autoCorrelate(
        timeDomainData,
        analyserNode.context.sampleRate
      );

      // Find multiple peaks in the spectrum
      const peaks = findPeaks(dataArray, 30);
      const multipleNotes = detectMultipleNotes(
        peaks,
        dataArray,
        analyserNode.context.sampleRate,
        bufferLength
      );

      // Store detected notes
      detectedNotes = multipleNotes;
    }

    // Draw labels
    ctx.fillStyle = "black";
    ctx.font = "14px Arial";
    
    // Volume label
    const volumePercent = Math.round((maxValue / 255) * 100);
    ctx.fillText(`Volume: ${volumePercent}%`, 10, 20);
    
    // Peak bin frequency (less reliable)
    const nyquistFrequency = analyserNode.context.sampleRate / 2;
    const peakBinFrequency = Math.round(
      (maxFrequencyIndex / bufferLength) * nyquistFrequency
    );
    ctx.fillText(`Peak Bin: ${peakBinFrequency} Hz`, 10, 40);

    // Display detected notes
    if (detectedNotes.length > 0) {
      ctx.fillStyle = "darkgreen";
      ctx.font = "bold 16px Arial";
      ctx.fillText(
        `Notes: ${detectedNotes.map((n) => frequencyToNote(n.frequency)).join(", ")}`,
        10,
        70
      );
      
      // Show frequencies in smaller text
      ctx.font = "12px Arial";
      ctx.fillStyle = "darkblue";
      const frequencies = detectedNotes
        .map((n) => `${Math.round(n.frequency)}Hz`)
        .join(", ");
      ctx.fillText(`Frequencies: ${frequencies}`, 10, 90);
    } else {
      ctx.fillStyle = "gray";
      ctx.font = "14px Arial";
      ctx.fillText("Notes: (no clear pitch)", 10, 70);
    }
  };

  draw();
};

  const stopListening = () => {
    audioContext?.close();
    setIsListening(false);
    setAudioContext(null);
    setAnalyser(null);
  };
  return (
    <div>
      <h1>Audio Analyzer</h1>
      <canvas ref={canvasRef} width={800} height={400} />
      <button onClick={isListening ? stopListening : startListening}>
        {isListening ? "Stop" : "Start"} Listening
      </button>
    </div>
  );
}