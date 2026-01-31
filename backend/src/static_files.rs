//! Static file serving for embedded frontend assets

use axum::{
    body::Body,
    extract::Path,
    http::{header, Response, StatusCode},
    response::IntoResponse,
};
use rust_embed::Embed;

#[derive(Embed)]
#[folder = "../frontend/dist"]
struct Asset;

pub async fn serve_static(Path(path): Path<String>) -> impl IntoResponse {
    let full_path = format!("assets/{}", path);
    serve_file(&full_path)
}

pub async fn serve_index() -> impl IntoResponse {
    serve_file("index.html")
}

fn serve_file(path: &str) -> Response<Body> {
    match Asset::get(path) {
        Some(content) => {
            let mime = mime_guess::from_path(path).first_or_octet_stream();
            Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, mime.as_ref())
                .body(Body::from(content.data.into_owned()))
                .unwrap()
        }
        None => {
            // For SPA: return index.html for non-asset routes
            if !path.contains('.') {
                if let Some(content) = Asset::get("index.html") {
                    return Response::builder()
                        .status(StatusCode::OK)
                        .header(header::CONTENT_TYPE, "text/html")
                        .body(Body::from(content.data.into_owned()))
                        .unwrap();
                }
            }
            Response::builder()
                .status(StatusCode::NOT_FOUND)
                .body(Body::from("Not Found"))
                .unwrap()
        }
    }
}
