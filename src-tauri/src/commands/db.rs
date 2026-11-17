use tauri::State;

use crate::db::Db;

#[tauri::command]
pub fn db_get_preference(db: State<'_, Db>, key: String) -> Result<Option<String>, String> {
    db.get_preference(&key)
}

#[tauri::command]
pub fn db_set_preference(db: State<'_, Db>, key: String, value: String) -> Result<(), String> {
    db.set_preference(&key, &value)
}

#[tauri::command]
pub fn db_add_history(db: State<'_, Db>, song_id: String) -> Result<(), String> {
    db.add_history(&song_id)
}

#[tauri::command]
pub fn db_get_history(db: State<'_, Db>, limit: Option<i64>) -> Result<Vec<String>, String> {
    db.get_history(limit.unwrap_or(50))
}
