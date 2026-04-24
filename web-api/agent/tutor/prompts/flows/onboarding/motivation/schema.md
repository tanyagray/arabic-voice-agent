```json
{
  "type": "object",
  "required": ["acknowledgement", "motivation_tag"],
  "properties": {
    "acknowledgement": {
      "type": "string",
      "description": "One short line reflecting back what the learner said, e.g. 'mumtaz! Egyptian films will take you far.'"
    },
    "motivation_tag": {
      "type": "string",
      "description": "A concise 2–4 word summary of the motivation, used by downstream steps to pick starter lessons.",
      "minLength": 1,
      "maxLength": 60
    }
  },
  "additionalProperties": false
}
```
