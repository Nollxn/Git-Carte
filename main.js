let currentPage = 1;
const itemsPerPage = 10;
let totalResults = 0;
let etablissements = {};

// Map Initialization
var map = L.map("map").setView([16.265, -61.55], 12.4);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);



let currentEtablissement = null;

let markers = [];

let parameters = {
  voie_generale: "0",
  voie_technologique: "0",
  voie_professionnelle: "0",
  restauration: "0",
  hebergement: "0",
  ulis: "0",
  apprentissage: "0",
  segpa: "0",
  section_arts: "0",
  section_cinema: "0",
  section_theatre: "0",
  section_sport: "0",
  section_internationale: "0",
  section_europeenne: "0",
  lycee_agricole: "0",
  lycee_militaire: "0",
  lycee_des_metiers: "0",
  ecole_elementaire: "0",
  ecole_maternelle: "0",
};

let statut = "";

const filters = {
  Ecoles: {
    ecole_elementaire: "Élémentaire",
    ecole_maternelle: "Maternelle",
    ecole_specialisee: "Spécialisée",
  },
  Statut: {
    public: "Public",
    prive: "Privé",
  },
  Sections: {
    restauration: "Restauration",
    hebergement: "Hébergement",
    ulis: "ULIS",
    apprentissage: "Apprentissage",
    segpa: "SEGPA",
    section_arts: "Arts",
    section_cinema: "Cinéma",
    section_theatre: "Théâtre",
    section_sport: "Sport",
    section_internationale: "Section Internationale",
    section_europeenne: "Européenne",
  },
  Lycées: {
    lycee_agricole: "Agricole",
    lycee_militaire: "Militaire",
    lycee_des_metiers: "Des Métiers",
    voie_generale: "Générale",
    voie_technologique: "Technologique",
    voie_professionnelle: "Professionnelle",
  },
};

function createFilterSection(title, options) {
  const section = document.createElement("div");
  section.classList.add("col-12");
  const heading = document.createElement("h6");
  heading.textContent = title;
  section.appendChild(heading);

  Object.keys(options).forEach((key) => {
    const formCheck = document.createElement("div");
    formCheck.classList.add("form-check");

    const input = document.createElement("input");
    input.classList.add("form-check-input");
    input.type = "checkbox";
    input.value = key;
    input.id = key;

    const label = document.createElement("label");
    label.classList.add("form-check-label");
    label.htmlFor = key;
    label.textContent = options[key];

    formCheck.appendChild(input);
    formCheck.appendChild(label);
    section.appendChild(formCheck);
  });

  return section;
}

function initializeFilters() {
  const filtersContainer = document.getElementById("filters-container");
  Object.keys(filters).forEach((title) => {
    const section = createFilterSection(title, filters[title]);
    filtersContainer.appendChild(section);
  });

  document.querySelectorAll(".form-check-input").forEach((checkbox) => {
    checkbox.addEventListener("change", updateFilters);
  });
}

function updateFilters() {
  // Reset parameters
  parameters = {};
  Object.keys(filters).forEach((category) => {
    Object.keys(filters[category]).forEach((key) => {
      parameters[key] = "0";
    });
  });

  // Update parameters based on selected checkboxes
  document.querySelectorAll(".form-check-input").forEach((checkbox) => {
    if (checkbox.value === "public" || checkbox.value === "prive") {
      statut = checkbox.checked
        ? checkbox.value === "public"
          ? "Public"
          : "Privé"
        : "";
    } else {
      parameters[checkbox.value] = checkbox.checked ? "1" : "0";
    }
  });

  // Fetch and add markers based on updated parameters
  fetchAndAddMarkers(generateUrlFromParameters());
}

// Initialize filters on page load
document.addEventListener("DOMContentLoaded", initializeFilters);

const baseUrl =
  "https://data.education.gouv.fr/api/v2/catalog/datasets/fr-en-annuaire-education/records?where=code_departement%3D%27971%27&limit=100";

function generateUrlFromParameters() {
  let url = baseUrl;
  Object.keys(parameters).forEach((key) => {
    if (parameters[key] != "0") {
      url += `&where=${key}%3D1`;
    }
  });
  if (statut !== "") {
    url += `&where=statut_public_prive%3A"${statut}"`;
  }
  return url;
}

function generateUrlFromSearch(search) {
  search = encodeURIComponent(search);
  let url = baseUrl;
  url += `&where=nom_etablissement%20LIKE%20%27${search}%27`;
  return url;
}

// Ajouter MarkerClusterGroup
let markerClusterGroup = L.markerClusterGroup();
map.addLayer(markerClusterGroup);

