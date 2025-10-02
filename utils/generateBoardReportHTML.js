function generateBoardReportHTML(board) {
  let columnsHTML = board.columnDetails
    .map((column) => {
      let tasksHTML = column.taskDetails
        .map((task, i) => {
          let remarks = "";
          if (task.status === "Completed") {
            const due = new Date(task.dueDate);
            const completed = new Date(task.completedOn);
            if (completed < due) {
              remarks = `<p style="color:#22c55e;font-weight:400">Early Submission</p>`;
            } else if (completed.getTime() === due.getTime()) {
              remarks = `<p style="color:#06b6d4;font-weight:400">On-Time</p>`;
            } else {
              remarks = `<p style="color:#ef4444;font-weight:400">Late Submission</p>`;
            }
          } else {
            remarks = `<p style="color:#6b7280;font-weight:400">Pending Submission</p>`;
          }

          return `
            <tr>
              <td>${i + 1}</td>
              <td>${task.title}</td>
              <td>${task.status}</td>
              <td>${task.priority}</td>
              <td>${
                task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "-"
              }</td>
              <td>${task.assignedTo ? task.assignedTo.name : "Unassigned"}</td>
              <td>${task.assignedTo ? task.assignedTo.email : " - "}</td>
              <td>${
                task.status === "Completed"
                  ? new Date(task.completedOn).toLocaleDateString()
                  : "-"
              }</td>
              <td>${remarks}</td>
            </tr>
          `;
        })
        .join("");

      return `
        <tr>
          <th class="project-header" colspan="12">${column.columnName}</th>
        </tr>
        <tr class="task-header">
          <th>#</th>
          <th>Task</th>
          <th>Status</th>
          <th>Priority</th>
          <th>Due Date</th>
          <th>Assigned To</th>
          <th>Email</th>
          <th>Completed On</th>
          <th>Remark</th>
        </tr>
        ${tasksHTML}
      `;
    })
    .join("");

  return columnsHTML;
}

function generateFullBoardHtml(boards) {
  let boardHtml = boards
    .map((board) => {
      let colHtml = generateBoardReportHTML(board);
      return `  
        <table border="1" cellpadding="5" cellspacing="0" width="100%">
          <thead>
            <tr>
              <th class="board-header" colspan="12">Board- ${board.boardName}</th>
            </tr>
          </thead>
          <tbody>
            ${colHtml}
          </tbody>
        </table>
        <br/>
      `;
    })
    .join("");

  return `
    <html>
      <head>
        <style>
          .s-no{ padding:10px 15px
        }
          body { font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; background: #f4f7fa; margin: 20px; }
          h1 { text-align: center; margin-bottom: 20px; color: #555454ff; }
          table { border-collapse:collapse;overflow: auto; width:auto; background: #fff;box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 10px ;  margin-bottom: 40px; }
          th, td { padding: 10px 10px; border: 1px solid #ddd; text-align: left; }
          th { font-weight: 600; text-transform: uppercase;border:1px solid #f0f1f3 }
          .board-header { background:#2C3E50 linear-gradient(135deg, #32eac56c, #2C3E50); color: white; font-size: 18px; text-align: center; }
          .project-header { background: #43576bff; color: #ECF0F1; font-size: 16px; text-align: center; }
          .task-header { background: #dcdfe1ff;color: gray; font-size: 14px; }
          tbody tr:nth-child(even) td { background: #FFFFFF border: #D6DBDF }
          tBody tr:nth-child(odd) td {background: #F8F9FA border:#D6DBDF}
          td{ color:#716e6eff;}
         
        </style>
      </head>
      <body>
        ${boardHtml}
      </body>
    </html>
  `;
}

module.exports = { generateFullBoardHtml };
