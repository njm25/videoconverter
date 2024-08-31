import React, { useState, useEffect, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import './VideoConverter.css';

const supportedFormats = ['mp4', 'avi', 'mov', 'mkv', 'flv', 'wmv'];
const supportedFormatsForBrowser = ['mp4', 'mov', 'mkv'];

const VideoConverter = () => {
  const [ffmpeg, setFFmpeg] = useState(null);
  const [file, setFile] = useState(null);
  const [outputFile, setOutputFile] = useState(null);
  const [outputFileName, setOutputFileName] = useState('');
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState('');
  const [error, setError] = useState(null);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const videoRef = useRef(null);
  const timelineRef = useRef(null);

  useEffect(() => {
    const loadFFmpeg = async () => {
      const ffmpegInstance = new FFmpeg();
      await ffmpegInstance.load();
      setFFmpeg(ffmpegInstance);
      setLoading(false);
    };
    loadFFmpeg();
  }, []);

  useEffect(() => {
    if (file && videoRef.current) {
      const video = videoRef.current;
      const videoURL = URL.createObjectURL(file);
      video.src = videoURL;
      video.onloadedmetadata = () => {
        setDuration(video.duration);
        setEndTime(video.duration);
      };
      video.ontimeupdate = () => {
        setCurrentTime(video.currentTime);
      };
    }
  }, [file]);

  const handleFileChange = (e) => {
    const uploadedFile = e.target.files[0];
    const fileExtension = uploadedFile.name.split('.').pop();
    if (!supportedFormats.includes(fileExtension)) {
      setError('Unsupported file format. Please upload a valid video file.');
      return;
    }
    const availableFormats = supportedFormats.filter(format => format !== fileExtension);
    setFile(uploadedFile);
    setSelectedFormat(availableFormats[0]);
    setError(null);
    setOutputFile(null);
  };

  const handleDragStart = (e, isStart) => {
    const onMove = (moveEvent) => {
      const timelineRect = timelineRef.current.getBoundingClientRect();
      const offsetX = moveEvent.clientX - timelineRect.left;

      if (offsetX < 0 || offsetX > timelineRect.width) return; // Prevent dragging outside bounds

      const newValue = (offsetX / timelineRect.width) * duration;

      if (isStart) {
        if (newValue >= endTime) return;
        setStartTime(newValue);
        videoRef.current.currentTime = newValue;
      } else {
        if (newValue <= startTime) return;
        setEndTime(newValue);
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const cropVideo = async () => {
    if (!file) return;
    setCropping(true);
    setProgress(0);
    setError(null);
    const { name } = file;
    const outputName = `${name.split('.')[0]}_cropped.mp4`;

    ffmpeg.on('progress', ({ progress }) => {
      setProgress(progress * 100);
    });

    try {
      await ffmpeg.writeFile(name, await fetchFile(file));
      await ffmpeg.exec(['-i', name, '-ss', startTime.toFixed(2), '-to', endTime.toFixed(2), outputName]);
      const data = await ffmpeg.readFile(outputName);

      const url = URL.createObjectURL(new Blob([data], { type: 'video/mp4' }));
      setOutputFile(url);
      setOutputFileName(outputName);

      // Redirect to download page or offer the download link
      window.location.href = url;
    } catch (err) {
      setError('An error occurred during the cropping process.');
    } finally {
      setCropping(false);
    }
  };

  const convertVideo = async () => {
    if (!file) return;
    setConverting(true);
    setProgress(0);
    setError(null);
    const { name } = file;
    const outputName = `${name.split('.')[0]}_converted.${selectedFormat}`;

    ffmpeg.on('progress', ({ progress }) => {
      setProgress(progress * 100);
    });

    try {
      await ffmpeg.writeFile(name, await fetchFile(file));
      await ffmpeg.exec(['-i', name, outputName]);
      const data = await ffmpeg.readFile(outputName);

      const url = URL.createObjectURL(new Blob([data], { type: `video/${selectedFormat}` }));
      setOutputFile(url);
      setOutputFileName(outputName);
    } catch (err) {
      setError('An error occurred during the conversion process.');
    } finally {
      setConverting(false);
    }
  };

  const resetConverter = () => {
    setFile(null);
    setOutputFile(null);
    setOutputFileName('');
    setSelectedFormat('');
    setProgress(0);
    setError(null);
    setStartTime(0);
    setEndTime(0);
    setDuration(0);
    setCurrentTime(0);
  };

  const isFormatSupportedForBrowser = (format) => {
    return supportedFormatsForBrowser.includes(format);
  };

  return (
    <div className="page-container">
      <div className="video-converter-container" onDrop={handleFileChange} onDragOver={(e) => e.preventDefault()}>
        <h1>Video Converter</h1>
        {!outputFile && (
          <>
            <div className="upload-container">
              <input
                type="file"
                id="file-input"
                onChange={handleFileChange}
                className="file-input"
                accept=".mp4, .avi, .mov, .mkv, .flv, .wmv"
              />
              <label htmlFor="file-input" className="upload-button">
                {file ? file.name : 'Choose File or Drag & Drop'}
              </label>
            </div>
            {file && (
              <>
                <video ref={videoRef} controls className="preview-video" />
                <div className="timeline-container" ref={timelineRef}>
                  <div className="timeline">
                    <div
                      className="slider-button start-slider"
                      style={{ left: `${(startTime / duration) * 100}%` }}
                      onMouseDown={(e) => handleDragStart(e, true)}
                    />
                    <div
                      className="slider-button end-slider"
                      style={{ left: `${(endTime / duration) * 100}%` }}
                      onMouseDown={(e) => handleDragStart(e, false)}
                    />
                  </div>
                  <div className="current-time-indicator" style={{ left: `${(currentTime / duration) * 100}%` }} />
                </div>
                <div className="convert-group">
                  <div className="format-select">
                    <label htmlFor="format">Convert to: </label>
                    <select
                      id="format"
                      value={selectedFormat}
                      onChange={(e) => setSelectedFormat(e.target.value)}
                      disabled={converting || cropping}
                    >
                      {supportedFormats.filter(format => format !== file.name.split('.').pop()).map(format => (
                        <option key={format} value={format}>{format}</option>
                      ))}
                    </select>
                  </div>
                  <div className="action-buttons">
                    <button onClick={cropVideo} disabled={cropping} className="crop-button">
                      {cropping ? 'Cropping...' : 'Crop Video'}
                    </button>
                    <button onClick={convertVideo} disabled={converting || cropping} className="convert-button">
                      {converting ? 'Converting...' : 'Convert Video'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
        {converting && (
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${progress}%` }}></div>
          </div>
        )}
        {outputFile && (
          <div className="output-container">
            <h2>Processed Video</h2>
            <p>{outputFileName}</p>
            {isFormatSupportedForBrowser(selectedFormat) ? (
              <video src={outputFile} controls width="500" className="output-video" />
            ) : (
              <p>Playback not supported for this format in the browser. Please download the video to view it.</p>
            )}
            <div className="output-buttons">
              <a href={outputFile} download={outputFileName} className="download-link">Download</a>
              <button onClick={resetConverter} className="convert-another-button">Process Another</button>
            </div>
          </div>
        )}
        {error && <p className="error-message">{error}</p>}
        {loading && <p>Loading FFmpeg...</p>}
      </div>
    </div>
  );
};

export default VideoConverter;
