import { 
  getNoteTableFromStorage, getNoteFromTable, modifyNoteFavorited 
} from "../backend/NoteTable.js";

import {
  getProjectTableFromStorage, getProjectFromTable,
} from "../backend/ProjectTable.js"

window.addEventListener("DOMContentLoaded", init);
const filteredTags = [];

/**
 * Creates HTML element based on the note object and returns it.
 * @param {*} noteObject noteObject to create the HTML off of.
 * @returns a noteObject, or an empty div if it's being passed over.
 */
function createNoteElement(noteObject) {
  let relevantTag = false;
  noteObject.tags.forEach(tag => {
    filteredTags.forEach(otherTag => {
      if(tag === otherTag)
        relevantTag = true;
    });
  });

  if(filteredTags.length > 0 && !relevantTag)
    return document.createElement("div"); 
  
  const noteContainerMain = document.createElement("span");
  noteContainerMain.className = "note-wrapper";

  //Note Container that is an anchor to another page. 
  const noteContainer = document.createElement("div");
  //noteContainer.href = "../library/library.html";
  noteContainer.className = "note";

  //append note container to wrapper container. 
  noteContainerMain.appendChild(noteContainer);
  
  // Create a header
  const headerElement = document.createElement('header');
  noteContainer.appendChild(headerElement);

  // Create a container for the content (text, date, and lastEdited)
  const contentContainer = document.createElement('a');
  contentContainer.classList.add('content-container');
  contentContainer.href="../note/view-note.html" + "#" + noteObject.noteID;
  noteContainer.appendChild(contentContainer);

  // Create a date container
  const dateContainer = document.createElement('div');
  dateContainer.classList.add('dates');
  contentContainer.appendChild(dateContainer);

  // Title of note
  const titleElement = document.createElement('h2');
  const linkElement = document.createElement('a');
  linkElement.href = "../note/view-note.html" + "#" + noteObject.noteID;
  linkElement.textContent = noteObject.title;
  titleElement.appendChild(linkElement);
  headerElement.appendChild(titleElement);

  // Call the function getFormattedDate()
  const date = getFormattedDate(noteObject.date);
  const lastEdited = getFormattedDate(noteObject.lastEdited);

  // Date Started of note
  const dateElement = document.createElement('p');
  dateElement.textContent = `Started ${date}`;
  dateContainer.appendChild(dateElement);

  // Last Edited of note
  const lastEditedElement = document.createElement('p');
  lastEditedElement.textContent = `Worked on: ${lastEdited}`;
  dateContainer.appendChild(lastEditedElement);

  // Text of note
  const textElement = document.createElement('p');
  textElement.id = 'note-text';
  let newText = unparseMarkdown(noteObject.text);
  textElement.textContent = newText;
  contentContainer.appendChild(textElement);

  // Create a tags-project container
  const tagsProjectContainer = document.createElement('div');
  tagsProjectContainer.classList.add('tags-project');
  headerElement.appendChild(tagsProjectContainer);

  // Add each tag separately
  noteObject.tags.forEach(tag => {
    const tagElement = document.createElement('span');
    tagElement.textContent = tag;
    if(filteredTags.indexOf(tag) != -1)
      tagElement.setAttribute("filtered", true);
    else
      tagElement.setAttribute("filtered", false)

    tagElement.addEventListener("click", () => filterByTag(tag));

    tagsProjectContainer.appendChild(tagElement);
  });
  
  // Add line separating the tags and projects
  if(noteObject.linkedProject != "") {
    const verticalLine = document.createElement('div');
    verticalLine.id = 'vertical-line';
    tagsProjectContainer.appendChild(verticalLine);

    const projectElement = document.createElement('span');
    const linkProjectElement = document.createElement('a');
    linkProjectElement.href="../project/view-project.html" + "#" + noteObject.linkedProject;

    const project = getProjectFromTable(noteObject.linkedProject)
    linkProjectElement.textContent = project.title; 
    projectElement.appendChild(linkProjectElement);
    tagsProjectContainer.appendChild(projectElement);
  };

  //Favorite button of the note. 
  let favorited = noteObject.favorited;

  const button = document.createElement("button");
  button.dataset.noteID = noteObject.noteID;
  button.dataset.favorited = noteObject.favorited;
  if (favorited == true) {
   button.innerText = "Favorited";
   button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width="24" height="24"><path d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z"/></svg>`;
  }
  else {
    button.innerText = "Note Favorited"; 
    button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width="24" height="24" opacity = "0.2"><path d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z"/></svg>`;
  }

  button.className = "favorite-button";
  button.onclick = () => toggleFavorite(button);

  //Append favorite button to the wrapper container. 
  headerElement.appendChild(button);

  return noteContainerMain;
}

