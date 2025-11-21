import jsPDF from 'jspdf'

// Helper function to format date
function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

// Helper function to determine if medication is active
function isActive(medication) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // Check start date
  if (medication.startDate) {
    const start = new Date(medication.startDate)
    start.setHours(0, 0, 0, 0)
    if (start > today) {
      return false // Not started yet
    }
  }
  
  // Check end date
  if (medication.endDate) {
    const end = new Date(medication.endDate)
    end.setHours(0, 0, 0, 0)
    if (end < today) {
      return false // Already ended
    }
  }
  
  return true // Active (no start date or started, and no end date or not ended)
}

// Helper function to generate conversational summary
// Format: "AMOXYCILIN 50mg. Take 1 capsule 3 times per day for tooth infection"
function generateSummary(medication) {
  // Start with medication name (uppercase) and dosage (no comma) - e.g., "AMOXYCILIN 50mg"
  const nameUpper = medication.name.toUpperCase()
  let summary = medication.dosage 
    ? `${nameUpper} ${medication.dosage}`
    : nameUpper
  
  // FORMAT: Number to take and format type
  const numberToTake = medication.numberToTake || 1
  const format = medication.format || 'pill'
  const formatLabel = format.toLowerCase()
  
  // Build the "Take X format" part - FORMAT IS REQUIRED
  let takePart = 'Take '
  if (numberToTake === 1) {
    takePart += `1 ${formatLabel}`
  } else {
    takePart += `${numberToTake} ${formatLabel}s`
  }
  
  // FREQUENCY: Times per day or specific times - FREQUENCY IS REQUIRED
  let frequencyText = ''
  if (medication.frequencyType === 'as_needed') {
    frequencyText = 'as needed'
  } else if (medication.frequencyType === 'times_per_day') {
    // TIMES PER DAY IS REQUIRED
    const times = medication.timesPerDay || 1
    frequencyText = times === 1 ? 'once per day' : `${times} times per day`
  } else if (medication.frequencyType === 'specific_times') {
    const times = medication.specificTimes || []
    if (times.length === 1) {
      const time = times[0]
      // Check if it's a predefined time option
      if (time === 'morning') {
        frequencyText = 'in the morning'
      } else if (time === 'evening') {
        frequencyText = 'in the evening'
      } else if (time === 'bedtime') {
        frequencyText = 'before bedtime'
      } else if (time.match(/^\d{2}:\d{2}$/)) {
        // Specific time format HH:MM
        const [h, m] = time.split(':')
        const hour = parseInt(h)
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const displayHour = hour % 12 || 12
        frequencyText = `at ${displayHour}:${m} ${ampm}`
      } else {
        frequencyText = 'once per day' // fallback
      }
    } else if (times.length > 1) {
      // Multiple times - format them nicely
      const timeStrings = times.map(time => {
        if (time === 'morning') return 'morning'
        if (time === 'evening') return 'evening'
        if (time === 'bedtime') return 'bedtime'
        if (time.match(/^\d{2}:\d{2}$/)) {
          const [h, m] = time.split(':')
          const hour = parseInt(h)
          const ampm = hour >= 12 ? 'PM' : 'AM'
          const displayHour = hour % 12 || 12
          return `${displayHour}:${m} ${ampm}`
        }
        return time
      })
      frequencyText = `at ${timeStrings.join(', ')}`
    } else {
      frequencyText = 'once per day' // fallback
    }
  } else {
    // Fallback if frequencyType is missing
    frequencyText = 'once per day'
  }
  
  // Frequency pattern (only if not as_needed and not every_day)
  if (medication.frequencyType !== 'as_needed' && medication.frequencyPattern && medication.frequencyPattern !== 'every_day') {
    if (medication.frequencyPattern === 'every_x_days') {
      const days = medication.everyXDays || 1
      frequencyText += ` every ${days} day${days > 1 ? 's' : ''}`
    } else if (medication.frequencyPattern === 'specific_days') {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const days = (medication.specificDays || []).map(d => dayNames[d]).join(', ')
      if (days) {
        frequencyText += ` on ${days}`
      }
    }
  }
  
  // Combine take instruction with frequency - BOTH ARE REQUIRED
  takePart += ` ${frequencyText}`
  
  // Add take instruction to summary
  summary += `. ${takePart}`
  
  // INDICATION: Add indication if present - INDICATION IS OPTIONAL
  if (medication.indication && medication.indication.trim()) {
    summary += ` for ${medication.indication.trim()}`
  }
  
  // Add period after indication (or after frequency if no indication)
  summary += '.'
  
  // NOTES: Add notes if present - NOTES IS OPTIONAL
  // Add notes immediately following the description on the same line
  if (medication.notes && medication.notes.trim()) {
    summary += ` ${medication.notes.trim()}`
  }
  
  return summary
}

