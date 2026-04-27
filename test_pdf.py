import os
import sys

# Add backend to path
sys.path.append(os.path.abspath('backend'))

from backend.app.services.pdf_service import generate_chronology_pdf

data = {
    'patient': {'name': 'Test Patient', 'dob': '1980-01-01'},
    'case': {'case_reference': 'TEST-123'},
    'events': [
        {'date': '2023-01-01', 'event_type': 'Initial Visit', 'description': 'Patient presented with back pain.', 'source_file': 'test.pdf'},
        {'date': '2023-01-05', 'event_type': 'Imaging', 'description': 'MRI of lumbar spine.', 'source_file': 'test.pdf'}
    ],
    'diagnostics': [
        {'date': '2023-01-05', 'test_name': 'MRI Lumbar Spine', 'findings': 'L4-L5 disc herniation.', 'clinical_significance': 'Explains patient pain.'}
    ],
    'treatments': [
        {'date': '2023-01-10', 'provider': 'Dr. Smith', 'treatment': 'Physical Therapy', 'notes': 'Started 6-week course.'}
    ],
    'flags': [
        {'severity': 'High', 'type': 'Surgical Candidate', 'description': 'Patient may need discectomy if PT fails.', 'source_file': 'test.pdf'},
        {'severity': 'Medium', 'type': 'Pain Medication', 'description': 'Prescribed Oxycodone 5mg.', 'source_file': 'test.pdf'}
    ],
    'files': [{'file_name': 'test.pdf', 'file_type': 'application/pdf', 'uploaded_at': '2023-01-01'}],
    'past_history': 'No significant past history.'
}

output_path = 'test_report.pdf'
generate_chronology_pdf(data, output_path)

if os.path.exists(output_path):
    print(f"Success: {output_path} generated. Size: {os.path.getsize(output_path)} bytes")
else:
    print("Failure: PDF not generated.")
    html_path = output_path.replace('.pdf', '.html')
    if os.path.exists(html_path):
        print(f"Fallback HTML generated: {html_path}")
