// ExtendScript executed by Premiere Pro.
function findImportedItem(parent, name) {
  for (var i = 0; i < parent.children.numItems; i++) {
    var item = parent.children[i];
    if (item && item.name === name) return item;
    if (item && item.type === ProjectItemType.BIN) {
      var nested = findImportedItem(item, name);
      if (nested) return nested;
    }
  }
  return null;
}

function importToBin(filePath) {
  try {
    if (!app.project) return "No project is open.";
    return app.project.importFiles([filePath], true, app.project.rootItem, false) ? "true" : "Premiere rejected the file.";
  } catch (error) { return "Error: " + error.message; }
}

function importAndAddToTimeline(filePath) {
  try {
    var project = app.project;
    if (!project) return "No project is open.";
    var sequence = project.activeSequence;
    if (!sequence) return "No active sequence. Open or create a sequence first.";
    if (sequence.videoTracks.numTracks < 1) return "The active sequence has no video track.";
    if (!project.importFiles([filePath], true, project.rootItem, false)) return "Premiere rejected the file.";
    var parts = filePath.replace(/\\/g, "/").split("/");
    var clip = findImportedItem(project.rootItem, parts[parts.length - 1]);
    if (!clip) return "The imported project item could not be located.";
    var insertTime = new Time(); insertTime.seconds = 0;
    var clips = sequence.videoTracks[0].clips;
    if (clips.numItems) insertTime = clips[clips.numItems - 1].end;
    sequence.videoTracks[0].insertClip(clip, insertTime);
    return "true";
  } catch (error) { return "Error: " + error.message + " (line " + error.line + ")"; }
}

function browseForFolder() {
  try { var folder = Folder.selectDialog("Choose download folder"); return folder ? folder.fsName : ""; }
  catch (error) { return ""; }
}

function browseForCookieFile() {
  try { var file = File.openDialog("Select a Netscape-format cookies.txt file", "*.txt"); return file ? file.fsName : ""; }
  catch (error) { return ""; }
}
