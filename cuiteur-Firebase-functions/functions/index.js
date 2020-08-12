const functions = require("firebase-functions");

const app = require("express")();
const { database } = require("./util/admin");

const {
	getAllBlablas,
	postOneBlabla,
	getBlablaDetails,
	commenterUnBlabla,
	supprimerBlabla,
	likerBlabla,
	unLikerBlabla,
} = require("./essentials/blablas");

const {
	signUp,
	logIn,
	uploadImage,
	addUserDetails,
	getAuthenticatedUser,
	getUserDetails,
	lectureNotification,
} = require("./essentials/users");
const FireBaseAuth = require("./util/AuthentificationFireBase");

/**** ROUTE  pour retourner les blablas ***/
app.get("/blablas", getAllBlablas);

/**** ROUTE  pour un blabla ***/
app.post("/blabla", FireBaseAuth, postOneBlabla);

/**** ROUTE  pour retourner les details d'un blabla ***/
app.get("/blabla/:blablaId", getBlablaDetails);

/**** ROUTE  pour supprimer un blabla ***/
app.delete("/blabla/:blablaId", FireBaseAuth, supprimerBlabla);

/**** ROUTE  pour aimer un blabla ***/
app.get("/blabla/:blablaId/like", FireBaseAuth, likerBlabla);

/**** ROUTE  pour dislike un blabla ***/
app.get("/blabla/:blablaId/unlike", FireBaseAuth, unLikerBlabla);

/**** ROUTE  pour commenter un blabla ***/
app.post("/blabla/:blablaId/commenteUnBlabla", FireBaseAuth, commenterUnBlabla);

/**** SIGN UP ROUTE ***/
app.post("/signup", signUp);

/**** LOG IN ROUTE ***/
app.post("/login", logIn);

/**** ROUTE  pour mettre des infos sur son profil ***/
app.post("/user/", FireBaseAuth, addUserDetails);

/**** ROUTE pour obtenir les infos de mon profil ***/
app.get("/user/", FireBaseAuth, getAuthenticatedUser);

/**** ROUTE pour obtenir des infos sur un profil ***/
app.get("/user/:handle", getUserDetails);

/**** ROUTE pour notifier la lecture d'une notification****/
app.post("/notifications", FireBaseAuth, lectureNotification);

/**** ROUTE  pour l'image d'un user ***/
app.post("/user/image", FireBaseAuth, uploadImage);

// https://monUrl.com/api/ sera le prefixe suivi de par exemple (/blablas)
exports.api = functions.region("europe-west1").https.onRequest(app);

/**** Pour les notifications lors d'un LIKE ****/
exports.createNotifOnLike = functions
	.region("europe-west1")
	.firestore.document("likes/{id}")
	.onCreate((snapshot) => {
		database
			.doc(`/blablas/${snapshot.data().blablaId}`)
			.get()
			.then((doc) => {
				if (
					doc.exists &&
					doc.data().userHandle !== snapshot.data().userHandle
				) {
					return database.doc(`/notifications/${snapshot.id}`).set({
						createdAt: new Date().toISOString(),
						blablaOf: doc.data().userHandle,
						envoyeur: snapshot.data().userHandle,
						read: false,
						blablaId: doc.id,
						typeNotif: "like",
					});
				}
			})
			.then(() => {
				return;
			})
			.catch((e) => {
				console.error(e);
				return;
			});
	});

/**** Pour les notifications lors de la suppression d'un LIKE ****/
exports.deleteNotifOnLike = functions
	.region("europe-west1")
	.firestore.document("likes/{id}")
	.onDelete((snapshot) => {
		database
			.doc(`/notifications/${snapshot.id}`)
			.delete()
			.then(() => {
				return;
			})
			.catch((e) => {
				console.error(e);
				return;
			});
	});

/**** Pour les notifications lors d'un COMMENTAIRE ****/
exports.createNotifOnCommentaire = functions
	.region("europe-west1")
	.firestore.document("commentaires/{id}")
	.onCreate((snapshot) => {
		database
			.doc(`/blablas/${snapshot.data().blablaId}`)
			.get()
			.then((doc) => {
				if (
					doc.exists &&
					doc.data().userHandle !== snapshot.data().userHandle
				) {
					return database.doc(`/notifications/${snapshot.id}`).set({
						createdAt: new Date().toISOString(),
						blablaOf: doc.data().userHandle,
						envoyeur: snapshot.data().userHandle,
						read: false,
						blablaId: doc.id,
						typeNotif: "commentaire",
					});
				}
			})
			.then(() => {
				return;
			})
			.catch((e) => {
				console.error(e);
				return;
			});
	});

/**** Quand user change sa photo de profil ****/
exports.userImageChange = functions
	.region("europe-west1")
	.firestore.document("/users/{userId}")
	.onUpdate((changement) => {
		console.log(changement.before.data());
		console.log(changement.after.data());

		if (
			changement.before.data().imageUrl !== changement.after.data().imageUrl
		) {
			//change multiple doc
			let batch = database.batch();
			return database
				.collection("blablas")
				.where("userHandle", "==", changement.before.data().handle)
				.get()
				.then((data) => {
					data.forEach((doc) => {
						const leBlabla = database.doc(`/blablas/${doc.id}`);
						batch.update(leBlabla, {
							userImage: changement.after.data().imageUrl,
						});
					});
					return batch.commit();
				});
		}
	});

/**** Quand on supprime un blabla on supprime
 * aussi ce qui est lié avec càd
 * les likes , les commentaires, notifs ****/
exports.WhenBlablaDeleted = functions
	.region("europe-west1")
	.firestore.document("/blablas/{blablaId}")
	.onDelete((snap, contexte) => {
		const blablaid = contexte.params.blablaId;
		const batch = database.batch();

		return database
			.collection("commentaires")
			.where("blablaId", "==", blablaid)
			.get()
			.then((data) => {
				data.forEach((doc) => {
					batch.delete(database.doc(`/commentaires/${doc.id}`));
				});
				return database
					.collection("likes")
					.where("blablaId", "==", blablaid)
					.get();
			})
			.then((data) => {
				data.forEach((doc) => {
					batch.delete(database.doc(`/likes/${doc.id}`));
				});
				return database
					.collection("notifications")
					.where("blablaId", "==", blablaid)
					.get();
			})
			.then((data) => {
				data.forEach((doc) => {
					batch.delete(database.doc(`/notifications/${doc.id}`));
				});
				return batch.commit();
			})
			.catch((e) => {
				console.error(e);
				return;
			});
	});
