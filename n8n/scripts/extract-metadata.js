// items is the n8n array of input objects (each is a metadata entry)
const points = items.map((item, index) => {
  const data = item.json;
  // Create a unique id using the Filename (or any other field) and an index.
  // You can modify this to use DOI or another identifier if preferred.
  const uniqueId = `${data.Filename.replace(/\s+/g, '_')}_${index}`;
  
  // The vector field is left empty (an empty array) here as a placeholder.
  // You would normally run the embedding generation (e.g., using an API) to fill this field.
  return {
    id: uniqueId,
    vector: [],  // placeholder; should be replaced with the embedding vector later
    payload: {
      title: data.Title,
      filename: data.Filename,
      date: data.Date,
      authors: data.Authors,
      advisor: data.Advisor,
      abstract: data.Abstract,
      academicUnit: data["Academic Unit"],
      type: data.Type,
      subjectCategories: data["Subject Categories"],
      keywords: data.Keywords,
      doi: data.DOI,
      permanentLink: data["Permanent Link"],
      collections: data.Collections
    }
  };
});

return [{
  json: { points }
}];

