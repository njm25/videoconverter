import React, { useState, useEffect, useCallback } from 'react';
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
  const [progress, setProgress] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadFFmpeg = async () => {
      const ffmpegInstance = new FFmpeg();
      await ffmpegInstance.load();
      setFFmpeg(ffmpegInstance);
      setLoading(false);
    };
    loadFFmpeg();
  }, []);


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
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const uploadedFile = e.dataTransfer.files[0];
    const fileExtension = uploadedFile.name.split('.').pop();
    if (!supportedFormats.includes(fileExtension)) {
      setError('Unsupported file format. Please upload a valid video file.');
      return;
    }
    const availableFormats = supportedFormats.filter(format => format !== fileExtension);
    setFile(uploadedFile);
    setSelectedFormat(availableFormats[0]);
    setError(null);
  }, []);

  const convertVideo = async () => {
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
  };

  const isFormatSupportedForBrowser = (format) => {
    return supportedFormatsForBrowser.includes(format);
  };

  return (
    <div className="page-container">
      <div className="video-converter-container" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
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
              <div className="format-select">
                <label htmlFor="format">Convert to: </label>
                <select
                  id="format"
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  disabled={converting}
                >
                  {supportedFormats.filter(format => format !== file.name.split('.').pop()).map(format => (
                    <option key={format} value={format}>{format}</option>
                  ))}
                </select>
              </div>
            )}
            <button onClick={convertVideo} disabled={!file || converting || loading} className="convert-button">
              {converting ? 'Converting...' : 'Convert Video'}
            </button>
          </>
        )}
        {converting && (
          <div className="progress-container" >
            <div className="progress-bar" style={{ width: `${progress}%` }}></div>
          </div>
        )}
        {outputFile && (
          <div className="output-container">
            <h2>Converted Video</h2>
            <p>{outputFileName}</p>
            {isFormatSupportedForBrowser(selectedFormat) ? (
              <video src={outputFile} controls width="500" className="output-video" />
            ) : (
              <p>Playback not supported for this format in the browser. Please download the video to view it.</p>
            )}
            <div className="output-buttons">
              <a href={outputFile} download={outputFileName} className="download-link">Download</a>
              <button onClick={resetConverter} className="convert-another-button">Convert Another</button>
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
