# SUT: opencode headless contra un commit pinneado, en sandbox

El SUT es `opencode run` no-interactivo (el mismo harness donde viven los skills reales), ejecutado en un `HOME`/config temporal por Caso, con los skills copiados desde un commit pinneado de desy-skills. Consideramos la API/SDK de opencode (más determinista pero probablemente inexistente) y correr contra la instalación real de skills (rompe la reproducibilidad y contamina el entorno). Elegimos `opencode run` porque reproduce el uso real —los skills se invocan por matcheo de `description`— y sigue siendo automatizable.

Modelo fijo: `deepinfra/deepseek-ai/DeepSeek-V4.1-Flash`.
