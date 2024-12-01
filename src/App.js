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
    const [text, setText] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [loading, setLoading] = useState(false);

    const handleGenerateAudio = async () => {
        if (!text || !apiKey) {
            alert("Please provide text and an OpenAI API key.");
            return;
        }
    
        setLoading(true);
    
        try {
            const response = await fetch("/api/text_to_speech", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ text, api_key: apiKey }),
            });
    
            if (!response.ok) {
                throw new Error(`Server responded with status ${response.status}`);
            }
    
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setAudioURL(url);
        } catch (error) {
            console.error("Error generating audio:", error);
            alert("Error generating audio. Please try again.");
        } finally {
            setLoading(false);
        }
    };    

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
    <main className="flex flex-col items-center justify-start min-h-screen bg-gray-100 m-0 p-0">
        {/* Header Section */}
        <header className="w-full bg-lightTeal pb-8 shadow-lg">
            <div className="flex flex-col items-center">
                {/* Image Section */}
                <div className="h-auto w-48 flex-shrink-0 mt-8">
                    <img
                        src="/psycholing.jpeg"
                        alt="Header"
                        className="h-auto w-full object-contain rounded-full border-4 border-offWhite"
                    />
                </div>

                {/* Title Section */}
                <div className="mt-6 text-center">
                    <h1 className="text-5xl font-extrabold text-darkGray tracking-wide">
                        Improve Your Pronunciation
                    </h1>
                </div>
            </div>
        </header>

        {/* Main Content Wrapper */}
        <div className="w-full max-w-4xl p-4">
            {/* Text-to-Speech Section */}
            <div className="bg-offWhite shadow-md rounded-lg p-8 mt-8">
                <h3 className="text-xl font-semibold text-darkGray mb-4 text-center">Text-to-Speech</h3>
                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Enter your OpenAI API Key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-lightTeal"
                    />
                    <textarea
                        rows="4"
                        placeholder="Enter text to convert to speech"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-lightTeal"
                    />
                </div>
                <div className="mt-4 text-center">
                    <button
                        onClick={handleGenerateAudio}
                        disabled={loading}
                        className={`px-6 py-2 rounded-lg text-white ${
                            loading ? 'bg-lightTeal cursor-not-allowed' : 'bg-mutedRed hover:bg-red-500'
                        }`}
                    >
                        {loading ? 'Generating...' : 'Generate Audio'}
                    </button>
                </div>
            </div>

            {/* Recording Section */}
            <div className="mt-4 flex items-center justify-center gap-4">
                <button
                    onClick={handleStartRecording}
                    disabled={recording}
                    className={`flex items-center px-6 py-2 rounded-full font-semibold text-white gap-2 ${
                        recording ? 'bg-lightTeal cursor-not-allowed' : 'bg-mutedRed hover:bg-red-500'
                    }`}
                >
                    Start Recording
                </button>
                <button
                    onClick={handleStopRecording}
                    disabled={!recording}
                    className={`flex items-center px-6 py-2 rounded-full font-semibold text-white gap-2 ${
                        !recording ? 'bg-lightTeal cursor-not-allowed' : 'bg-mutedRed hover:bg-red-500'
                    }`}
                >
                    Stop Recording
                </button>
            </div>

            {/* Generated Audio Section */}
            {audioURL && (
                <div className="bg-offWhite shadow-md rounded-lg p-8 mt-8">
                    <h2 className="text-2xl font-semibold text-center mb-4 text-darkGray">Generated Audio</h2>
                    <audio
                        controls
                        src={audioURL}
                        className="w-full rounded-lg border shadow-md focus:outline-none focus:ring-2 focus:ring-lightTeal"
                    ></audio>

                    {/* Waveform Visualization */}
                    <div
                        ref={waveformRef}
                        className="waveform-container h-24 w-full border border-gray-300 bg-white rounded-lg mt-6"
                    ></div>
                </div>
            )}

            {/* Pitch Analysis Section */}
            {pitchAnalysis.length > 0 && (
                <div className="bg-offWhite shadow-md rounded-lg p-8 mt-8">
                    <h2 className="text-2xl font-semibold text-center mb-6 text-darkGray">Pitch Analysis</h2>
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
    
 
