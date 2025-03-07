import pandas as pd 

from bs4 import BeautifulSoup 

 

# Load the CSV file 

df = pd.read_csv('COMS-ETD-DSpace-Export.csv') 

 

def strip_html(html_text): 

    if pd.isna(html_text): 

        return "" 

    return BeautifulSoup(html_text, "html.parser").get_text() 

 

# Process each record 

def process_record(row): 

    title = row.get('dc.title', '') 

    abstract_html = row.get('dc.description.abstract', '') 

    abstract_text = strip_html(abstract_html) 

    keywords_str = row.get('dc.subject.keywords', '') 

    keywords_list = [kw.strip() for kw in keywords_str.split('||') if kw.strip()] 

    author = row.get('dc.contributor.author', '') 

    year = str(row.get('dc.date.issued', '')).strip() 

    uri = row.get('dc.identifier.uri', '') 

     

    # Compose text for embedding 

    composite_text = f"Title: {title}. Abstract: {abstract_text}. Keywords: {', '.join(keywords_list)}." 

     

    # Prepare metadata payload 

    metadata = { 

        "title": title, 

        "author": author, 

        "year": year, 

        "keywords": keywords_list, 

        "uri": uri 

    } 

    return composite_text, metadata 

 

# Example: Process the first record 

text, metadata = process_record(df.iloc[0]) 

print(text) 

print(metadata) 