/**
 * Fonction de vérification si l'email saisi est vide
 *
 **/
const isEmpty = (string) => {
	const machaine = (mail) => {
		if (mail === undefined) {
			return mail;
		} else {
			return mail.trim();
		}
	};
	if (machaine(string) === "") return true;
	else return false;
};

/**
 * Fonction de vérification d'un bon email
 *
 **/
const isEmail = (email) => {
	const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	const value = regEx.test(String(email).toLowerCase());
	if (value) {
		//console.log("true");
		return true;
	} else {
		return false;
	}
};

/**
 *
 * Validation de l'inscription de l'utilisateur
 *
 * @param data : Donnée que l'utilisateur a saisi
 *  */

exports.validateSignUpData = (data) => {
	let erreurs = {};

	if (isEmpty(data.email)) {
		erreurs.email = "Votre email ne doit pas être vide";
	} else if (!isEmail(data.email)) {
		erreurs.email = "Email invalide";
	}

	if (isEmpty(data.password)) {
		erreurs.password = "Saisissez un mot de passe";
	}
	if (data.password !== data.confirmPassword) {
		erreurs.confirmPassword = "Les mots de passe sont différents";
	}

	if (isEmpty(data.handle)) {
		erreurs.handle = "Votre nom ne doit pas être vide";
	}

	return {
		erreurs,
		valid: Object.keys(erreurs).length === 0 ? true : false,
	};
};

/**
 *
 * Validation de des données lors de la connexion de l'utilisateur
 *
 * @param data : Donnée que l'utilisateur a saisi
 *  */
exports.validateLoginData = (data) => {
	let erreurs = {};

	if (isEmpty(data.email)) {
		erreurs.email = "Votre email ne doit pas être vide";
	} else if (!isEmail(data.email)) {
		erreurs.email = "Votre email n'est pas valide";
	}
	if (isEmpty(data.password)) {
		erreurs.password = "Saisissez un mot de passe";
	}

	return {
		erreurs,
		valid: Object.keys(erreurs).length === 0 ? true : false,
	};
};

//Verification et remplissage des infos du user
exports.reduceUserDetails = (data) => {
	let userDetails = {};

	if (!isEmpty(data.bio.trim())) {
		userDetails.bio = data.bio;
	}
	if (!isEmpty(data.website.trim())) {
		if (data.website.trim().substring(0, 4) !== "http") {
			userDetails.website = `http://${data.website.trim()}`;
		} else {
			userDetails.website = data.website;
		}
	}
	if (!isEmpty(data.location.trim())) {
		userDetails.location = data.location;
	}
	return userDetails;
};
