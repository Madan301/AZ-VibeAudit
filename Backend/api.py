from fastapi import FastAPI, HTTPException, BackgroundTasks, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
import asyncio
import os
import json
import logging
import datetime
from pathlib import Path
import base64
import time
from dataclasses import dataclass
from dotenv import load_dotenv
from langchain_openai import AzureChatOpenAI, ChatOpenAI
from pydantic import SecretStr
from browser_use.agent.service import Agent
from browser_use import Controller
from browser_use.browser.browser import Browser, BrowserConfig, BrowserContextConfig
from browser_use.browser.context import BrowserContext
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,  # Changed from INFO to DEBUG
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    force=True  # Force the configuration to be applied
)
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)  # Explicitly set logger level to DEBUG

# Load environment variables
load_dotenv()

app = FastAPI()

# Add request logging middleware
@app.middleware("http")
async def log_requests(request, call_next):
    print("="*50)
    print(f"DEBUG: Incoming request: {request.method} {request.url}")
    try:
        body = await request.body()
        print(f"DEBUG: Request body: {body.decode()}")
    except Exception as e:
        print(f"DEBUG: Could not read request body: {str(e)}")
    print("="*50)
    
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        print(f"DEBUG: Error processing request: {str(e)}")
        raise

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables to store browser and context
browser_instance = None
browser_context = None
analysis_status = {
    "is_analyzing": False,
    "current_control": None,
    "progress": 0,
    "total_controls": 0,
    "results": []
}
stop_analysis = False  # Add flag to control analysis stopping

@dataclass
class ControlResult:
    control_id: str
    description: str
    passed: bool
    screenshot_path: str
    details: str

class AnalysisRequest(BaseModel):
    benchmark_file: str
    resource_name: str

    def __str__(self):
        return f"AnalysisRequest(benchmark_file='{self.benchmark_file}', resource_name='{self.resource_name}')"

    @classmethod
    def __get_validators__(cls):
        yield cls.validate_to_json

    @classmethod
    def validate_to_json(cls, value):
        print(f"DEBUG: Validating request data: {value}")
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError as e:
                print(f"DEBUG: JSON decode error: {str(e)}")
                raise ValueError(f"Invalid JSON: {str(e)}")
        return cls(**value)

class AnalysisResponse(BaseModel):
    status: str
    message: str
    data: Optional[Dict] = None

def setup_browser():
    return Browser(
        config=BrowserConfig(
            headless=False,
            disable_security=False,
            new_context_config=BrowserContextConfig(
                disable_security=False,
                minimum_wait_page_load_time=1,
                maximum_wait_page_load_time=20,
            ),
        )
    )

def setup_llm():
    if os.getenv('OPENAI_API_KEY'):
        return ChatOpenAI(
            model='gpt-4',
            temperature=0,
        )
    elif os.getenv('AZURE_OPENAI_KEY') and os.getenv('AZURE_OPENAI_ENDPOINT'):
        return AzureChatOpenAI(
            model='gpt-4o',
            api_version='2024-10-21',
            azure_endpoint=os.getenv('AZURE_OPENAI_ENDPOINT', ''),
            api_key=SecretStr(os.getenv('AZURE_OPENAI_KEY', '')),
            temperature=0,
        )
    else:
        raise HTTPException(status_code=500, detail="No LLM API keys found")

