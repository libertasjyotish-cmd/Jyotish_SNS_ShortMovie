FROM python:3.12-slim

# ffmpeg composites the video; libraqm gives Pillow Arabic shaping and RTL.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg libraqm0 curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV FONT_DIR=/opt/fonts
ARG FONTS=https://github.com/google/fonts/raw/main/ofl
RUN mkdir -p $FONT_DIR \
    && curl -sSL -o $FONT_DIR/MPLUS1p-Black.ttf $FONTS/mplus1p/MPLUS1p-Black.ttf \
    && curl -sSL -o $FONT_DIR/MPLUS1p-Bold.ttf $FONTS/mplus1p/MPLUS1p-Bold.ttf \
    && curl -sSL -o $FONT_DIR/MPLUS1p-Medium.ttf $FONTS/mplus1p/MPLUS1p-Medium.ttf \
    && curl -sSL -o $FONT_DIR/Montserrat.ttf "$FONTS/montserrat/Montserrat%5Bwght%5D.ttf" \
    && curl -sSL -o $FONT_DIR/NotoNaskhArabic.ttf \
       "$FONTS/notonaskharabic/NotoNaskhArabic%5Bwght%5D.ttf"

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

ENV PORT=8080
# One render at a time per instance; ffmpeg already uses every core.
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "1", "--threads", "1", \
     "--timeout", "900", "app:app"]
