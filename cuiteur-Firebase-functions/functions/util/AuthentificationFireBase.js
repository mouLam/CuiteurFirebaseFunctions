const { admin, database } = require("./admin");

/**** Le Middleware ***/
/**
 * Ceci permet de vérifier dans l'entête si nous avons "Authorization"
 * et que sa valeur commence par "Bearer " suivi du token.
 *
 * ce token est genéré lors de la connexion de l'utilisateur
 */

module.exports = (request, response, suivant) => {
	let idToken;
	if (
		request.headers.authorization &&
		request.headers.authorization.startsWith("Bearer ")
	) {
		idToken = request.headers.authorization.split("Bearer ")[1];
	} else {
		console.error("Token non trouvé");
		return response.status(403).json({ error: "Non Autoriser" });
	}
	admin
		.auth()
		.verifyIdToken(idToken)
		.then((decodedToken) => {
			request.user = decodedToken;
			console.log(decodedToken);
			return database
				.collection("users")
				.where("userId", "==", request.user.uid)
				.limit(1)
				.get();
		})
		.then((data) => {
			console.log(data);
			request.user.handle = data.docs[0].data().handle;
			request.user.imageUrl = data.docs[0].data().imageUrl;
			return suivant();
		})
		.catch((e) => {
			console.error("Erreur lors de la vérification du token", e);
			return response.status(403).json(e);
		});
};
