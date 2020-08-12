const { database } = require("../util/admin");

/**** THIS IS ROUTE FOR GETTING ALL BLABLAS ***/
exports.getAllBlablas = (request, response) => {
	database
		.collection("blablas")
		.orderBy("createdAt", "desc")
		.get()
		.then((data) => {
			let blablas = [];
			data.forEach((doc) => {
				blablas.push({
					blablaId: doc.id,
					body: doc.data().body,
					userHandle: doc.data().userHandle,
					createdAt: doc.data().createdAt,
					likeCount: doc.data().likeCount,
					commentCount: doc.data().commentCount,
					userImage: doc.data().userImage,
				});
			});
			return response.json(blablas);
		})
		.catch((e) => console.error(e));
};

/**** THIS IS ROUTE FOR GETTING ONE BLABLA ***/
exports.postOneBlabla = (request, response) => {
	if (request.body.body.trim() === "") {
		return response
			.status(400)
			.json({ Body: "Le blabla ne doit pas être vide" });
	}

	const newBlabla = {
		body: request.body.body,
		userHandle: request.user.handle,
		userImage: request.user.imageUrl,
		createdAt: new Date().toISOString(),
		likeCount: 0,
		commentCount: 0,
	};

	database
		.collection("blablas")
		.add(newBlabla)
		.then((doc) => {
			const responseonseBlabla = newBlabla;
			responseonseBlabla.blablaId = doc.id;
			//response.json({ message: `document ${doc.id} créé avec succés` });
			response.json(responseonseBlabla);
		})
		.catch((e) => {
			response.status(500).json({ erreur: "Erreur détecté" });
			console.error(e);
		});
};

/**** THIS IS ROUTE FOR GETTING DETAILS ON ONE BLABLA ***/
exports.getBlablaDetails = (request, response) => {
	let blablaData = {};

	database
		.doc(`/blablas/${request.params.blablaId}`)
		.get()
		.then((doc) => {
			if (!doc.exists) {
				return response.status(404).json({ error: "Ce blabla n'existe pas" });
			}
			blablaData = doc.data();
			blablaData.blablaId = doc.id;
			return database
				.collection("commentaires")
				.orderBy("createdAt", "desc")
				.where("blablaId", "==", request.params.blablaId)
				.get();
		})
		.then((data) => {
			blablaData.commentaires = [];
			data.forEach((doc) => {
				blablaData.commentaires.push(doc.data());
			});
			return response.json(blablaData);
		})
		.catch((e) => {
			console.error(e);
			return response.status(500).json({ error: e.code });
		});
};

/**** THIS IS ROUTE FOR POSTING A COMMENT ON A BLABLA ***/
exports.commenterUnBlabla = (request, response) => {
	if (request.body.body.trim() === "") {
		return response
			.status(400)
			.json({ Commentaire: "Vous ne pouvez pas faire de commentaire vide" });
	}

	const newCommentBlabla = {
		body: request.body.body,
		createdAt: new Date().toISOString(),
		blablaId: request.params.blablaId,
		userHandle: request.user.handle,
		userImage: request.user.imageUrl,
	};
	database
		.doc(`/blablas/${request.params.blablaId}`)
		.get()
		.then((doc) => {
			if (!doc.exists) {
				return response
					.status(404)
					.json({ error: "Ce commentaire n'existe pas" });
			}
			//return database.collection("blablas").add(newCommentBlabla);
			return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
		})
		.then(() => {
			return database.collection("commentaires").add(newCommentBlabla);
		})
		.then(() => {
			response.json(newCommentBlabla);
		})
		.catch((e) => {
			console.log(e);
			response.status(500).json({ error: e.code });
		});
};

/**** THIS IS ROUTE FOR DELETING A BLABLA ***/
exports.supprimerBlabla = (request, response) => {
	const document = database.doc(`/blablas/${request.params.blablaId}`);

	document
		.get()
		.then((doc) => {
			if (!doc.exists) {
				return response
					.status(404)
					.json({ error: "Le blabla que vous voulez supprimer n'existe pas" });
			}

			if (doc.data().userHandle !== request.user.handle) {
				return response
					.status(403)
					.json({ error: "Vous n'êtes pas l'auteur de ce blabla" });
			} else {
				return document.delete();
				//TODO : pense à supprimer les commentaires sur ce blabla
				/*
				.then(() => {
					return database
					.collection("commentaires")
					.where("blablaId", "==", request.user.blablaId)
					.delete();
				})
				*/
			}
		})
		.then(() => {
			response.json({ message: "Le blabla a été supprimé" });
		})
		.catch((e) => {
			console.error(e);
			return response.status(500).json({ error: e.code });
		});
};

/**** THIS IS ROUTE FOR LIKNG A BLABLA ***/
exports.likerBlabla = (request, response) => {
	const likeDocument = database
		.collection("likes")
		.where("userHandle", "==", request.user.handle)
		.where("blablaId", "==", request.params.blablaId)
		.limit(1);

	const blablaDocument = database.doc(`/blablas/${request.params.blablaId}`);

	let blablaData = {};

	blablaDocument
		.get()
		.then((doc) => {
			if (doc.exists) {
				blablaData = doc.data();
				blablaData.blablaId = doc.id;
				return likeDocument.get();
			} else {
				return response.status(404).json({ error: "Ce blabla n'existe pas" });
			}
		})
		.then((data) => {
			if (data.empty) {
				return database
					.collection("likes")
					.add({
						blablaId: request.params.blablaId,
						userHandle: request.user.handle,
					})
					.then(() => {
						blablaData.likeCount++;
						return blablaDocument.update({ likeCount: blablaData.likeCount });
					})
					.then(() => {
						return response.json(blablaData);
					});
			} else {
				return response.status(400).json({ error: "Vous l'avez déjà aimé" });
			}
		})
		.catch((e) => {
			console.error(e);
			response.status(500).json({ error: e.code });
		});
};

/**** THIS IS ROUTE FOR UNLIKNG A BLABLA ***/
exports.unLikerBlabla = (request, response) => {
	const likeDocument = database
		.collection("likes")
		.where("userHandle", "==", request.user.handle)
		.where("blablaId", "==", request.params.blablaId)
		.limit(1);

	const blablaDocument = database.doc(`/blablas/${request.params.blablaId}`);

	let blablaData = {};

	blablaDocument
		.get()
		.then((doc) => {
			if (doc.exists) {
				blablaData = doc.data();
				blablaData.blablaId = doc.id;
				return likeDocument.get();
			} else {
				return response.status(404).json({ error: "Ce blabla n'existe pas" });
			}
		})
		.then((data) => {
			if (data.empty) {
				return response
					.status(400)
					.json({ error: "Vous l'avez déjà disliker" });
			} else {
				return database
					.doc(`/likes/${data.docs[0].id}`)
					.delete()
					.then(() => {
						blablaData.likeCount--;
						return blablaDocument.update({ likeCount: blablaData.likeCount });
					})
					.then(() => {
						response.json(blablaData);
					});
			}
		})
		.catch((e) => {
			console.error(e);
			response.status(500).json({ error: e.code });
		});
};
