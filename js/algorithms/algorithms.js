/**
 * algorithms.js
 * Contains algorithm descriptions and complexity information
 */

const ALGORITHM_INFO = {
    bubble: {
        name: 'Bubble Sort',
        description: 'Bubble Sort is a simple sorting algorithm that repeatedly steps through the list, ' +
            'compares adjacent elements, and swaps them if they are in the wrong order. ' +
            'The pass through the list is repeated until the list is sorted.',
        timeComplexity: {
            best: 'O(n)', // When array is already sorted
            average: 'O(n²)',
            worst: 'O(n²)'
        },
        spaceComplexity: 'O(1)',
        stable: true,
        steps: [
            'Start at the beginning of the array',
            'Compare adjacent elements, swapping them if they are in the wrong order',
            'Continue to the end of the array',
            'If any swaps were made, repeat the process',
            'If no swaps were made, the array is sorted'
        ]
    },
    
    selection: {
        name: 'Selection Sort',
        description: 'Selection Sort divides the input list into two parts: ' +
            'the sublist of items already sorted and the sublist of items remaining to be sorted. ' +
            'It repeatedly finds the minimum element from the unsorted sublist and moves it to the end of the sorted sublist.',
        timeComplexity: {
            best: 'O(n²)',
            average: 'O(n²)',
            worst: 'O(n²)'
        },
        spaceComplexity: 'O(1)',
        stable: false,
        steps: [
            'Find the minimum value in the list',
            'Swap it with the value in the first position',
            'Repeat the steps above for the remainder of the list (starting at the second position)'
        ]
    },
    
    insertion: {
        name: 'Insertion Sort',
        description: 'Insertion Sort builds the final sorted array one item at a time. ' +
            'It is much less efficient on large lists than more advanced algorithms such as quicksort, ' +
            'heapsort, or merge sort, but has several advantages: simple implementation, efficient for small datasets, ' +
            'adaptive (efficient for datasets that are already substantially sorted), and stable.',
        timeComplexity: {
            best: 'O(n)', // When array is already sorted
            average: 'O(n²)',
            worst: 'O(n²)'
        },
        spaceComplexity: 'O(1)',
        stable: true,
        steps: [
            'Start with the second element',
            'Compare it with the elements before it and insert it in the correct position',
            'Repeat for all elements in the array'
        ]
    },
    
    merge: {
        name: 'Merge Sort',
        description: 'Merge Sort is an efficient, stable, comparison-based, divide and conquer algorithm. ' +
            'It divides the input array into two halves, recursively sorts them, and then merges the sorted halves. ' +
            'The merge step is the key operation, where the two sorted subarrays are combined into a single sorted array.',
        timeComplexity: {
            best: 'O(n log n)',
            average: 'O(n log n)',
            worst: 'O(n log n)'
        },
        spaceComplexity: 'O(n)',
        stable: true,
        steps: [
            'Divide the unsorted list into n sublists, each containing one element (a list of one element is considered sorted)',
            'Repeatedly merge sublists to produce new sorted sublists until there is only one sublist remaining'
        ]
    },
    
    quick: {
        name: 'Quick Sort',
        description: 'Quick Sort is an efficient, in-place sorting algorithm that uses a divide-and-conquer strategy. ' +
            'It works by selecting a "pivot" element from the array and partitioning the other elements into two subarrays ' +
            'according to whether they are less than or greater than the pivot. The subarrays are then recursively sorted.',
        timeComplexity: {
            best: 'O(n log n)',
            average: 'O(n log n)',
            worst: 'O(n²)', // When the array is already sorted or nearly sorted
        },
        spaceComplexity: 'O(log n)',
        stable: false,
        steps: [
            'Choose a pivot element from the array',
            'Partition the array around the pivot (elements less than the pivot go to the left, greater than go to the right)',
            'Recursively apply the above steps to the subarrays'
        ]
    },
    
    heap: {
        name: 'Heap Sort',
        description: 'Heap Sort is a comparison-based sorting algorithm that uses a binary heap data structure. ' +
            'It divides the input into a sorted and an unsorted region, and iteratively shrinks the unsorted region ' +
            'by extracting the largest element and moving it to the sorted region.',
        timeComplexity: {
            best: 'O(n log n)',
            average: 'O(n log n)',
            worst: 'O(n log n)'
        },
        spaceComplexity: 'O(1)',
        stable: false,
        steps: [
            'Build a max heap from the input data',
            'Swap the first element (maximum) with the last element',
            'Reduce the heap size by one and heapify the root',
            'Repeat steps 2-3 until the heap size is 1'
        ]
    }
};

function getAlgorithmInfo(algorithm) {
    return ALGORITHM_INFO[algorithm] || null;
}

if (typeof self !== 'undefined' && typeof window === 'undefined') {
    self.ALGORITHM_INFO = ALGORITHM_INFO;
    self.getAlgorithmInfo = getAlgorithmInfo;
}

if (typeof window !== 'undefined') {
    window.ALGORITHM_INFO = ALGORITHM_INFO;
    window.getAlgorithmInfo = getAlgorithmInfo;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ALGORITHM_INFO,
        getAlgorithmInfo
    };
} 