// src-tauri/src/main.rs
use tauri::{AppHandle, Emitter, State};

use std::sync::Arc;
use tokio::sync::Mutex;

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use futures_util::{SinkExt, StreamExt};
use serde_json::json;
use tokio_tungstenite::{
    connect_async,
    tungstenite::{client::IntoClientRequest, Message},
};
use http::HeaderValue;

type WsSink = futures_util::stream::SplitSink<
    tokio_tungstenite::WebSocketStream<
        tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
    >,
    Message,
>;

struct AppState {
    ws: Arc<Mutex<Option<WsSink>>>,
}

#[tauri::command]
async fn start_listening(
    app: AppHandle,
    state: State<'_, Arc<AppState>>,
    api_key: String,
) -> Result<(), String> {
    // --- CPAL: device & config ---
    let host = cpal::default_host();
    let device = host
        .default_input_device()
        .ok_or("No microphone found")?;

    let supported_config = device
        .default_input_config()
        .map_err(|e| format!("Failed to get default input config: {e}"))?;

    let sample_rate = supported_config.sample_rate().0;
    let channels = supported_config.channels();
    let sample_format = supported_config.sample_format();

    println!(
        "🎤 Using default input: {} channels @ {} Hz, format {:?}",
        channels, sample_rate, sample_format
    );

    let stream_config: cpal::StreamConfig = supported_config.clone().into();

    // --- Deepgram WebSocket ---
    let url = format!(
        "wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&punctuate=true&interim_results=true&encoding=linear16&sample_rate={}",
        sample_rate
    );

    let mut request = url.into_client_request().map_err(|e| e.to_string())?;
    request.headers_mut().insert(
        "Authorization",
        HeaderValue::from_str(&format!("Token {}", api_key))
            .map_err(|e| e.to_string())?,
    );

    let (ws, _) = connect_async(request).await.map_err(|e| e.to_string())?;
    let (write, mut read) = ws.split();
    *state.ws.lock().await = Some(write);

    // Read Deepgram messages
    let app_clone = app.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(msg_result) = read.next().await {
            match msg_result {
                Ok(Message::Text(text)) => {
                    println!("DEEPGRAM TEXT: {text}");

                    let Ok(v) =
                        serde_json::from_str::<serde_json::Value>(&text)
                    else {
                        eprintln!("Failed to parse Deepgram JSON");
                        continue;
                    };

                    if v.get("type")
                        .and_then(|t| t.as_str())
                        != Some("Results")
                    {
                        continue;
                    }

                    let transcript = v
                        .pointer("/channel/alternatives/0/transcript")
                        .and_then(|t| t.as_str())
                        .unwrap_or("");

                    let is_final = v
                        .get("is_final")
                        .and_then(|f| f.as_bool())
                        .unwrap_or(false);

                    println!(
                        "DEEPGRAM TRANSCRIPT FIELD: '{transcript}' (final={is_final})"
                    );

                    let _ = app_clone.emit(
                        "deepgram-transcript",
                        json!({
                            "text": transcript,
                            "final": is_final
                        }),
                    );
                }
                Ok(Message::Close(frame)) => {
                    println!("DEEPGRAM CLOSE: {:?}", frame);
                    break;
                }
                Ok(other) => {
                    println!("DEEPGRAM OTHER: {:?}", other);
                }
                Err(e) => {
                    eprintln!("WebSocket read error: {e}");
                    break;
                }
            }
        }
    });

    // --- Audio → Deepgram ---
    let ws_state = Arc::clone(&state.ws);
    let (audio_tx, mut audio_rx) =
        tokio::sync::mpsc::unbounded_channel::<Vec<i16>>();

    tauri::async_runtime::spawn(async move {
        while let Some(pcm) = audio_rx.recv().await {
            if let Some(ws) = ws_state.lock().await.as_mut() {
                let _ = ws
                    .send(Message::Binary(
                        bytemuck::cast_slice(&pcm).to_vec(),
                    ))
                    .await;
            }
        }
    });

    let stream = match sample_format {
        cpal::SampleFormat::F32 => device
            .build_input_stream(
                &stream_config,
                move |data: &[f32], _| {
                    let max_amp =
                        data.iter().fold(0.0_f32, |m, s| m.max(s.abs()));
                    println!("Frame max amplitude: {max_amp}");

                    let frame_size = channels as usize;
                    let pcm: Vec<i16> = data
                        .chunks(frame_size)
                        .map(|frame| {
                            let sum: f32 = frame.iter().copied().sum();
                            let mono = sum / (frame_size as f32);
                            (mono.clamp(-1.0, 1.0) * i16::MAX as f32) as i16
                        })
                        .collect();
                    let _ = audio_tx.send(pcm);
                },
                |err| eprintln!("❌ Stream error: {err}"),
                None,
            )
            .map_err(|e| format!("Failed to build stream: {e}"))?,
        _ => return Err("Unsupported sample format (need f32)".into()),
    };

    stream
        .play()
        .map_err(|e| format!("Failed to start: {e}"))?;
    std::mem::forget(stream);

    println!("✅ Listening started");
    Ok(())
}

#[tauri::command]
async fn stop_listening(
    state: State<'_, Arc<AppState>>,
) -> Result<(), String> {
  if let Some(mut ws) = state.ws.lock().await.take() {
      let _ = ws.close().await;
  }
  println!("✅ Stopped listening");
  Ok(())
}

fn main() {
  tauri::Builder::default()
      .manage(Arc::new(AppState {
          ws: Arc::new(Mutex::new(None)),
      }))
      .invoke_handler(tauri::generate_handler![
          start_listening,
          stop_listening
      ])
      .run(tauri::generate_context!())
      .expect("error running tauri app");
}
