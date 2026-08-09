package notification

import "strings"

// RenderTemplate replaces {{key}} placeholders in tmpl with values from vars.
// An empty tmpl, or any placeholder left unresolved after substitution, falls
// back to defaultValue.
func RenderTemplate(tmpl string, vars map[string]string, defaultValue string) string {
	if tmpl == "" {
		return defaultValue
	}
	result := tmpl
	for key, value := range vars {
		result = strings.ReplaceAll(result, "{{"+key+"}}", value)
	}
	for {
		start := strings.Index(result, "{{")
		if start < 0 {
			break
		}
		end := strings.Index(result[start:], "}}")
		if end < 0 {
			break
		}
		end += start + 2
		result = result[:start] + defaultValue + result[end:]
	}
	return result
}
