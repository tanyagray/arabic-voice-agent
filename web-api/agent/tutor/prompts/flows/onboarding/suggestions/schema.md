```json
{
  "type": "object",
  "required": ["intro", "tiles"],
  "properties": {
    "intro": {
      "type": "string",
      "description": "One short line that acknowledges the motivation and invites the learner to pick, e.g. 'mumtaz! that\u2019s a great reason to learn. where shall we begin?'"
    },
    "tiles": {
      "type": "array",
      "minItems": 3,
      "maxItems": 3,
      "items": {
        "type": "object",
        "required": ["level", "title", "blurb"],
        "properties": {
          "level": {
            "type": "string",
            "enum": ["Beginner", "Intermediate", "Advanced"]
          },
          "title": { "type": "string", "minLength": 1, "maxLength": 60 },
          "blurb": { "type": "string", "minLength": 1, "maxLength": 160 },
          "arabic": {
            "type": ["string", "null"],
            "description": "Optional single Arabic word/phrase previewing the lesson."
          }
        },
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}
```