async def analyze_control(browser: Browser, browser_context: BrowserContext, llm, control: Dict, resource_name: str, output_dir: Path) -> ControlResult:
    control_id = control.get('id', 'Unknown')
    description = control.get('description', 'No description provided')
    
    task = f"""\
    You are a security compliance agent checking Azure Security Benchmark controls.
    Current control: {control_id} - {description}
    Resource to audit: {resource_name}
    Instructions:
    1. You are already logged into https://portal.azure.com/.
    2. Navigate to the appropriate Azure service to check this control.
    3. Verify if the control requirements are met for {resource_name}.
    4. Return a JSON object with:
       - passed: boolean (true if control is met, false otherwise)
       - details: string (explain the findings)
    5. Strictly!! dont go to any other site other than the portal.azure.com
    Strictly!! Dont mention json in the start or end of the response and dont enclose the response in ```

    """
    
    try:
        logger.info(f"Analyzing control: {control_id}")
        agent = Agent(
            task=task,
            llm=llm,
            browser=browser,
            browser_context=browser_context,
            validate_output=True,
            enable_memory=True,
            tool_calling_method="function_calling"
        )
        result = await agent.run(max_steps=50)
        # Extract agent output as text

        # Pass agent output to LLM for JSON extraction
        extraction_prompt = f"""
Given the following compliance analysis result, extract a JSON object with:
- passed: boolean (true if the control is met, false otherwise)
- details: string (explain the findings)

Text:
{result}

IMPORTANT: Return ONLY the raw JSON object without any markdown formatting, backticks, or additional text.
"""
        print("extraction prompt", extraction_prompt)
        logger.debug(f"Extraction prompt: {extraction_prompt}")
        extraction_response = llm.invoke(extraction_prompt)
        # logger.debug(f"Extraction LLM response: {extraction_response}")
        # Try to parse the response as JSON
        try:
            if hasattr(extraction_response, 'content'):
                extraction_text = getattr(extraction_response, 'content', extraction_response)
            else:
                extraction_text = str(extraction_response)
            output = json.loads(extraction_text)
            print(f"Extracted JSON: {output}")
            logger.debug(f"Extracted JSON: {output}")
        except Exception as e:
            logger.error(f"Error parsing extraction LLM response as JSON: {str(e)} | Response: {extraction_response}")
            output = {"passed": False, "details": f"Could not parse LLM extraction: {str(e)} | {extraction_response}"}

        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        screenshot_path = output_dir / f"screenshot_{control_id}_{timestamp}.png"
        
        # Take screenshot using the browser context
        try:
            # Get screenshot as base64 string
            screenshot_data = await browser_context.take_screenshot(full_page=True)
            # Convert base64 to image and save
            if screenshot_data:
                image_data = base64.b64decode(screenshot_data)
                with open(screenshot_path, 'wb') as f:
                    f.write(image_data)
                logger.debug(f"Screenshot saved to: {screenshot_path}")
            else:
                logger.error("No screenshot data received")
                screenshot_path = ""
        except Exception as e:
            logger.error(f"Failed to take screenshot: {str(e)}")
            screenshot_path = ""
        
        passed = output.get('passed', False)
        details = output.get('details', 'No details provided')
        
        return ControlResult(
            control_id=control_id,
            description=description,
            passed=passed,
            screenshot_path=str(screenshot_path),
            details=details
        )
    except Exception as e:
        logger.error(f"Error analyzing control {control_id}: {str(e)}")
        return ControlResult(
            control_id=control_id,
            description=description,
            passed=False,
            screenshot_path="",
            details=f"Error during analysis: {str(e)}"
        )

@app.get("/api/browser-status")
async def get_browser_status():
    global browser_instance, browser_context
    return {
        "is_running": browser_instance is not None and browser_context is not None,
        "is_analyzing": analysis_status["is_analyzing"]
    }

