use serde::{Deserialize, Serialize};

/// A single word/syllable timestamp from OpenSubsonic songLyrics v2.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CueWord {
    /// Start time in milliseconds.
    pub start: f64,
    /// End time in milliseconds, when present.
    pub end: Option<f64>,
    /// Word/syllable text.
    pub value: String,
}

impl From<opensubsonic::data::Cue> for CueWord {
    fn from(c: opensubsonic::data::Cue) -> Self {
        Self {
            start: c.start.unwrap_or(0.0),
            end: c.end,
            value: c.value.unwrap_or_default(),
        }
    }
}

/// A cue line grouping (OpenSubsonic songLyrics v2).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct StructuredCueLine {
    /// Index into the parent [`StructuredLyrics.line`] array.
    #[serde(default)]
    pub index: i32,
    /// Agent id for multi-voice tracks.
    pub agent_id: Option<String>,
    /// Start time in milliseconds for the whole line.
    #[serde(default)]
    pub start: Option<f64>,
    /// End time in milliseconds, when known.
    pub end: Option<f64>,
    /// Full rendered text of the line.
    pub value: String,
    /// Word/syllable-level cues.
    #[serde(default)]
    pub cue: Vec<CueWord>,
}

impl From<opensubsonic::data::CueLine> for StructuredCueLine {
    fn from(cl: opensubsonic::data::CueLine) -> Self {
        Self {
            index: cl.index.unwrap_or(-1),
            agent_id: cl.agent_id,
            start: cl.start,
            end: cl.end,
            value: cl.value.unwrap_or_default(),
            cue: cl.cue.into_iter().map(CueWord::from).collect(),
        }
    }
}

/// One structured-lyrics entry (may be main / translation / pronunciation layer).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct StructuredLyricsV2 {
    pub lang: String,
    pub synced: bool,
    pub line: Vec<LyricsLine>,
    pub display_artist: Option<String>,
    pub display_title: Option<String>,
    pub offset: Option<f64>,
    /// `"main"`, `"translation"`, or `"pronunciation"` (v2 only).
    pub kind: Option<String>,
    /// Vocal agent metadata (v2 only).
    pub agents: Option<Vec<Agent>>,
    /// Word/timing groupings (v2 only; populated when `enhanced=true`).
    pub cue_line: Option<Vec<StructuredCueLine>>,
}

