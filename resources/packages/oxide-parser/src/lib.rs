use std::collections::HashSet;
use tailwindcss_oxide::extractor::{Extracted, Extractor};
use wasm_bindgen::prelude::*;

/// Extract Tailwind CSS candidates from input and insert into HashSet.
fn extract_candidates_into_set(input: &str, unique_set: &mut HashSet<String>) {
    Extractor::new(input.as_bytes())
        .extract()
        .into_iter()
        .for_each(|x| {
            let candidate = match x {
                Extracted::Candidate(bytes) => unsafe { std::str::from_utf8_unchecked(bytes) },
                Extracted::CssVariable(bytes) => unsafe { std::str::from_utf8_unchecked(bytes) },
            };
            unique_set.insert(candidate.to_string());
        });
}

/// Convert HashSet of candidates to JavaScript Array.
#[inline]
fn candidates_to_js_array(candidates: HashSet<String>) -> js_sys::Array {
    let js_array = js_sys::Array::new_with_length(candidates.len() as u32);
    for (idx, candidate) in candidates.into_iter().enumerate() {
        js_array.set(idx as u32, JsValue::from(candidate));
    }
    js_array
}

/// Find Tailwind CSS candidates in the input.
/// Accepts a string or array of strings, returns unique candidates.
#[wasm_bindgen(js_name = getCandidates)]
pub fn get_candidates(input: JsValue) -> js_sys::Array {
    let mut unique_candidates = HashSet::new();

    // Handle string input
    if let Some(input_str) = input.as_string() {
        extract_candidates_into_set(&input_str, &mut unique_candidates);
        return candidates_to_js_array(unique_candidates);
    }

    // Handle array input
    if js_sys::Array::is_array(&input) {
        let array = js_sys::Array::from(&input);

        // Process each string in the array
        for i in 0..array.length() {
            if let Some(item_str) = array.get(i).as_string() {
                extract_candidates_into_set(&item_str, &mut unique_candidates);
            }
        }

        return candidates_to_js_array(unique_candidates);
    }

    // Return empty array for invalid input
    js_sys::Array::new()
}