@app.post("/api/launch-browser")
async def launch_browser():
    global browser_instance, browser_context
    
    try:
        if browser_instance is None:
            browser_instance = setup_browser()
            browser_context = await browser_instance.new_context()
            await browser_context.navigate_to("https://portal.azure.com/")
            return {"status": "success", "message": "Browser launched successfully"}
        else:
            return {"status": "success", "message": "Browser is already running"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/start-analysis")
async def start_analysis(
    benchmark_file: Optional[UploadFile] = File(None),
    resource_name: str = Form(...),
    controls: Optional[str] = Form(None),
    background_tasks: BackgroundTasks = None
):
    print("="*50)
    print("DEBUG: Received start_analysis request")
    print(f"DEBUG: Resource name: {resource_name}")
    print(f"DEBUG: Benchmark file: {benchmark_file.filename if benchmark_file else 'None'}")
    print(f"DEBUG: Controls: {controls}")
    print("="*50)
    
    global browser_instance, browser_context, analysis_status, stop_analysis
    
    # Reset stop flag when starting new analysis
    stop_analysis = False
    
    if browser_instance is None or browser_context is None:
        logger.error("Browser not launched when attempting to start analysis")
        raise HTTPException(status_code=400, detail="Browser not launched. Please launch browser first.")
    
    if analysis_status["is_analyzing"]:
        logger.warning("Analysis already in progress when attempting to start new analysis")
        raise HTTPException(status_code=400, detail="Analysis already in progress")
  
    try:
        # Get controls either from benchmark file or manual controls
        if benchmark_file:
            # Read benchmark file content
            logger.debug(f"Reading benchmark file content from {benchmark_file.filename}")
            content = await benchmark_file.read()
            benchmark_data = json.loads(content)
            controls = benchmark_data.get('controls', [])
        elif controls:
            # Parse manual controls
            try:
                controls = json.loads(controls)
            except json.JSONDecodeError as e:
                raise HTTPException(status_code=400, detail=f"Invalid controls format: {str(e)}")
        else:
            raise HTTPException(status_code=400, detail="Either benchmark file or controls must be provided")
        
        logger.debug(f"Successfully loaded {len(controls)} controls")
        
        # Create output directory
        output_dir = Path(f"audit_results_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}")
        output_dir.mkdir(exist_ok=True)
        logger.debug(f"Created output directory: {output_dir}")
        
        # Setup LLM
        logger.debug("Setting up LLM")
        llm = setup_llm()
        
        # Update analysis status
        analysis_status["is_analyzing"] = True
        analysis_status["total_controls"] = len(controls)
        analysis_status["progress"] = 0
        analysis_status["results"] = []
        logger.debug(f"Updated analysis status: {analysis_status}")
        
        # Start analysis in background
        logger.debug("Adding background task for analysis")
        background_tasks.add_task(
            run_analysis,
            browser_instance,
            browser_context,
            llm,
            {"controls": controls},  # Wrap controls in a dict to match benchmark_data format
            resource_name,
            output_dir
        )
        
        return {"status": "success", "message": "Analysis started"}
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in benchmark file: {str(e)}")
        analysis_status["is_analyzing"] = False
        raise HTTPException(status_code=400, detail=f"Invalid file format: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error during analysis setup: {str(e)}")
        analysis_status["is_analyzing"] = False
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analysis-status")
async def get_analysis_status():
    return analysis_status

@app.post("/api/stop-analysis")
async def stop_analysis():
    global stop_analysis, analysis_status
    logger.info("Stop analysis requested")
    stop_analysis = True
    
    # Update analysis status immediately
    analysis_status["is_analyzing"] = False
    analysis_status["current_control"] = None
    
    return {"status": "success", "message": "Stop signal sent"}

async def run_analysis(browser: Browser, browser_context: BrowserContext, llm, benchmark_data: Dict, resource_name: str, output_dir: Path):
    global analysis_status, stop_analysis
    try:
        controls = benchmark_data.get('controls', [])
        logger.debug(f"Starting analysis of {len(controls)} controls for resource: {resource_name}")
        
        for i, control in enumerate(controls):
            if stop_analysis:
                logger.info("Analysis stopped by user")
                analysis_status["is_analyzing"] = False
                analysis_status["current_control"] = None
                stop_analysis = False  # Reset the flag
                
                # Generate partial report if we have any results
                if analysis_status["results"]:
                    logger.debug("Generating partial report for stopped analysis")
                    report_path = output_dir / "audit_report_partial.pdf"
                    generate_latex_report(analysis_status["results"], str(report_path))
                    logger.debug(f"Partial report generated at: {report_path}")
                
                return
            
            control_id = control.get('id', 'Unknown')
            logger.debug(f"Analyzing control {i+1}/{len(controls)}: {control_id}")
            analysis_status["current_control"] = control_id
            
            try:
                result = await analyze_control(browser, browser_context, llm, control, resource_name, output_dir)
                logger.debug(f"Control {control_id} analysis completed. Passed: {result.passed}")
                
                analysis_status["results"].append(result)
                analysis_status["progress"] = (i + 1) / len(controls) * 100
                logger.debug(f"Analysis progress: {analysis_status['progress']}%")
            except Exception as e:
                logger.error(f"Error analyzing control {control_id}: {str(e)}")
                if stop_analysis:
                    break
        
        # Generate report
        logger.debug("Generating LaTeX report")
        report_path = output_dir / "audit_report.pdf"
        generate_latex_report(analysis_status["results"], str(report_path))
        logger.debug(f"Report generated at: {report_path}")
        
        analysis_status["is_analyzing"] = False
        analysis_status["current_control"] = None
        logger.info("Analysis completed successfully")
    except Exception as e:
        logger.error(f"Error during analysis: {str(e)}")
        analysis_status["is_analyzing"] = False
        analysis_status["current_control"] = None
        raise

def generate_latex_report(results: List[ControlResult], output_path: str):
    # Create PDF document
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=72
    )
    
    # Create styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=30
    )
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        spaceAfter=12
    )
    normal_style = styles['Normal']
    
    # Build the document content
    story = []
    
    # Title
    story.append(Paragraph("Azure Security Benchmark Audit Report", title_style))
    story.append(Paragraph(f"Generated on: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", normal_style))
    story.append(Spacer(1, 30))
    
    # Summary
    total_controls = len(results)
    passed_controls = sum(1 for r in results if r.passed)
    failed_controls = total_controls - passed_controls
    
    summary_data = [
        ["Total Controls", str(total_controls)],
        ["Passed Controls", str(passed_controls)],
        ["Failed Controls", str(failed_controls)],
        ["Pass Rate", f"{(passed_controls/total_controls)*100:.1f}%"]
    ]
    
    summary_table = Table(summary_data, colWidths=[2*inch, 2*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    story.append(Paragraph("Audit Summary", heading_style))
    story.append(summary_table)
    story.append(Spacer(1, 30))
    
    # Individual control results
    for result in results:
        story.append(Paragraph(f"Control: {result.control_id}", heading_style))
        story.append(Paragraph(f"Description: {result.description}", normal_style))
        
        # Status with color
        status_color = colors.green if result.passed else colors.red
        status_text = "PASSED" if result.passed else "FAILED"
        story.append(Paragraph(
            f"Status: <font color={status_color}>{status_text}</font>",
            normal_style
        ))
        
        story.append(Paragraph(f"Details: {result.details}", normal_style))
        story.append(Spacer(1, 12))
        
        # Add screenshot if available
        if result.screenshot_path and os.path.exists(result.screenshot_path):
            try:
                img = Image(result.screenshot_path, width=6*inch, height=4*inch)
                story.append(img)
            except Exception as e:
                story.append(Paragraph(f"Error loading screenshot: {str(e)}", normal_style))
        
        story.append(Spacer(1, 30))
    
    # Build the PDF
    doc.build(story)
    return output_path

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 