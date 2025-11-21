import jsPDF from 'jspdf'

export function generateThanksgivingChecklistPDF(items) {
  // Create PDF in portrait mode
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })
  
  // Set up fonts and colors
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 15
  const startY = margin
  let currentY = startY
  
  // Title
  pdf.setFontSize(20)
  pdf.setFont(undefined, 'bold')
  pdf.setTextColor(0, 0, 0)
  pdf.text('Thanksgiving Checklist', margin, currentY)
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
  currentY += 12
  
  // Table setup
  const colWidths = {
    item: (pageWidth - 2 * margin) * 0.6, // 60% for item
    volunteer: (pageWidth - 2 * margin) * 0.4 // 40% for contributor
  }
  
  const colX = {
    item: margin,
    volunteer: margin + colWidths.item
  }
  
  // Draw header row background
  pdf.setFillColor(59, 130, 246) // blue-500
  pdf.rect(margin, currentY - 5, pageWidth - 2 * margin, 8, 'F')
  
  // Header text (white)
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(11)
  pdf.setFont(undefined, 'bold')
  pdf.text('Item', colX.item + 2, currentY)
  pdf.text('Contributor', colX.volunteer + 2, currentY)
  
  currentY += 10
  
  // Table rows
  pdf.setTextColor(0, 0, 0)
  pdf.setFontSize(10)
  pdf.setFont(undefined, 'normal')
  
  const rowHeight = 8
  
  // Sort items alphabetically by item name
  const sortedItems = [...items].sort((a, b) => {
    const itemA = (a.item || '').toLowerCase()
    const itemB = (b.item || '').toLowerCase()
    return itemA.localeCompare(itemB)
  })
  
  sortedItems.forEach((item, index) => {
    // Check if we need a new page
    if (currentY + rowHeight > pageHeight - margin) {
      pdf.addPage()
      currentY = margin
      
      // Redraw header on new page
      pdf.setFillColor(59, 130, 246)
      pdf.rect(margin, currentY - 5, pageWidth - 2 * margin, 8, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(11)
      pdf.setFont(undefined, 'bold')
      pdf.text('Item', colX.item + 2, currentY)
      pdf.text('Contributor', colX.volunteer + 2, currentY)
      currentY += 10
      pdf.setTextColor(0, 0, 0)
      pdf.setFontSize(10)
      pdf.setFont(undefined, 'normal')
    }
    
    // Alternate row background color
    if (index % 2 === 0) {
      pdf.setFillColor(249, 250, 251) // gray-50
      pdf.rect(margin, currentY - 5, pageWidth - 2 * margin, rowHeight, 'F')
    }
    
    // Item name
    pdf.setFont(undefined, 'bold')
    const itemText = item.item || ''
    const itemLines = pdf.splitTextToSize(itemText, colWidths.item - 4)
    pdf.text(itemLines, colX.item + 2, currentY)
    
    // Contributor name
    pdf.setFont(undefined, 'normal')
    const volunteerText = item.volunteer || 'Unassigned'
    const volunteerLines = pdf.splitTextToSize(volunteerText, colWidths.volunteer - 4)
    pdf.text(volunteerLines, colX.volunteer + 2, currentY)
    
    // Move to next row (use max height of both columns)
    const maxLines = Math.max(itemLines.length, volunteerLines.length)
    currentY += (maxLines * 5) + 3 // 5mm per line + 3mm spacing
  })
  
  // Add second page grouped by contributor
  pdf.addPage()
  currentY = margin
  
  // Title for second page
  pdf.setFontSize(20)
  pdf.setFont(undefined, 'bold')
  pdf.setTextColor(0, 0, 0)
  pdf.text('Thanksgiving Checklist - By Contributor', margin, currentY)
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
  currentY += 12
  
  // Group items by contributor
  const itemsByVolunteer = {}
  const unassignedItems = []
  
  sortedItems.forEach(item => {
    const volunteer = item.volunteer?.trim() || null
    if (volunteer) {
      if (!itemsByVolunteer[volunteer]) {
        itemsByVolunteer[volunteer] = []
      }
      itemsByVolunteer[volunteer].push(item)
    } else {
      unassignedItems.push(item)
    }
  })
  
  // Sort contributors alphabetically
  const sortedVolunteers = Object.keys(itemsByVolunteer).sort((a, b) => 
    a.toLowerCase().localeCompare(b.toLowerCase())
  )
  
  // Render each contributor group
  sortedVolunteers.forEach(volunteer => {
    const volunteerItems = itemsByVolunteer[volunteer]
    
    // Check if we need a new page
    if (currentY + 15 > pageHeight - margin) {
      pdf.addPage()
      currentY = margin
    }
    
    // Contributor header
    pdf.setFontSize(14)
    pdf.setFont(undefined, 'bold')
    pdf.setTextColor(59, 130, 246) // blue-500
    pdf.text(volunteer, margin, currentY)
    currentY += 8
    
    // List items for this contributor
    pdf.setFontSize(10)
    pdf.setFont(undefined, 'normal')
    pdf.setTextColor(0, 0, 0)
    
    volunteerItems.forEach((item, index) => {
      // Check if we need a new page
      if (currentY + 8 > pageHeight - margin) {
        pdf.addPage()
        currentY = margin
      }
      
      const itemText = `• ${item.item || ''}`
      const itemLines = pdf.splitTextToSize(itemText, pageWidth - 2 * margin - 10)
      pdf.text(itemLines, margin + 5, currentY)
      
      const maxLines = itemLines.length
      currentY += (maxLines * 5) + 2 // 5mm per line + 2mm spacing
    })
    
    currentY += 5 // Extra space between contributor groups
  })
  
  // Render unassigned items at the end
  if (unassignedItems.length > 0) {
    // Check if we need a new page
    if (currentY + 15 > pageHeight - margin) {
      pdf.addPage()
      currentY = margin
    }
    
    // Unassigned header
    pdf.setFontSize(14)
    pdf.setFont(undefined, 'bold')
    pdf.setTextColor(156, 163, 175) // gray-400
    pdf.text('Unassigned', margin, currentY)
    currentY += 8
    
    // List unassigned items
    pdf.setFontSize(10)
    pdf.setFont(undefined, 'normal')
    pdf.setTextColor(0, 0, 0)
    
    unassignedItems.forEach((item) => {
      // Check if we need a new page
      if (currentY + 8 > pageHeight - margin) {
        pdf.addPage()
        currentY = margin
      }
      
      const itemText = `• ${item.item || ''}`
      const itemLines = pdf.splitTextToSize(itemText, pageWidth - 2 * margin - 10)
      pdf.text(itemLines, margin + 5, currentY)
      
      const maxLines = itemLines.length
      currentY += (maxLines * 5) + 2 // 5mm per line + 2mm spacing
    })
  }
  
  // Save the PDF
  pdf.save('thanksgiving-checklist.pdf')
}

