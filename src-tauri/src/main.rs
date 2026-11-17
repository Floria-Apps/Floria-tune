// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // libmpv requires the C locale for numeric parsing.
    unsafe {
        std::env::set_var("LC_NUMERIC", "C");
    }
    unsafe {
        std::env::set_var("LC_ALL", "C");
    }
    floria_tune_lib::run()
}