function fetchAndAddMarkers(url, offset = 0, first = true) {
  if (first) {
    showLoader();
  }
  fetch(`${url}&offset=${offset}`)
    .then((response) => response.json())
    .then((data) => {
      const lyceesList = document.getElementById("ListeEtablissements");

      if (first) {
        //Nombre de resultats
        document.getElementById(
          "resultsCount"
        ).textContent = `${data.total_count} résultats`;

        // Supprimer les anciens marqueurs du cluster
        markerClusterGroup.clearLayers();
        //Empty Liste
        lyceesList.innerHTML = "";
      }

      data.records.forEach((record) => {
        const lycee = record.record.fields;

        // Vérifiez que les coordonnées sont disponibles
        if (lycee.latitude && lycee.longitude) {
          // ParseFloat n'est nécessaire que si vos données sont des chaînes de caractères
          const lat = parseFloat(lycee.latitude);
          const lon = parseFloat(lycee.longitude);

          // Créer un marqueur à partir des coordonnées
          let marker = L.marker([lat, lon]);

          // Personnaliser le popup du marqueur avec quelques infos sur le lycée
          marker.bindPopup(`
                        <strong>${lycee.nom_etablissement}</strong><br>
                        ${lycee.adresse_1 ? lycee.adresse_1 + "<br>" : ""}
                        ${lycee.adresse_2 ? lycee.adresse_2 + "<br>" : ""}
                        ${lycee.code_postal ? lycee.code_postal : ""} ${lycee.nom_commune ? lycee.nom_commune : ""
            }
                    `);

          // Stocker les données du lycée dans le marqueur
          marker.lyceeData = lycee;


          marker.on('click', function (e) {
            const lycee = e.target.lyceeData;
            currentEtablissement = lycee;


            // Déterminer l'état de l'établissement
            const etat = lycee.etat || "Statut inconnu";
            let badgeClass = "bg-secondary";
            if (etat === "OUVERT") badgeClass = "bg-success";
            if (etat === "FERMÉ") badgeClass = "bg-danger";

            // Mettre à jour le titre du modal avec le badge
            document.getElementById("lyceeModalTitle").innerHTML = `
                            ${lycee.nom_etablissement}
                            <span class="badge ${badgeClass} ms-2">${etat}</span>
                        `;

            // Préparer les données pour la pagination
            const itemsPerPage = 4; // Nombre d'éléments par page
            const allItems = [
              `<div class="info-item">
                                <i class="fas fa-map-marker-alt"></i>
                                <strong>Adresse :</strong><br>
                                ${[
                lycee.adresse_1,
                lycee.adresse_2,
                `${lycee.code_postal} ${lycee.nom_commune}`,
              ]
                .filter(Boolean)
                .join("<br>")}
                            </div>`,

              lycee.type_etablissement
                ? `<div class="info-item">
                                <i class="fas fa-school"></i>
                                <strong>Type :</strong> ${lycee.type_etablissement}
                            </div>`
                : "",

              lycee.statut_pubic_prive
                ? `<div class="info-item">
                                <i class="fas fa-balance-scale"></i>
                                <strong>Statut :</strong> ${lycee.statut_pubic_prive}
                            </div>`
                : "",

              lycee.nombre_eleves
                ? `<div class="info-item">
                                <i class="fas fa-users"></i>
                                <strong>Élèves :</strong> ${lycee.nombre_eleves}
                            </div>`
                : "",

              lycee.telephone
                ? `<div class="info-item">
                                <i class="fas fa-phone"></i>
                                <strong>Téléphone :</strong> ${lycee.telephone}
                            </div>`
                : "",

              lycee.mail
                ? `<div class="info-item">
                                <i class="fas fa-envelope"></i>
                                <strong>Email :</strong> <a href="mailto:${lycee.mail}">${lycee.mail}</a>
                            </div>`
                : "",

              lycee.web
                ? `<div class="info-item">
                                <i class="fas fa-globe"></i>
                                <strong>Site web :</strong> <a href="${lycee.web}" target="_blank">${lycee.web}</a>
                            </div>`
                : "",

              lycee.fiche_onisep
                ? `<a href="${lycee.fiche_onisep}" target="_blank" class="btn btn-info btn-onisep">
                                <i class="fas fa-file-pdf"></i> Fiche ONISEP
                            </a>`
                : "",

              // Sections spéciales
              ...[
                lycee.sections
                  ? { icon: "fas fa-star", text: lycee.sections }
                  : null,
                lycee.apprentissage === "1"
                  ? {
                    icon: "fas fa-tools",
                    text: "Formations en apprentissage",
                  }
                  : null,
                lycee.restauration === "1"
                  ? { icon: "fas fa-utensils", text: "Restauration" }
                  : null,
                lycee.hebergement === "1"
                  ? { icon: "fas fa-bed", text: "Hébergement" }
                  : null,
              ]
                .filter(Boolean)
                .map(
                  (item) => `
                                <div class="info-item">
                                    <i class="${item.icon}"></i>
                                    ${item.text}
                                </div>
                            `
                ),
            ].filter((item) => item !== "");

            let currentPage = 0;

            // Fonction pour afficher les éléments de la page actuelle
            function showPage(page) {
              const modalContent = document.getElementById("lyceeModalContent");
              const start = page * itemsPerPage;
              const end = start + itemsPerPage;
              const pageItems = allItems.slice(start, end);

              modalContent.innerHTML = `
                                <div class="container-fluid">
                                    <div class="row g-3">
                                        ${pageItems
                  .map(
                    (item) => `
                                            <div class="col-12">
                                                ${item}
                                            </div>
                                        `
                  )
                  .join("")}
                                    </div>
                                </div>
                            `;

              // Mettre à jour les boutons de pagination
              document.getElementById("prevPage").disabled = page === 0;
              document.getElementById("nextPage").disabled =
                end >= allItems.length;
            }

            // Afficher la première page
            showPage(currentPage);

            // Gestion des clics sur les boutons de pagination
            document.getElementById("prevPage").onclick = () => {
              if (currentPage > 0) {
                currentPage--;
                showPage(currentPage);
              }
            };

            document.getElementById("nextPage").onclick = () => {
              if ((currentPage + 1) * itemsPerPage < allItems.length) {
                currentPage++;
                showPage(currentPage);
              }
            };

            // Afficher le modal
            new bootstrap.Modal(document.getElementById("lyceeModal")).show();
          });

          // Ajouter le marqueur au groupe de clusters
          markerClusterGroup.addLayer(marker);

          // Ajouter le lycée à la liste
          etablissements[lycee.nom_etablissement] = lycee;

          const listItem = document.createElement("tr");
          listItem.innerHTML = `
                        <td class="fw-normal">${lycee.nom_etablissement}</td>
                    `;

          lyceesList.appendChild(listItem);
        } else {
          console.warn("Coordonnées non trouvées pour :", lycee);
        }
      });

      if (data.total_count > offset + data.records.length) {
        fetchAndAddMarkers(url, offset + data.records.length, false);
      } else {
        console.log("All markers fetched");
        hideLoader();
      }
    })
    .catch((error) => {
      console.error("Error fetching lycees:", error);
      hideLoader();
    });

}

