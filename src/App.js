import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  //const [currentTime, setCurrentTime] = useState(0);
  const [helloMessage, setHelloMessage] = useState(""); 
  const [name, setName] = useState(""); 
  const [postResponse, setPostResponse] = useState("");

  // useEffect(() => {
  //   fetch('/api/time').then(res => res.json()).then(data => {
  //     setCurrentTime(data.time);
  //   });
  // }, []);



  const fetchHelloMessage = () => {
    fetch('/api/hello')
      .then(res => res.json())
      .then(data => {
        setHelloMessage(data.message);
      });
  };

  const sendPostRequest = () => {
    fetch('/api/hello', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }), 
    })
      .then(res => res.json())
      .then(data => {
        setPostResponse(data.message);
      });
  };

  return (
    <div className="App">
      <header className="App-header">
        <h2>GET Request</h2>
        <button onClick={fetchHelloMessage}>Fetch Hello Message</button>
        <p>{helloMessage}</p>

        <h2>POST Request</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
        />
        <button onClick={sendPostRequest}>Send Name</button>
        <p>{postResponse}</p>
      </header>
    </div>
  );
}

export default App;