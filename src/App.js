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
            console.log('Pitch analysis result:', result);

            setPitchAnalysis(result.pitches || []);
        } catch (error) {
            console.error('Error analyzing pitch:', error);
            alert('Error analyzing pitch. Please try again.');
        }
    };

    const pitchData = {
        labels: pitchAnalysis.map((_, index) => `Frame ${index}`),
        datasets: [
            {
                label: 'Pitch (Hz)',
                data: pitchAnalysis,
                borderColor: '#ff4757',
                backgroundColor: 'rgba(255, 71, 87, 0.2)',
                borderWidth: 2,
                fill: true,
                pointRadius: 0,
                lineTension: 0.1,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Frames',
                },
            },
            y: {
                title: {
                    display: true,
                    text: 'Frequency (Hz)',
                },
            },
        },
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-between p-24">
            <div className="w-full max-w-5xl">
                <h1 className="text-3xl font-bold">Pronunciation Improvement</h1>
                <div className="mt-4">
                    <button
                        onClick={handleStartRecording}
                        disabled={recording}
                        className="mr-4 px-4 py-2 bg-green-500 text-white rounded"
                        >
                            Start Recording
                        </button>
                        <button
                            onClick={handleStopRecording}
                            disabled={!recording}
                            className="px-4 py-2 bg-red-500 text-white rounded"
                        >
                            Stop Recording
                        </button>
                    </div>
                    {audioURL && (
                        <div className="mt-8">
                            <h2 className="text-2xl font-semibold">Recorded Audio:</h2>
                            <audio controls src={audioURL} className="mt-4"></audio>
                            <div ref={waveformRef} className="mt-8"></div>
                        </div>
                    )}
                    {pitchAnalysis.length > 0 && (
                        <div className="mt-8 w-full h-64">
                            <h2 className="text-2xl font-semibold">Pitch Analysis:</h2>
                            <Line data={pitchData} options={chartOptions} />
                        </div>
                    )}
                </div>
            </main>
        );
    }
    
    export default App;
    
 
