const firebaseConfig = {
  apiKey: "AIzaSyDYgrOWmGMBTDRYXcfW8MLuYTSRZ0T_mGo",
  authDomain: "project-27b20.firebaseapp.com",
  databaseURL: "https://project-27b20-default-rtdb.firebaseio.com",
  projectId: "project-27b20",
  storageBucket: "project-27b20.firebasestorage.app",
  messagingSenderId: "1006185548163",
  appId: "1:1006185548163:web:2578f0694da0447ae3ceb6",
};
let db;

if (typeof firebase !== "undefined") {
  firebase.initializeApp(firebaseConfig);
  db = firebase.database();
}

function displayCards(cards) {
  const container = document.getElementById("results");
  container.innerHTML = "";

  if (!cards || cards.length === 0) {
    container.innerHTML = "<p>No cards found.</p>";
    return;
  }

  cards.forEach((card) => {
    container.innerHTML += `
        <div class="card">
            <div class="card-inner">
             <img src="${card.imageUrl || "https://via.placeholder.com/200x280"}">
                <div class="overlay">
                 <button onclick="saveFavoriteFromCard('${card.name}', '${card.imageUrl || ""}')">+</button>
                </div>
            </div>
        </div>
    `;
  });
}

function saveFavoriteFromCard(name, image) {
  const newRef = db.ref("favorites").push();

  newRef.set({
    name: name,
    image: image,
  });

  alert(name + " added to favorites!");
}

function loadFavorites() {
  const container = document.getElementById("favoritesList");

  if (!container) return;

  db.ref("favorites").once("value", (snapshot) => {
    container.innerHTML = "";

    snapshot.forEach((child) => {
      const card = child.val();
      const id = child.key;

      container.innerHTML += `
                <div class="card favorite-card">

                <div class="card-inner">
                    <img src="${card.image || "https://via.placeholder.com/200x280"}">

                    <div class="overlay">
                        <button onclick="showDeckPicker('${child.key}')">+ Add to Deck
                        </button>
                        <button onclick="removeFavorite('${id}')">Remove
                        </button>
                    </div>
                </div>



                <h3>${card.name}</h3>

            </div>
            `;
    });
  });
}

loadFavorites();

function removeFavorite(id) {
  db.ref("favorites/" + id).remove().then(() => {
    loadFavorites();
  });
}

let timeout;

function searchCards() {
  const inputEl = document.getElementById("searchInput");
  if (!inputEl) return;

  const input = inputEl.value;

  fetch(`https://api.magicthegathering.io/v1/cards?name=${input}`)
    .then((res) => res.json())
    .then((data) => displayCards(data.cards || []))
    .catch((err) => console.log(err));
}

function createDeck() {
  db.ref("decks").once("value", (snapshot) => {
    const data = snapshot.val();
    const count = data ? Object.keys(data).length : 0;

    if (count >= 3) {
      alert("Max 3 decks allowed!");
      return;
    }

    const newDeck = db.ref("decks").push();
    newDeck.set({
      name: "Deck " + (count + 1),
      color: "#2a2a2a",
      cards: {}
    });

    loadDecks();
  });
}

function loadDecks() {
  const container = document.getElementById("deckList");
  

  if (!container) return;

  db.ref("decks").once("value", (snapshot) => {
    container.innerHTML = "";

    snapshot.forEach((deckSnap) => {
      const deck = deckSnap.val();
      const id = deckSnap.key;

      container.innerHTML += `
            <div class="deck-box" style="background-color: ${deck.color || "#2a2a2a"}">
                <button class="deck-delete-btn" onclick="deleteDeck('${id}')">X</button>
                <h3 onclick="openDeck('${id}')">${deck.name}</h3>
                <p>${deck.cards ? Object.keys(deck.cards).length : 0} cards</p>
                <button onclick="editDeck('${id}', '${deck.name}', '${deck.color}')">Edit
                </button>
            </div>
            `;
    });
  });
}

loadDecks();

