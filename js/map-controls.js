document.addEventListener("DOMContentLoaded", function() {

    const toggleStructure = document.getElementById("toggleStructure");
    const toggleView = document.getElementById("toggleView");
    const normalView = document.getElementById("normalView");
    const vandView = document.getElementById("vandView");

    /* Visa grupper */

    if (toggleStructure) {

        toggleStructure.addEventListener("click", function() {

            document.body.classList.toggle("show-structure");

            if (document.body.classList.contains("show-structure")) {
                toggleStructure.textContent = "Dölj grupper";
            } else {
                toggleStructure.textContent = "Visa grupper";
            }

        });

    }

    /* Vänd karta */

    if (toggleView && normalView && vandView) {

        toggleView.addEventListener("click", function() {

            normalView.classList.toggle("active-view");
            vandView.classList.toggle("active-view");

            if (normalView.classList.contains("active-view")) {
                toggleView.textContent = "Vänd vy";
            } else {
                toggleView.textContent = "Normal vy";
            }

        });

    }

});