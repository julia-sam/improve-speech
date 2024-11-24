import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import WaveSurfer from "wavesurfer.js";
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement } from 'chart.js';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement);

function App() {
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [recording, setRecording] = useState(false);
    const [audioURL, setAudioURL] = useState(null);
    const waveformRef = useRef(null);
    const wavesurferRef = useRef(null);

    useEffect(() => {
        if (audioURL && waveformRef.current) {
            if (wavesurferRef.current) {
                wavesurferRef.current.destroy();
            }

            wavesurferRef.current = WaveSurfer.create({
                container: waveformRef.current,
                waveColor: "#a4b0be",
                progressColor: "#57606f",
                cursorColor: "#ff4757",
            });

            wavesurferRef.current.load(audioURL);
        }
    }, [audioURL]);

    const handleStartRecording = async () => {
      try {
          setAudioURL(null);
  
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" }); // Ensure webm format
          const chunks = [];
  
          recorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                  chunks.push(event.data);
              }
          };
  
          recorder.onstop = async () => {
              if (chunks.length > 0) {
                  const audioBlob = new Blob(chunks, { type: "audio/webm" }); // Default to webm
                  console.log("MIME type of recorded audio:", audioBlob.type); // Check type for debugging
  
                  // Ensure it's webm
                  if (audioBlob.type !== "audio/webm") {
                      alert("Error: Recorded audio is not in the correct format.");
                      return;
                  }
  
                  setAudioURL(URL.createObjectURL(audioBlob));
                  const formData = new FormData();
                  formData.append("audio", audioBlob, "recording.webm");

              }
          };
  
          recorder.start();
          setMediaRecorder(recorder);
          setRecording(true);
      } catch (error) {
          console.error("Error accessing microphone:", error);
      }
  };
  

    const handleStopRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            setRecording(false);
        }
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                title: {
                    display: true,
                    text: "Frames",
                },
            },
            y: {
                title: {
                    display: true,
                    text: "Frequency (Hz)",
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
                
            </div>
        </main>
    );
}

export default App;
