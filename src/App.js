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
    <main className="flex flex-col min-h-screen bg-textWhite">
        {/* Header Section */}
        <header className="w-full bg-textWhite py-4">
            <div className="flex items-center justify-between max-w-full px-6">
                <div className="text-xl font-bold text-textBlack">Pronunciation Improvement</div>
                <nav className="flex items-center space-x-6">
                    <button className="px-4 py-2 rounded-lg bg-textWhite text-textBlack font-semibold border">
                        Sign In
                    </button>
                    <button className="px-4 py-2 rounded-lg bg-brightYellow text-textBlack font-semibold">
                        Sign Up
                    </button>
                </nav>
            </div>
        </header>

        {/* Hero Section */}
        <section className="relative w-full bg-textWhite py-20">
            <div className="absolute -top-10 -left-20 bg-brightYellow rounded-full h-64 w-64 opacity-50"></div>
            <div className="absolute top-10 right-10 bg-turquoise rounded-full h-48 w-48 opacity-50"></div>
            <div className="flex flex-col lg:flex-row items-center justify-center mx-auto max-w-screen-xl px-6">
                <div className="max-w-xl space-y-6">
                    <h1 className="text-5xl lg:text-6xl font-bold text-textBlack leading-tight">
                        Record, Analyze, and Improve Your Pronunciation.
                    </h1>
                    <p className="text-lg text-textBlack">
                        Compare your pronunciation to a native one using AI-powered tools.
                    </p>
                    <div className="flex flex-col space-y-4">
                        {/* API Key Input */}
                        <input
                            type="text"
                            placeholder="Enter your OpenAI API Key"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brightYellow w-full"
                        />
                        
                        {/* Text to Convert to Speech */}
                        <textarea
                            rows="4"
                            placeholder="Enter text to convert to speech"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brightYellow w-full"
                        />
                        
                        {/* Generate Audio Button */}
                        <button
                            onClick={handleGenerateAudio}
                            disabled={loading}
                            className={`px-6 py-2 rounded-lg text-textWhite ${
                                loading ? 'bg-lightGray cursor-not-allowed' : 'bg-brightYellow hover:bg-textBlack'
                            }`}
                        >
                            {loading ? 'Generating...' : 'Generate Audio'}
                        </button>
                    </div>
                </div>
                
                {/* Hero Image */}
                <div className="relative mt-8 lg:mt-0">
                    <div className="absolute -top-15 -left-20 bg-turquoise rounded-full h-25 w-25"></div>
                    <img
                        src="/psycholing.png"
                        alt="Hero"
                        className="w-[50rem] h-auto rounded-lg"
                        style={{ backgroundColor: 'transparent' }}
                    />
                </div>
            </div>
        </section>

        {/* Divider Line */}
        <div className="w-full border-t border-gray-300 my-6"></div>

        {/* Recording Section */}
        <section className="max-w-screen-xl mx-auto px-6 py-12">
            <h2 className="text-2xl font-semibold text-center mb-6 text-textBlack">Record Yourself</h2>
            <div className="flex items-center justify-center gap-4">
                <button
                    onClick={handleStartRecording}
                    disabled={recording}
                    className={`flex items-center px-6 py-2 rounded-full font-semibold text-textWhite gap-2 ${
                        recording ? 'bg-lightGray cursor-not-allowed' : 'bg-brightYellow hover:bg-textBlack'
                    }`}
                >
                    Start Recording
                </button>
                <button
                    onClick={handleStopRecording}
                    disabled={!recording}
                    className={`flex items-center px-6 py-2 rounded-full font-semibold text-textWhite gap-2 ${
                        !recording ? 'bg-lightGray cursor-not-allowed' : 'bg-brightYellow hover:bg-textBlack'
                    }`}
                >
                    Stop Recording
                </button>
            </div>
        </section>

        {/* Divider Line */}
        <div className="w-full border-t border-gray-300 my-6"></div>

        {/* Waveform and Pitch Analysis Section */}
        {(audioURL || pitchAnalysis.length > 0) && (
            <section className="max-w-screen-lg mx-auto px-6 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    {/* Waveform Visualization */}
                    <div className="bg-white rounded-lg p-6 border border-gray-300">
                        <h2 className="text-xl font-semibold text-center text-textBlack mb-4">Waveform</h2>
                        <div
                            ref={waveformRef}
                            className="h-32 w-[500px] bg-lightGray rounded-lg"
                        ></div>
                    </div>
                    
                    {/* Pitch Plot */}
                    {pitchAnalysis.length > 0 && (
                        <div className="bg-white rounded-lg p-6 border border-gray-300">
                            <h2 className="text-xl font-semibold text-center text-textBlack mb-4">Pitch Analysis</h2>
                            <div
                                className="relative h-60 w-[400px]"
                                style={{ position: "relative", height: "200px", width: "100%" }}
                            >
                                <Line data={pitchData} options={chartOptions} />
                            </div>
                        </div>
                    )}
                </div>
            </section>
        )}

        {/* Generated Audio Section */}
        {audioURL && (
            <section className="w-full mx-auto px-6 py-12">
                <div className="max-w-md mx-auto bg-white p-8 rounded-lg border border-gray-300">
                    <h2 className="text-2xl font-semibold text-center mb-4 text-textBlack">Generated Audio</h2>
                    <audio
                        controls
                        src={audioURL}
                        className="w-full rounded-lg border shadow-md focus:outline-none focus:ring-2 focus:ring-brightYellow"
                    ></audio>
                </div>
            </section>
        )}
    </main>
);

}
    
export default App;
    
 