export function generateMedicationPDF(medications, groupName = null) {
  // Create PDF in landscape mode
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  })
  
  // Set up fonts and colors
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 15
  const startY = margin
  let currentY = startY
  
  // Title - include group name if provided and not default
  pdf.setFontSize(18)
  pdf.setFont(undefined, 'bold')
  const title = groupName && groupName !== 'My Medications' 
    ? `Medication List - ${groupName}`
    : 'Medication List'
  pdf.text(title, margin, currentY)
  currentY += 10
  
  // Date generated
  pdf.setFontSize(10)
  pdf.setFont(undefined, 'normal')
  pdf.setTextColor(100, 100, 100)
  pdf.text(`Generated: ${new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}`, margin, currentY)
  currentY += 8
  
  // Table headers
  pdf.setFontSize(11)
  pdf.setFont(undefined, 'bold')
  pdf.setTextColor(0, 0, 0)
  
  const colWidths = {
    summary: (pageWidth - 2 * margin) * 0.5, // 50% for summary
    startDate: (pageWidth - 2 * margin) * 0.15, // 15% for start date
    endDate: (pageWidth - 2 * margin) * 0.15,   // 15% for end date
    active: (pageWidth - 2 * margin) * 0.2       // 20% for active
  }
  
  const colX = {
    summary: margin,
    startDate: margin + colWidths.summary,
    endDate: margin + colWidths.summary + colWidths.startDate,
    active: margin + colWidths.summary + colWidths.startDate + colWidths.endDate
  }
  
  // Draw header row background
  pdf.setFillColor(59, 130, 246) // indigo-500
  pdf.rect(margin, currentY - 5, pageWidth - 2 * margin, 8, 'F')
  
  // Header text (white)
  pdf.setTextColor(255, 255, 255)
  pdf.text('Summary', colX.summary + 2, currentY)
  pdf.text('Start Date', colX.startDate + 2, currentY)
  pdf.text('End Date', colX.endDate + 2, currentY)
  pdf.text('Active', colX.active + 2, currentY)
  
  currentY += 10
  
  // Draw header underline
  pdf.setDrawColor(200, 200, 200)
  pdf.line(margin, currentY - 2, pageWidth - margin, currentY - 2)
  
  // Reset text color
  pdf.setTextColor(0, 0, 0)
  
  // Medication rows
  pdf.setFontSize(10)
  pdf.setFont(undefined, 'normal')
  
  medications.forEach((medication, index) => {
    // Check if we need a new page
    if (currentY > pageHeight - 20) {
      pdf.addPage()
      currentY = margin
      
      // Redraw header on new page
      pdf.setFontSize(11)
      pdf.setFont(undefined, 'bold')
      pdf.setFillColor(59, 130, 246)
      pdf.rect(margin, currentY - 5, pageWidth - 2 * margin, 8, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.text('Summary', colX.summary + 2, currentY)
      pdf.text('Start Date', colX.startDate + 2, currentY)
      pdf.text('End Date', colX.endDate + 2, currentY)
      pdf.text('Active', colX.active + 2, currentY)
      currentY += 10
      pdf.setDrawColor(200, 200, 200)
      pdf.line(margin, currentY - 2, pageWidth - margin, currentY - 2)
      pdf.setTextColor(0, 0, 0)
      pdf.setFontSize(10)
      pdf.setFont(undefined, 'normal')
    }
    
    const summary = generateSummary(medication)
    const startDate = formatDate(medication.startDate) || ''
    const endDate = formatDate(medication.endDate) || ''
    const active = isActive(medication) ? 'Yes' : 'No'
    
    // Split summary text if too long
    const maxWidth = colWidths.summary - 4
    
    // Render the summary with name/dosage in BOLD and UPPERCASE, rest in normal font
    // All on the same line(s) - the summary may wrap to multiple lines
    const nameWithDosage = medication.dosage 
      ? `${medication.name.toUpperCase()} ${medication.dosage}`
      : medication.name.toUpperCase()
    
    // Find where name/dosage ends (after the period and space)
    const nameEndMarker = nameWithDosage + '. '
    const nameEndIndex = summary.indexOf(nameEndMarker)
    
    let totalLines = 0
    let rowHeight = 8
    
    if (nameEndIndex >= 0) {
      // Name and dosage part (BOLD, uppercase) - includes the period
      const namePart = summary.substring(0, nameEndIndex + nameWithDosage.length + 1) // Include the period
      const restPart = summary.substring(nameEndIndex + nameWithDosage.length + 2) // Skip ". "
      
      // Split both parts to handle wrapping
      const nameLines = pdf.splitTextToSize(namePart, maxWidth)
      const restLines = restPart ? pdf.splitTextToSize(restPart, maxWidth) : []
      
      // Calculate total lines needed
      totalLines = nameLines.length + restLines.length
      rowHeight = Math.max(8, totalLines * 5 + 2)
    } else {
      // Fallback: use full summary
      const summaryLines = pdf.splitTextToSize(summary, maxWidth)
      totalLines = summaryLines.length
      rowHeight = Math.max(8, totalLines * 5 + 2)
    }
    
    const rowStartY = currentY - 5
    
    // Alternating row background (white and light grey) - draw with correct height
    if (index % 2 === 1) {
      pdf.setFillColor(245, 245, 245) // light grey
      pdf.rect(margin, rowStartY, pageWidth - 2 * margin, rowHeight, 'F')
    } else {
      pdf.setFillColor(255, 255, 255) // white
      pdf.rect(margin, rowStartY, pageWidth - 2 * margin, rowHeight, 'F')
    }
    
    // Render the summary text - name/dosage in bold, rest in normal, all flowing continuously on same line
    if (nameEndIndex >= 0) {
      const namePart = summary.substring(0, nameEndIndex + nameWithDosage.length + 1) // "AMOXYCILIN 50mg."
      const restPart = summary.substring(nameEndIndex + nameWithDosage.length + 2) // "Take 1 capsule..."
      const splitPoint = nameEndIndex + nameWithDosage.length + 1 // Position after the period
      
      // Split the full summary to see how it wraps naturally
      const fullSummaryLines = pdf.splitTextToSize(summary, maxWidth)
      
      let currentLineY = currentY
      let summaryPos = 0
      
      for (let i = 0; i < fullSummaryLines.length; i++) {
        const line = fullSummaryLines[i]
        const lineStartPos = summaryPos
        const lineEndPos = summaryPos + line.length
        
        // Check if this line crosses the split point (contains both name and rest)
        if (lineStartPos < splitPoint && lineEndPos > splitPoint) {
          // This line contains both parts - render name part, then continue with rest on same line
          const namePartInLine = summary.substring(lineStartPos, splitPoint + 1) // Include the period: "AMOXYCILIN 50mg."
          const restPartInLine = summary.substring(splitPoint + 1, lineEndPos) // Start from space after period: " Take 1 capsule..."
          
          // Render name part (bold)
          pdf.setFont(undefined, 'bold')
          pdf.text(namePartInLine, colX.summary + 2, currentLineY)
          
          // Calculate X position where name ends - must use bold font for accurate width
          pdf.setFont(undefined, 'bold')
          const nameWidth = pdf.getTextWidth(namePartInLine)
          
          // Render rest part (normal) continuing on the same line
          // Don't trim - we want to preserve the exact text including any leading space
          if (restPartInLine) {
            pdf.setFont(undefined, 'normal')
            // Position right after the name part ends
            pdf.text(restPartInLine, colX.summary + 2 + nameWidth, currentLineY)
          }
        } else if (lineEndPos <= splitPoint) {
          // This line is entirely name part
          pdf.setFont(undefined, 'bold')
          pdf.text(line, colX.summary + 2, currentLineY)
        } else {
          // This line is entirely rest part
          pdf.setFont(undefined, 'normal')
          pdf.text(line, colX.summary + 2, currentLineY)
        }
        
        summaryPos = lineEndPos
        currentLineY += 5
      }
    } else {
      // Fallback: render entire summary in bold if we can't find the split point
      pdf.setFont(undefined, 'bold')
      const summaryLines = pdf.splitTextToSize(summary, maxWidth)
      pdf.text(summaryLines, colX.summary + 2, currentY)
    }
    
    // Start Date
    pdf.setFont(undefined, 'normal')
    pdf.text(startDate, colX.startDate + 2, currentY)
    
    // End Date
    pdf.text(endDate, colX.endDate + 2, currentY)
    
    // Active
    pdf.setFont(undefined, 'bold')
    if (active === 'Yes') {
      pdf.setTextColor(16, 185, 129) // green
    } else {
      pdf.setTextColor(239, 68, 68) // red
    }
    pdf.text(active, colX.active + 2, currentY)
    pdf.setTextColor(0, 0, 0) // Reset to black
    
    currentY += rowHeight
  })
  
  // Save PDF
  const filename = `medication-list-${new Date().toISOString().split('T')[0]}.pdf`
  pdf.save(filename)
}

