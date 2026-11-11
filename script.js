const form = document.getElementById("resumeForm");
const preview = document.getElementById("resumePreview");
let selectedTemplate = "classic";

const fields = {
  name: "pName", role: "pRole", objective: "pObjective", summary: "pSummary",
  education: "pEducation", experience: "pExperience", courses: "pCourses", skills: "pSkills"
};

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}
function initials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "SE";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
function setText(id, text, fallback = "") {
  const node = document.getElementById(id);
  node.textContent = text || fallback;
}
function updatePreview() {
  Object.entries(fields).forEach(([field, target]) => {
    const defaults = {
      name: "Seu nome completo", role: "Área ou cargo desejado",
      objective: "Seu objetivo profissional aparecerá aqui.",
      summary: "Seu resumo aparecerá aqui.", education: "Sua formação aparecerá aqui.",
      experience: "Suas experiências aparecerão aqui.", courses: "Seus cursos aparecerão aqui.",
      skills: "Suas habilidades aparecerão aqui."
    };
    setText(target, val(field), defaults[field]);
  });
  setText("pInitials", initials(val("name")));
  const contact = [val("email"), val("phone"), val("city"), val("linkedin")].filter(Boolean).join("  ·  ");
  setText("pContact", contact, "E-mail · Telefone · Cidade");
  const extras = [val("languages") ? "Idiomas: " + val("languages") : "",
    val("projects") ? "Projetos: " + val("projects") : "",
    val("additional")].filter(Boolean).join("\n");
  setText("pExtras", extras, "Idiomas, projetos e informações adicionais.");
  const sectionMap = {
    secObjective: "objective", secSummary: "summary", secEducation: "education",
    secExperience: "experience", secCourses: "courses", secSkills: "skills"
  };
  Object.entries(sectionMap).forEach(([section, field]) => {
    document.getElementById(section).classList.toggle("empty", !val(field));
  });
  document.getElementById("secExtras").classList.toggle("empty", !extras);
}
form.addEventListener("input", updatePreview);

document.querySelectorAll(".template-btn").forEach(button => {
  button.addEventListener("click", () => {
    selectedTemplate = button.dataset.template;
    document.querySelectorAll(".template-btn").forEach(b => b.classList.toggle("active", b === button));
    preview.className = "resume-paper theme-" + selectedTemplate;
  });
});

function addPdfText(doc, text, x, y, maxWidth, fontSize = 10, color = [48, 60, 53], bold = false) {
  if (!text) return y;
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(String(text), maxWidth);
  const lineHeight = fontSize * 0.48;
  const pageHeight = doc.internal.pageSize.getHeight();
  lines.forEach(line => {
    if (y > pageHeight - 18) { doc.addPage(); y = 18; }
    doc.text(line, x, y);
    y += lineHeight;
  });
  return y + 1.5;
}
function addPdfSection(doc, title, content, x, y, width, accent) {
  if (!content || !content.trim()) return y;
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y > pageHeight - 30) { doc.addPage(); y = 18; }
  y += 3;
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...accent);
  doc.text(title.toUpperCase(), x, y);
  y += 2;
  doc.setDrawColor(...accent); doc.setLineWidth(.35); doc.line(x, y, x + width, y);
  return addPdfText(doc, content, x, y + 6, width, 9.5);
}
document.getElementById("downloadBtn").addEventListener("click", () => {
  const JsPDF = window.jspdf && window.jspdf.jsPDF;
  if (!JsPDF) {
    alert("Não foi possível carregar o gerador de PDF. Confira sua conexão com a internet e atualize a página.");
    return;
  }
  updatePreview();
  const button = document.getElementById("downloadBtn");
  button.disabled = true;
  button.textContent = "Preparando PDF...";
  try {
    const doc = new JsPDF({orientation:"portrait", unit:"mm", format:"a4"});
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 18, width = pageWidth - margin * 2;
    const palette = {
      classic:[38,59,99], modern:[178,91,70], executive:[42,48,64],
      minimal:[100,91,88], creative:[119,73,111], starter:[173,105,57]
    };
    const accent = palette[selectedTemplate] || palette.classic;
    let y = 22;
    const name = val("name") || "Currículo";
    y = addPdfText(doc, name, margin, y, width, 21, accent, true);
    if (val("role")) y = addPdfText(doc, val("role"), margin, y, width, 11, accent, true);
    const contact = [val("email"),val("phone"),val("city"),val("linkedin")].filter(Boolean).join("  |  ");
    if (contact) y = addPdfText(doc, contact, margin, y, width, 8.5, [105,115,108]);
    doc.setDrawColor(...accent); doc.setLineWidth(.7); doc.line(margin,y+1,pageWidth-margin,y+1); y += 7;

    const sections = [
      ["Objetivo profissional",val("objective")],
      ["Perfil profissional",val("summary")],
      ["Formação acadêmica",val("education")],
      ["Experiência profissional",val("experience")],
      ["Cursos e certificações",val("courses")],
      ["Habilidades e competências",val("skills")],
      ["Idiomas",val("languages")],
      ["Projetos e atividades complementares",val("projects")],
      ["Informações adicionais",val("additional")]
    ];
    sections.forEach(([title,content]) => { y = addPdfSection(doc,title,content,margin,y,width,accent); });
    const total = doc.getNumberOfPages();
    for(let p=1;p<=total;p++){
      doc.setPage(p); doc.setFont("helvetica","normal"); doc.setFontSize(8);
      doc.setTextColor(145,153,147);
      doc.text("Ponto Norte · Criador de currículos",margin,pageHeight-8);
      doc.text(`${p}/${total}`,pageWidth-margin,pageHeight-8,{align:"right"});
    }
    const safe = name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || "curriculo";
    doc.save(`curriculo-${safe}.pdf`);
  } catch (error) {
    console.error(error);
    alert("Ocorreu um erro ao gerar o PDF. Atualize a página e tente novamente.");
  } finally {
    button.disabled = false;
    button.innerHTML = "⇩ &nbsp; Baixar currículo em PDF";
  }
});
updatePreview();
