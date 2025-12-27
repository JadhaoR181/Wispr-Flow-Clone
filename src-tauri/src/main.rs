use tauri::{AppHandle, State};
use tauri::Emitter;

use std::sync::Arc;
use tokio::sync::Mutex;

use futures_util::{SinkExt, StreamExt};
use serde_json::json;

use tokio_tungstenite::{
    connect_async,
    tungstenite::{
        Message,
        client::IntoClientRequest,
    },
};

use http::HeaderValue;


struct DeepgramState {
    socket: Mutex<Option<
        futures_util::stream::SplitSink<
            tokio_tungstenite::WebSocketStream<
                tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>
            >,
            Message
        >
    >>,
}

#[tauri::command]
async fn start_deepgram(
    app: AppHandle,
    state: State<'_, Arc<DeepgramState>>,
    api_key: String,
) -> Result<(), String> {
  let url = "wss://api.deepgram.com/v1/listen\
  ?model=nova-2\
  &language=en-US\
  &punctuate=true\
  &interim_results=true\
  &endpointing=false\
  &vad_events=true\
  &encoding=linear16\
  &sample_rate=16000";


    // ✅ Proper WebSocket request with auto-generated headers
    let mut request = url
        .into_client_request()
        .map_err(|e| e.to_string())?;


request
    .headers_mut()
    .insert(
        "Authorization",
        HeaderValue::from_str(&format!("Token {}", api_key))
            .map_err(|e| e.to_string())?,
    );


    let (ws_stream, _) = connect_async(request)
        .await
        .map_err(|e| e.to_string())?;

    let (write, mut read) = ws_stream.split();
    *state.socket.lock().await = Some(write);

    // ✅ Read transcription messages asynchronously
    tauri::async_runtime::spawn(async move {
        while let Some(msg) = read.next().await {
            if let Ok(Message::Text(text)) = msg {
                if let Ok(data) = serde_json::from_str::<serde_json::Value>(&text) {
                    let transcript = data["channel"]["alternatives"][0]["transcript"]
                        .as_str()
                        .unwrap_or("");

                    if !transcript.is_empty() {
                        let _ = app.emit(
                            "deepgram-transcript",
                            json!({
                                "text": transcript,
                                "final": data["is_final"].as_bool().unwrap_or(false)
                            }),
                        );
                    }
                }
            }
        }
    });

    Ok(())
}

#[tauri::command]
async fn send_audio_chunk(
    state: State<'_, Arc<DeepgramState>>,
    chunk: Vec<i16>,
) -> Result<(), String> {
    if let Some(ws) = state.socket.lock().await.as_mut() {
        ws.send(Message::Binary(
            bytemuck::cast_slice(&chunk).to_vec(),
        ))
        .await
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn stop_deepgram(
    state: State<'_, Arc<DeepgramState>>,
) -> Result<(), String> {
    state.socket.lock().await.take();
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .manage(Arc::new(DeepgramState {
            socket: Mutex::new(None),
        }))
        .invoke_handler(tauri::generate_handler![
            start_deepgram,
            send_audio_chunk,
            stop_deepgram
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