impl From<opensubsonic::data::StructuredLyrics> for StructuredLyricsV2 {
    fn from(s: opensubsonic::data::StructuredLyrics) -> Self {
        Self {
            lang: s.lang,
            synced: s.synced,
            line: s.line.into_iter().map(LyricsLine::from).collect(),
            display_artist: s.display_artist,
            display_title: s.display_title,
            offset: s.offset,
            kind: s.kind,
            agents: s.agents.map(|a| a.into_iter().map(Agent::from).collect()),
            cue_line: s
                .cue_line
                .map(|cl| cl.into_iter().map(StructuredCueLine::from).collect()),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Agent {
    pub id: String,
    pub role: String,
    pub name: String,
}

impl From<opensubsonic::data::Agent> for Agent {
    fn from(a: opensubsonic::data::Agent) -> Self {
        Self {
            id: a.id,
            role: a.role,
            name: a.name,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LyricsLine {
    pub value: String,
    pub start: Option<f64>,
}

impl From<opensubsonic::data::Line> for LyricsLine {
    fn from(l: opensubsonic::data::Line) -> Self {
        Self {
            value: l.value,
            start: l.start,
        }
    }
}

/// Public response shape carried over the Tauri IPC.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct LyricsList {
    pub structured_lyrics: Vec<StructuredLyricsV2>,
}

impl From<opensubsonic::data::LyricsList> for LyricsList {
    fn from(l: opensubsonic::data::LyricsList) -> Self {
        Self {
            structured_lyrics: l
                .structured_lyrics
                .into_iter()
                .map(StructuredLyricsV2::from)
                .collect(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_cue_word() {
        let source: opensubsonic::data::Cue = serde_json::from_value(serde_json::json!({
            "start": 1234.0,
            "end": 2345.0,
            "value": "hello",
            "byteStart": 0,
            "byteEnd": 5
        }))
        .expect("valid Cue");

        let word = CueWord::from(source);
        assert_eq!(word.start, 1234.0);
        assert_eq!(word.end, Some(2345.0));
        assert_eq!(word.value, "hello");
    }

    #[test]
    fn maps_cue_word_defaults() {
        let source: opensubsonic::data::Cue = serde_json::from_value(serde_json::json!({}))
            .expect("valid empty Cue");
        let word = CueWord::from(source);
        assert_eq!(word.start, 0.0);
        assert_eq!(word.end, None);
        assert_eq!(word.value, "");
    }

    #[test]
    fn maps_lyrics_line() {
        let source: opensubsonic::data::Line = serde_json::from_value(serde_json::json!({
            "value": "Hello world",
            "start": 1000.0
        }))
        .expect("valid Line");
        let line = LyricsLine::from(source);
        assert_eq!(line.value, "Hello world");
        assert_eq!(line.start, Some(1000.0));
    }

    #[test]
    fn maps_structured_lyrics_v2() {
        let source: opensubsonic::data::StructuredLyrics = serde_json::from_value(serde_json::json!({
            "lang": "en",
            "synced": true,
            "line": [
                {"value": "Hello world", "start": 1000.0},
                {"value": "Goodbye", "start": 3000.0}
            ],
            "cueLine": [
                {"index": 0, "start": 1000.0, "end": 3000.0, "value": "Hello world", "cue": [{"start": 1000.0, "end": 1500.0, "value": "Hello"}, {"start": 1500.0, "end": 2000.0, "value": "world"}]}
            ],
            "displayArtist": "Artist",
            "displayTitle": "Title",
            "offset": 50.0,
            "kind": "main"
        }))
        .expect("valid StructuredLyrics");

        let sl = StructuredLyricsV2::from(source);
        assert_eq!(sl.lang, "en");
        assert!(sl.synced);
        assert_eq!(sl.line.len(), 2);
        assert_eq!(sl.line[0].value, "Hello world");
        assert_eq!(sl.line[0].start, Some(1000.0));
        assert!(sl.cue_line.is_some());
        assert_eq!(sl.cue_line.as_ref().unwrap().len(), 1);
        assert_eq!(sl.cue_line.as_ref().unwrap()[0].cue.len(), 2);
        assert_eq!(sl.display_artist.as_deref(), Some("Artist"));
        assert_eq!(sl.display_title.as_deref(), Some("Title"));
        assert_eq!(sl.offset, Some(50.0));
        assert_eq!(sl.kind.as_deref(), Some("main"));
    }

    #[test]
    fn maps_lyrics_list() {
        let source: opensubsonic::data::LyricsList = serde_json::from_value(serde_json::json!({
            "structuredLyrics": [
                {"lang": "en", "synced": true, "line": [{"value": "Hello", "start": 1000.0}]}
            ]
        }))
        .expect("valid LyricsList");

        let ll = LyricsList::from(source);
        assert_eq!(ll.structured_lyrics.len(), 1);
        assert!(ll.structured_lyrics[0].synced);
    }

    #[test]
    fn unsynced_lyrics() {
        let source: opensubsonic::data::StructuredLyrics = serde_json::from_value(serde_json::json!({
            "lang": "en",
            "synced": false,
            "line": [{"value": "Hello world"}, {"value": "Goodbye"}]
        }))
        .expect("valid unsynced StructuredLyrics");

        let sl = StructuredLyricsV2::from(source);
        assert!(!sl.synced);
        assert_eq!(sl.line.len(), 2);
        assert_eq!(sl.line[0].start, None);
        assert!(sl.cue_line.is_none());
    }

    #[test]
    fn empty_lyrics_list() {
        let source: opensubsonic::data::LyricsList = serde_json::from_value(serde_json::json!({}))
            .expect("valid empty LyricsList");
        let ll = LyricsList::from(source);
        assert!(ll.structured_lyrics.is_empty());
    }
}
