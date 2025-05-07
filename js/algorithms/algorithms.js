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
    },
    
    shell: {
        name: 'Shell Sort',
        description: 'Shell Sort is an in-place comparison sort that generalizes insertion sort by ' +
            'allowing the exchange of items that are far apart. The method starts by sorting pairs of elements ' +
            'far apart from each other, then progressively reducing the gap between elements to be compared.',
        timeComplexity: {
            best: 'O(n log n)',
            average: 'O(n log² n)',
            worst: 'O(n²)'
        },
        spaceComplexity: 'O(1)',
        stable: false,
        steps: [
            'Define a sequence of gaps',
            'Sort elements that are the gap distance apart using insertion sort',
            'Reduce the gap and repeat until the gap is 1',
            'When the gap is 1, perform a standard insertion sort'
        ]
    },
    
    radix: {
        name: 'Radix Sort',
        description: 'Radix Sort is a non-comparative integer sorting algorithm that sorts data with integer keys ' +
            'by grouping keys by their individual digits which share the same significant position and value. ' +
            'It processes the digits position by position, either starting from the least significant digit (LSD) ' +
            'or the most significant digit (MSD).',
        timeComplexity: {
            best: 'O(nk)',  // where k is the number of digits
            average: 'O(nk)',
            worst: 'O(nk)'
        },
        spaceComplexity: 'O(n+k)',
        stable: true,
        steps: [
            'Find the maximum number to know the number of digits',
            'For each digit position, create 10 buckets (for digits 0-9)',
            'Place each number in its corresponding bucket according to the current digit',
            'Collect the numbers in order of the buckets',
            'Repeat the process for each digit position'
        ]
    },
    
    counting: {
        name: 'Counting Sort',
        description: 'Counting Sort is an integer sorting algorithm that operates by counting the number of objects ' +
            'that have each distinct key value, and using arithmetic to determine the positions of each key value in ' +
            'the output sequence. It is efficient when the range of input values is not significantly greater than the ' +
            'number of elements to be sorted.',
        timeComplexity: {
            best: 'O(n+k)',  // where k is the range of input
            average: 'O(n+k)',
            worst: 'O(n+k)'
        },
        spaceComplexity: 'O(n+k)',
        stable: true,
        steps: [
            'Find the range of input values',
            'Create a counting array of size equal to the range',
            'Count occurrences of each element in the input array',
            'Modify the counting array to store cumulative sum',
            'Build the output array using the counting array'
        ]
    },
    
    tim: {
        name: 'Tim Sort',
        description: 'Tim Sort is a hybrid stable sorting algorithm derived from merge sort and insertion sort. ' +
            'It was designed for efficiency on real-world data and is used as the default sorting algorithm in ' +
            'Python and other programming languages. It works by first dividing the array into small chunks, ' +
            'sorting them using insertion sort, and then merging the sorted chunks using a merge sort approach.',
        timeComplexity: {
            best: 'O(n)',
            average: 'O(n log n)',
            worst: 'O(n log n)'
        },
        spaceComplexity: 'O(n)',
        stable: true,
        steps: [
            'Divide the array into small runs (typically 32 or 64 elements)',
            'Sort each run using insertion sort',
            'Merge the sorted runs using a modified merge sort',
            'Use techniques like galloping mode to skip over large parts of already sorted arrays'
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