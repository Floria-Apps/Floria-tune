use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, Runtime,
};

pub const TRAY_ID: &str = "main-tray";
pub const MENU_ITEM_TRACK_INFO: &str = "tray_track_info";
pub const MENU_ITEM_PLAY_PAUSE: &str = "tray_play_pause";
pub const MENU_ITEM_PREV: &str = "tray_prev";
pub const MENU_ITEM_NEXT: &str = "tray_next";
pub const MENU_ITEM_TOGGLE_WINDOW: &str = "tray_toggle_window";
pub const MENU_ITEM_QUIT: &str = "tray_quit";

/// Cria o ícone da bandeja do sistema usando a API nativa do Tauri.
pub fn create_tray<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    // Carrega o ícone padrão da janela (definido no tauri.conf.json > icon)
    let tray_icon = app.default_window_icon().cloned()
        .ok_or_else(|| "Falha ao carregar ícone padrão da janela".to_string())?;

    let track_info = MenuItem::with_id(
        app,
        MENU_ITEM_TRACK_INFO,
        "Floria Tune — Reprodutor",
        false,
        None::<&str>,
    )
    .map_err(|e| e.to_string())?;

    let play_pause = MenuItem::with_id(
        app,
        MENU_ITEM_PLAY_PAUSE,
        "▶ Reproduzir / Pausar",
        true,
        None::<&str>,
    )
    .map_err(|e| e.to_string())?;

    let prev = MenuItem::with_id(
        app,
        MENU_ITEM_PREV,
        "⏮ Faixa anterior",
        true,
        None::<&str>,
    )
    .map_err(|e| e.to_string())?;

    let next = MenuItem::with_id(
        app,
        MENU_ITEM_NEXT,
        "⏭ Próxima faixa",
        true,
        None::<&str>,
    )
    .map_err(|e| e.to_string())?;

    let toggle_window = MenuItem::with_id(
        app,
        MENU_ITEM_TOGGLE_WINDOW,
        "Mostrar Floria Tune",
        true,
        None::<&str>,
    )
    .map_err(|e| e.to_string())?;

    let quit = MenuItem::with_id(
        app,
        MENU_ITEM_QUIT,
        "Sair",
        true,
        None::<&str>,
    )
    .map_err(|e| e.to_string())?;

    let menu = Menu::with_items(
        app,
        &[
            &track_info,
            &PredefinedMenuItem::separator(app).map_err(|e| e.to_string())?,
            &play_pause,
            &prev,
            &next,
            &PredefinedMenuItem::separator(app).map_err(|e| e.to_string())?,
            &toggle_window,
            &PredefinedMenuItem::separator(app).map_err(|e| e.to_string())?,
            &quit,
        ],
    )
    .map_err(|e| e.to_string())?;

    TrayIconBuilder::with_id(TRAY_ID)
        .icon(tray_icon)
        .tooltip("Floria Tune")
        .title("Floria Tune")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(move |app_handle, event| {
            match event.id().as_ref() {
                MENU_ITEM_PLAY_PAUSE => {
                    let _ = app_handle.emit("tray:toggle_play", ());
                }
                MENU_ITEM_PREV => {
                    let _ = app_handle.emit("tray:prev", ());
                }
                MENU_ITEM_NEXT => {
                    let _ = app_handle.emit("tray:next", ());
                }
                MENU_ITEM_TOGGLE_WINDOW => {
                    toggle_main_window(app_handle);
                }
                MENU_ITEM_QUIT => {
                    app_handle.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_main_window(tray.app_handle());
            }
        })
        .build(app)
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Reconstrói o menu da bandeja com textos atualizados (faixa atual, estado play/pause).
pub fn update_tray_info<R: Runtime>(app: &AppHandle<R>, title: Option<String>, artist: Option<String>, is_paused: bool) -> Result<(), String> {
    let track_text = match (&title, &artist) {
        (Some(t), Some(a)) => format!("{} - {}", t, a),
        (Some(t), None) => t.clone(),
        _ => "Floria Tune".to_string(),
    };

    let play_pause_label = if is_paused {
        "▶ Reproduzir / Pausar"
    } else {
        "⏸ Reproduzir / Pausar"
    };

    let track_info = MenuItem::with_id(app, MENU_ITEM_TRACK_INFO, track_text, false, None::<&str>)
        .map_err(|e| e.to_string())?;
    let play_pause = MenuItem::with_id(app, MENU_ITEM_PLAY_PAUSE, play_pause_label, true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let prev = MenuItem::with_id(app, MENU_ITEM_PREV, "⏮ Faixa anterior", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let next = MenuItem::with_id(app, MENU_ITEM_NEXT, "⏭ Próxima faixa", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let toggle_window = MenuItem::with_id(app, MENU_ITEM_TOGGLE_WINDOW, "Mostrar Floria Tune", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let quit = MenuItem::with_id(app, MENU_ITEM_QUIT, "Sair", true, None::<&str>)
        .map_err(|e| e.to_string())?;

    let menu = Menu::with_items(
        app,
        &[
            &track_info,
            &PredefinedMenuItem::separator(app).map_err(|e| e.to_string())?,
            &play_pause,
            &prev,
            &next,
            &PredefinedMenuItem::separator(app).map_err(|e| e.to_string())?,
            &toggle_window,
            &PredefinedMenuItem::separator(app).map_err(|e| e.to_string())?,
            &quit,
        ],
    )
    .map_err(|e| e.to_string())?;

    // Busca o tray existente pelo ID e atualiza o menu
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        tray.set_menu(Some(menu)).map_err(|e| e.to_string())?;
    }

    Ok(())
}

pub fn toggle_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let is_visible = window.is_visible().unwrap_or(false);
        let is_minimized = window.is_minimized().unwrap_or(false);

        if !is_visible || is_minimized {
            let _ = window.show();
            let _ = window.unminimize();
            let _ = window.set_focus();
        } else {
            let _ = window.hide();
        }
    }
}
