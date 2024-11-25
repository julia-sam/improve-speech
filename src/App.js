import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import WaveSurfer from 'wavesurfer.js';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement } from 'chart.js';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement);

function App() {
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [recording, setRecording] = useState(false);
    const [audioURL, setAudioURL] = useState(null);
    const [pitchAnalysis, setPitchAnalysis] = useState([]);
    const waveformRef = useRef(null);
    const wavesurferRef = useRef(null);
    const ffmpegRef = useRef(new FFmpeg({ log: true }));

    useEffect(() => {
        if (audioURL && waveformRef.current) {
            if (wavesurferRef.current) {
                wavesurferRef.current.destroy();
            }

            wavesurferRef.current = WaveSurfer.create({
                container: waveformRef.current,
                waveColor: '#a4b0be',
                progressColor: '#57606f',
                cursorColor: '#ff4757',
            });

            wavesurferRef.current.load(audioURL);
        }
    }, [audioURL]);

    const handleStartRecording = async () => {
        try {
            setAudioURL(null);
            setPitchAnalysis([]);

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);

            const chunks = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            recorder.onstop = async () => {
                if (chunks.length > 0) {
                    const webmBlob = new Blob(chunks, { type: 'audio/webm' });
                    setAudioURL(URL.createObjectURL(webmBlob));

                    const wavBlob = await convertWebmToWav(webmBlob);

                    const formData = new FormData();
                    formData.append('audio', wavBlob, 'recording.wav');

                    await fetchPitch(formData);
                }
            };

            recorder.start();
            setMediaRecorder(recorder);
            setRecording(true);
        } catch (error) {
            console.error('Error accessing microphone:', error);
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            setRecording(false);
        }
    };

    const convertWebmToWav = async (webmBlob) => {
        const ffmpeg = ffmpegRef.current;

        if (!ffmpeg.loaded) {
            await ffmpeg.load();
        }
        
        const webmFileName = 'input.webm';
        const wavFileName = 'output.wav';

        await ffmpeg.writeFile(webmFileName, await fetchFile(webmBlob));
        await ffmpeg.exec(['-i', webmFileName, wavFileName]);
        const wavData = await ffmpeg.readFile(wavFileName);

        return new Blob([wavData.buffer], { type: 'audio/wav' });
    };

    const fetchPitch = async (formData) => {
      try {
          const response = await fetch('/api/analyze_pitch', {
              method: 'POST',
              body: formData,
          });
  
          if (!response.ok) {
              throw new Error(`Server responded with status ${response.status}`);
          }
  
          const result = await response.json();
          console.log('Pitch analysis result:', result); // Debugging
  
          // Check if result is an array of { time, frequency }
          if (Array.isArray(result) && result.every((item) => 'time' in item && 'frequency' in item)) {
              setPitchAnalysis(result); // Update the pitchAnalysis state
          } else {
              console.error('Invalid pitch analysis format', result);
          }
      } catch (error) {
          console.error('Error analyzing pitch:', error);
          alert('Error analyzing pitch. Please try again.');
      }
  };  

  const pitchData = {
    labels: pitchAnalysis.map((point) => point.time.toFixed(2)), // Extract time for x-axis
    datasets: [
        {
            label: "Pitch (Hz)",
            data: pitchAnalysis.map((point) => point.frequency), // Extract frequency for y-axis
            borderColor: "#ff4757",
            backgroundColor: "rgba(255, 71, 87, 0.2)",
            borderWidth: 2,
            fill: false, // Disable filler to avoid continuous expansion
            pointRadius: 0,
            lineTension: 0.1,
        },
    ],
};

console.log("Pitch Analysis:", pitchAnalysis);
console.log("Chart Data:", pitchData);

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        x: {
            title: {
                display: true,
                text: "Time (s)",
            },
        },
        y: {
            title: {
                display: true,
                text: "Frequency (Hz)",
            },
            min: 50, // Minimum frequency value
            max: 500, // Maximum frequency value (adjust based on expected pitch range)
        },
    },
};

    return (
        <main className="flex flex-col items-center justify-center min-h-screen">
    {/* Header Section */}
    <div className="flex items-center justify-center mb-12 w-full">
        {/* Image Section */}
        <div className="h-auto w-96 flex-shrink-0">
            <img
                src="/psycholing.jpeg"
                alt="Header"
                className="h-auto w-full object-contain rounded-lg"
            />
        </div>

        {/* Title Section */}
        <div className="ml-6">
            <h1 className="text-4xl font-bold text-gray-800">
                Improve Your Pronunciation
            </h1>
        </div>
    </div>

    {/* Main Content */}
    <div className="w-full max-w-5xl mt-8">
        {/* Button Section */}
        <div className="mt-4 flex items-center justify-center">
            <button
                onClick={handleStartRecording}
                disabled={recording}
                className={`mr-4 px-4 py-2 rounded-lg text-white ${
                    recording ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-800 hover:bg-blue-700'
                }`}
            >
                Start Recording
            </button>
            <button
                onClick={handleStopRecording}
                disabled={!recording}
                className={`px-4 py-2 rounded-lg text-white ${
                    !recording ? 'bg-gray-500 cursor-not-allowed' : 'bg-red-800 hover:bg-red-700'
                }`}
            >
                Stop Recording
            </button>
        </div>

        {/* Recorded Audio Section */}
        {audioURL && (
            <div className="mt-8">
                <h2 className="text-2xl font-semibold text-center">Recorded Audio:</h2>
                <audio controls src={audioURL} className="mt-4"></audio>
                <div ref={waveformRef} className="mt-8"></div>
            </div>
        )}

        {/* Pitch Analysis Section */}
        {pitchAnalysis.length > 0 && (
            <div className="mt-8 w-full h-64">
                <h2 className="text-2xl font-semibold text-center">Pitch Analysis:</h2>
                <div
                    className="relative h-96 w-full overflow-hidden"
                    style={{ position: "relative", height: "400px", width: "100%" }}
                >
                    <Line data={pitchData} options={chartOptions} />
                </div>
            </div>
        )}
    </div>
</main>

  
        );
    }
    
    export default App;
    
 