function showLoader() {
  Array.from(document.getElementsByClassName("loader")).forEach(
    (loader) => (loader.style.display = "flex")
  );
}
function hideLoader() {
  Array.from(document.getElementsByClassName("loader")).forEach(
    (loader) => (loader.style.display = "none")
  );
}

// Initial Fetch
fetchAndAddMarkers(generateUrlFromParameters());


//Search Functionality
const searchForm = document.getElementById("searchForm");
searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const search = document.getElementById("search").value;
  search == ""
    ? fetchAndAddMarkers(generateUrlFromParameters())
    : fetchAndAddMarkers(generateUrlFromSearch(search));
});


let currentRoute = null;
const routeBtn = document.getElementById('route');
routeBtn.addEventListener('click', () => {
  //Récuperer la localisation de l'utilisateur
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLatLng = L.latLng(position.coords.latitude, position.coords.longitude);
        if (currentEtablissement) {
          if (currentRoute) {
            map.removeControl(currentRoute);
          }
          currentRoute = L.Routing.control({
            waypoints: [
              userLatLng,
              L.latLng(currentEtablissement.latitude, currentEtablissement.longitude)
            ],
            routeWhileDragging: true
          }).addTo(map);
        }
      },
      (error) => {
        console.error("Error getting user location:", error);
      }
    );
  } else {
    console.error("Geolocation is not supported by this browser.");
  }



});

let currentLocationMarker;
let currentLocation;

document.getElementById("geolocate").addEventListener("click", function () {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function (position) {
        var lat = position.coords.latitude;
        var lon = position.coords.longitude;
        currentLocation = L.latLng(lat, lon);
        map.setView(currentLocation, 13); // Ajustez le niveau de zoom selon vos besoins

        // Ajouter un marqueur à la position actuelle ou mettre à jour le marqueur existant
        if (currentLocationMarker) {
          currentLocationMarker.setLatLng(currentLocation);
        } else {
          currentLocationMarker = L.marker(currentLocation)
            .addTo(map)
            .bindPopup("Vous êtes ici")
            .openPopup();
        }
      },
      function (error) {
        console.error("Erreur de géo-localisation : " + error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  } else {
    alert("La géo-localisation n'est pas supportée par ce navigateur.");
  }

});