function openDeck(deckId) {
  const view = document.getElementById("deckView");
  if (!view) return;

  db.ref("decks/" + deckId + "/cards").once("value", (snapshot) => {
    view.innerHTML = "";

    const cards = snapshot.val();

    if (!cards) {
      view.innerHTML = "<p>No cards in this deck yet.</p>";
      return;
    }

    let total = 0;
    let creatures = 0;
    let lands = 0;
    let totalCMC = 0;

    Object.keys(cards).forEach((key) => {
      const card = cards[key];

      total++;

      const type = (card.type || "").toLowerCase();

      if (type.includes("creature")) {
        creatures++;
      }

      if (type.includes("land")) {
        lands++;
      }

      totalCMC += Number(card.cmc || 0);
    });

    const avgCMC = total ? (totalCMC / total).toFixed(2) : 0;

    view.innerHTML += `
      <div class="deck-stats">
          <h3>Deck Stats</h3>
          <p>Total Cards: ${total}</p>
          <p>Creatures: ${creatures}</p>
          <p>Lands: ${lands}</p>
          <p>Avg Mana Cost: ${avgCMC}</p>
      </div>
    `;

    Object.keys(cards).forEach((key) => {
      const card = cards[key];

      view.innerHTML += `
        <div class="card">
          <img src="${card.image || card.imageUrl || "https://via.placeholder.com/200x280"}">
          <p>${card.name}</p>
          <p>${card.type || ""}</p>
          <p>${card.power ? card.power + "/" + card.toughness : ""}</p>

          <button onclick="removeCardFromDeck('${deckId}', '${key}')">Remove
          </button>
        </div>
      `;
    });

    view.innerHTML += `
      <button onclick="alert('Add cards from Favorites or Search')">
        + Add Cards
      </button>
    `;
  });
}



function deleteDeck(deckId) {
  const confirmDelete = confirm("Are you sure you want to delete this deck?");

  if (!confirmDelete) return;

  db.ref("decks/" + deckId)
    .remove()
    .then(() => {
      alert("Deck deleted!");
      loadDecks();
    })
    .catch((err) => console.log(err));
}

let selectedCard = null;

function showDeckPicker(cardId) {
    db.ref("favorites/" + cardId).once("value", (snapshot) => {
        selectedCard = snapshot.val();

        const picker = document.getElementById("deckPicker");
        const optionsDiv = document.getElementById("deckOptions");

        if (!picker || !optionsDiv) return;

        optionsDiv.innerHTML = "";

        db.ref("decks").once("value", (snapshot) => {
            snapshot.forEach((deckSnap) => {
                const deck = deckSnap.val();
                const id = deckSnap.key;

                optionsDiv.innerHTML += `
                    <button onclick="selectDeck('${id}')">
                        ${deck.name}
                    </button>
                `;
            });
        });

        picker.classList.remove("hidden");
    });
}

function addCardToDeckByID(deckId, card) {
    const cardRef = db.ref("decks/" + deckId + "/cards");

    cardRef.once("value", (snapshot) => {

        if (snapshot.numChildren() >= 20) {
            alert("Max 20 cards per deck!");
            return;
        }

        const newCard = cardRef.push();

        newCard.set({
            name: card.name,
            image: card.image || card.imageUrl || "",
            type: card.type || "",
            power: card.power || "",
            toughness: card.toughness || "",
            cmc: card.cmc || 0
        });

        alert(`${card.name} added to deck!`);
    });
}

function editDeck(deckId, currentName, currentColor) {
    const newName = prompt("Enter new deck name:", currentName);
    if (!newName) return;
    const newColor = prompt("Enter new deck color (hex code like #ff0000):", currentColor);
    if (!newColor) return;

    db.ref("decks/" + deckId).update({
        name: newName,
        color: newColor
    });

    loadDecks();
}

function selectDeck(deckId) {
  if (!selectedCard) return;

  addCardToDeckByID(deckId, selectedCard);


  closeDeckPicker();

  setTimeout(() => {
    openDeck(deckId);
  }, 300);

}

function closeDeckPicker() {
    const picker = document.getElementById("deckPicker");
    if (picker) picker.classList.add("hidden");
    selectedCard = null;
}

function removeCardFromDeck(deckId, cardId) {
    db.ref(`decks/${deckId}/cards/${cardId}`).remove()
        .then(() => {
            openDeck(deckId);
        });
}

function loadCardOfTheWeek(){
    const container = document.querySelector(".card-container");

    if (!container) return;

    db.ref("favorites").once("value", (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        const cards = Object.values(data);
        const randomCard = cards[Math.floor(Math.random() * cards.length)];

        container.innerHTML = `
        <img src="${randomCard.image || "https://via.placeholder.com/223x310"}" />
        <div class="card-info">
            <h3>${randomCard.name}</h3>
            <p> Featured from your favorites</p>
        </div>
        `;
    });
}

loadCardOfTheWeek();



