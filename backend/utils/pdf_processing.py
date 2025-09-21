from pypdf import PdfReader
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extract text from a PDF file.
    
    Args:
        pdf_path (str): Path to the PDF file
        
    Returns:
        str: Extracted text from the PDF
    """
    try:
        text = ""
        reader = PdfReader(pdf_path)
        logger.info(f"Processing PDF with {len(reader.pages)} pages")
        
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                text += page_text
            else:
                logger.warning(f"Page {i+1} contains no text or failed to extract")
                
        logger.info(f"Successfully extracted {len(text)} characters from PDF")
        return text
    except FileNotFoundError:
        logger.error(f"PDF file not found: {pdf_path}")
        return ""
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {e}")
        return ""