const favoriteContainer = document.createElement("div");
const favorite = document.getElementById("favorites");
favorite.appendChild(favoriteContainer);
favoriteContainer.id = "favoritesContainer";

/**
 * Initializes favorites page
 */
function init() {
  
  // Get notes from local storage
  const noteTable = getNoteTableFromStorage();

  // Load notes under recent section
  let loadedNotes = [];

  for (const[key, value] of Object.entries(noteTable)) {
    loadedNotes.push(value);
  }

  loadedNotes.sort((a,b) => new Date(b.lastEdited) - new Date(a.lastEdited));

  for (const note of loadedNotes) {
    if (note.favorited === true) {
      const noteElement = createNoteElement(note);
      favoriteContainer.appendChild(noteElement);
    }
  }

  // No notes in storage - default message
  if (Object.keys(noteTable).length === 0) {
    const noNotesCase = document.createElement('div');
    noNotesCase.classList.add('noNotesCase');
    noNotesCase.textContent = "You have no notes. Click on 'Add new' to get started!";
    favoriteContainer.appendChild(noNotesCase);
    return;
  }

  // No favorited notes - default message
  if (favoriteContainer.children.length === 0) {
    const noFavoritesCase = document.createElement('div');
    noFavoritesCase.classList.add('noNotesCase');
    noFavoritesCase.textContent = "You haven't favorited notes. Click on the star icon next to a note to add it to your favorites!";
    favoriteContainer.appendChild(noFavoritesCase);
  }
}

/**
 * Resets favorites container by removing all notes
 */
function reset() {
  const favoriteContainer = document.getElementById('favoritesContainer');
  while (favoriteContainer.firstChild) {
    favoriteContainer.removeChild(favoriteContainer.firstChild);
  }
}

/**
 * Function to change favorite button from highlighted to note highlighted. 
 * @param {Element} button HTML button element for favoriting
 */
function toggleFavorite(button){
  const noteID = button.dataset.noteID;
  const note = getNoteFromTable(noteID);

  if(note) {
    const newFavoritedStatus = !note.favorited;

    modifyNoteFavorited(noteID, newFavoritedStatus);
    if (newFavoritedStatus) {
      button.innerText = 'Favorited';
      button.dataset.favorited = newFavoritedStatus;
    } else {
      button.innerText = 'Not Favorited';
      button.dataset.favorited = newFavoritedStatus;
      button.style.backgroundColor = ''; // Revert to default or another style
    }
  }
  reset();
  init();
}

/**
 * adds a tag to filteredTags[] and reloads the notes based on it.
 * @param {*} tag 
 */
function filterByTag(tag) {
  let idx = filteredTags.indexOf(tag);
  if (idx == -1)
    filteredTags.push(tag);
  else
    filteredTags.splice(idx, 1);
  reset();
  init();
};

/**
  * Takes in a date string and converts it to the format Month Day with the corresponding suffix
  * @param {string}  dateString string in the format YYYY-MM-DD
  * @return {string} a string in the correct format
  */
function getFormattedDate(dateString) {
  if (dateString == "") {
    return "";
  }

  const months = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

  const [year, month, day] = dateString.split("-");

  const monthName = months[parseInt(month, 10) - 1];

  const dayInt = parseInt(day, 10);
  const suffix = (dayInt === 1 || dayInt === 21 || dayInt === 31) ? "st" :
        (dayInt === 2 || dayInt === 22) ? "nd" :
        (dayInt === 3 || dayInt === 23) ? "rd" : "th";

  return `${monthName} ${dayInt}${suffix}`;
}

/**
  * Takes in text with markdown special characters and returns them cleaned up
  * @param {String} text the markdown text
  * @return {String} newText the cleaned up text without special characters
  */
function unparseMarkdown(text) {
  const regex = /[^a-zA-Z0-9.,?!]+/g;
  const newText = text.replace(regex, ' ').trim();
  return newText
}