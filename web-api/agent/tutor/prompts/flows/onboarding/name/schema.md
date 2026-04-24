```json
{
  "type": "object",
  "required": ["name", "greeting"],
  "properties": {
    "name": {
      "type": ["string", "null"],
      "description": "The learner's extracted name, or null if none could be extracted from the reply."
    },
    "greeting": {
      "type": "string",
      "description": "One short line to display on the next step, e.g. 'ahlan ya Salma!' — uses the extracted name when available, otherwise a neutral address."
    }
  },
  "additionalProperties": false
}
```
