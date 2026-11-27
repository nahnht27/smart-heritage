# Media tool: offline Vietnamese text-to-speech (Piper) and ffmpeg.
FROM python:3.12-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir "piper-tts==1.3.0" \
    && python -m piper.download_voices vi_VN-vais1000-medium --data-dir /voices
