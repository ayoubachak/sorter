# Enhanced Sorting Algorithm Visualizer

An interactive web-based application to visualize sorting algorithms with advanced graphics and educational features.

## Features

- **High-Performance Rendering**: Uses WebGL via Three.js for 3D visualization and fast 2D rendering
- **Multiple Visualization Modes**: 
  - Bar chart view
  - Circular visualization
  - Scatter plot view
  - 3D cube visualization
- **Real-Time Metrics**: Track comparisons, swaps, array accesses and time complexity
- **Algorithm Analysis**: Detailed information about each sorting algorithm
- **Step-by-Step Mode**: Go through sorting operations one at a time
- **Worker-Based Computation**: Prevents UI freezing during complex operations
- **Visual Effects**: Heat maps, particle effects, and animation trails
- **Responsive Design**: Works on desktop and mobile devices

## Supported Algorithms

- Bubble Sort
- Selection Sort
- Insertion Sort
- Merge Sort
- Quick Sort
- Heap Sort

## Getting Started

### Prerequisites

- A modern web browser with WebGL support (Chrome, Firefox, Safari, Edge)
- Basic understanding of sorting algorithms

### Installation

1. Clone this repository
   ```
   git clone https://github.com/yourusername/enhanced-sorting-visualizer.git
   cd enhanced-sorting-visualizer
   ```

2. Download the required libraries
   ```
   ./download-libs.sh
   ```
   
3. Open `index.html` in your web browser

## Usage

1. Select an array size using the slider
2. Click "Generate New Array" to create a random array
3. Choose a sorting algorithm from the dropdown menu
4. Click "Start Sorting" to visualize the algorithm in action
5. Use the "Pause", "Resume", and "Stop" buttons to control the visualization
6. Click "Step" to execute the algorithm one step at a time
7. Switch between different visualization modes using the view buttons

## Implementation Details

### Architecture

The application follows a modular architecture:

- **SortingEngine**: Core class that manages the sorting process
- **SortingVisualizer**: Handles visualization of sorting algorithms using different renderers
- **AlgorithmWorkerManager**: Manages Web Workers for algorithm computation
- **Renderers**: Different visualization modes (Bar, Circular, Scatter, 3D)

### Technical Highlights

- **WebGL Optimization**: Efficient rendering for large arrays (500+ elements)
- **Web Workers**: Algorithm computation happens in a separate thread
- **Canvas Fallback**: Falls back to Canvas API if WebGL is not supported
- **Modular Design**: Easy to add new algorithms and visualization modes
- **Responsive UI**: Works on various screen sizes

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Three.js for 3D rendering
- PixiJS for 2D rendering optimization
- Thanks to all the sorting algorithm pioneers! 