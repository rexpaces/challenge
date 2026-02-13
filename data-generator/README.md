# Work Order Data Generator

CLI tool to generate realistic sample data for the Work Order Schedule Timeline component. Uses Ollama (local LLM) to generate data and validates for overlapping work orders.

## Features

- 🤖 **LLM-powered generation** using Ollama (gemma3:12b or any model)
- 📊 **Thousands of realistic entries** for performance testing
- ✅ **Automatic overlap detection** - invalid orders filtered out
- ⚙️ **Configurable batch sizes** - adjust prompts per request
- 📁 **JSON output** - compatible with frontend and backend
- 🔍 **Detailed statistics** - see generation quality metrics

## Prerequisites

1. **Ollama** installed and running
   ```bash
   # Install from https://ollama.ai
   # Start Ollama
   ollama serve
   ```

2. **Model pulled** (in another terminal)
   ```bash
   ollama pull gemma3:12b
   ```

3. **Node.js 16+** with npm

## Installation

```bash
cd data-generator
npm install
```

## Usage

### Default (5 centers, 8 orders each)
```bash
npm run generate
```

### Predefined configurations
```bash
npm run generate:small    # 5 centers × 8 orders
npm run generate:medium   # 20 centers × 50 orders
npm run generate:large    # 100 centers × 200 orders
```

### Custom configuration
```bash
npm run generate -- --centers 50 --orders 100 --batch-size 10 --output data/big.json
```

### All options
```bash
npm run generate -- \
  --centers 30 \
  --orders 25 \
  --batch-size 5 \
  --output generated/data.json \
  --model gemma3:12b \
  --verbose
```

## Options

| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--centers` | `-c` | 5 | Number of work centers |
| `--orders` | `-o` | 20 | Work orders per center |
| `--output` | `-f` | `generated/sample-data.json` | Output file path |
| `--batch-size` | | 5 | Items per LLM prompt |
| `--model` | | `gemma3:12b` | Ollama model name |
| `--verbose` | `-v` | false | Show detailed logs |

## Output

Generated JSON file structure:
```json
{
  "metadata": {
    "generatedAt": "2025-01-15T10:30:00Z",
    "version": "1.0.0"
  },
  "data": {
    "workCenters": [...],
    "workOrders": [...],
    "stats": {
      "totalGenerated": 1000,
      "totalValid": 987,
      "totalDiscarded": 13
    }
  }
}
```

## Validation

The generator automatically filters invalid data:

- ❌ **Overlapping orders** - rejected if they overlap on same center (touching edges = overlap)
- ❌ **Invalid dates** - rejected if end date ≤ start date
- ❌ **Malformed data** - rejected if structure doesn't match schema
- ❌ **Invalid status** - rejected if status not in ['open', 'in-progress', 'complete', 'blocked']

Statistics show:
- `totalGenerated` - Total items LLM produced
- `totalValid` - Items that passed validation
- `totalDiscarded` - Items rejected (mostly overlaps)

## Troubleshooting

### "Failed to connect to Ollama"
- Ensure Ollama is running: `ollama serve`
- Check it's accessible at `http://localhost:11434`

### "Model not found"
- Pull the model: `ollama pull gemma3:12b`
- Or specify a different model: `--model llama2`

### "Invalid JSON from LLM"
- Try a different model or adjust batch size
- Use `--batch-size 3` for more stable output
- Use `--verbose` to see raw LLM responses

### Generation is slow
- Reduce `--batch-size` for faster feedback
- Use a smaller model: `--model mistral` instead of gemma3:12b
- Check CPU usage: LLM generation is CPU-intensive

## Development

### Build
```bash
npm run build
```

### Run from source
```bash
ts-node src/cli.ts --centers 10 --orders 5
```

### Project structure
```
src/
├── cli.ts                    # Entry point
├── generator/               # Generation logic
│   ├── config.ts           # Types & defaults
│   ├── data-validator.ts   # Validation & overlap detection
│   ├── work-center-generator.ts
│   ├── work-order-generator.ts
│   └── index.ts            # Main orchestrator
├── ollama/                  # LLM integration
│   ├── ollama-client.ts    # API wrapper
│   ├── prompts.ts          # Prompt templates
│   └── json-parser.ts      # Response parsing
└── output/
    └── file-writer.ts      # File I/O
```

## Performance Notes

- **Generation time**: ~1 minute for 100 centers × 20 orders = 2000 work orders
- **File size**: ~500KB for 2000 work orders
- **Memory**: ~100-200MB during generation
- **CPU**: Uses full CPU (LLM is CPU-intensive)

## Data Quality

Typical results (with gemma3:12b):
- **Acceptance rate**: 85-95% (some rejected for overlaps)
- **Overlap rate**: 5-15% (expected, validates correctly)
- **Data realism**: Good - generates realistic order names and statuses

## Future Improvements

- [ ] Support multiple output formats (CSV, parquet)
- [ ] Parallel generation for multiple centers
- [ ] Interactive CLI with progress bars
- [ ] Seed parameter for reproducible data
- [ ] Custom date range configuration
- [ ] Filter by status type distribution

## License

MIT
