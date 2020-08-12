const { admin, database } = require("../util/admin");
const config = require("../util/configurationFirebase");
const firebase = require("firebase");
firebase.initializeApp(config);

const {
	validateSignUpData,
	validateLoginData,
	reduceUserDetails,
} = require("../util/validators");

/**** THIS IS ROUTE FOR SIGN UP ***/
exports.signUp = (req, res) => {
	const newUser = {
		email: req.body.email,
		password: req.body.password,
		confirmPassword: req.body.confirmPassword,
		handle: req.body.handle,
	};

	//Validation
	const { valid, errors } = validateSignUpData(newUser);
	if (!valid) {
		return res.status(400).json(errors);
	}

	//Donner une photo de profil à user
	const noImage = "Blank-Profile-Picture.jpg";

	//Creation de l'utilisateur
	let token, userId;
	database
		.doc(`/users/${newUser.handle}`)
		.get()
		.then((doc) => {
			if (doc.exists) {
				return res.status(400).json({ handle: "Ce nom existe déjà" });
			} else {
				return firebase
					.auth()
					.createUserWithEmailAndPassword(newUser.email, newUser.password);
			}
		})
		.then((data) => {
			userId = data.user.uid;
			return data.user.getIdToken();
		})
		.then((idToken) => {
			token = idToken;
			const userCredentials = {
				handle: newUser.handle,
				email: newUser.email,
				createdAt: new Date().toISOString(),
				imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImage}?alt=media`,
				userId,
			};
			return database.doc(`/users/${newUser.handle}`).set(userCredentials);
		})
		.then(() => {
			return res.status(201).json({ token });
		})
		.catch((err) => {
			console.error(err);
			if (err.code === "auth/email-already-in-use") {
				return res.status(400).json({ email: "Cet Email existe déjà !" });
			} else {
				return res.status(500).json({ Erreur: "Veuillez réessayer" });
			}
		});
};

/**** THIS IS ROUTE FOR LOG IN ***/
exports.logIn = (req, resp) => {
	const user = {
		email: req.body.email,
		password: req.body.password,
	};

	//Validation
	const { valid, errors } = validateLoginData(user);
	if (!valid) {
		return resp.status(400).json(errors);
	}

	firebase
		.auth()
		.signInWithEmailAndPassword(user.email, user.password)
		.then((data) => {
			return data.user.getIdToken();
		})
		.then((token) => {
			return resp.json({ token });
		})
		.catch((err) => {
			console.error(err);
			if (
				err.code === "auth/wrong-password" ||
				err.code === "auth/user-not-found"
			) {
				resp
					.status(403)
					.json({ general: "Ce compte n'existe pas, Réessayez !" });
			} else {
				return resp.status(500).json({ error: err.code });
			}
		});
};

/**** THIS IS ROUTE FOR UPLOAD PROFILE USER IMAGE ***/
exports.uploadImage = (req, resp) => {
	const Busboy = require("busboy");
	const path = require("path");
	const os = require("os");
	const fs = require("fs");

	let imageFileName;
	let imageToBeUploaded = {};

	const busboy = new Busboy({ headers: req.headers });

	busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
		console.log(fieldname);
		console.log(filename);
		console.log(mimetype);

		if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
			return resp
				.status(400)
				.json({ error: "Veuillez mettre un format png ou jpg" });
		}

		//la.mine.jpg
		const imageExtension = filename.split(".")[filename.split(".").length - 1];
		//157646.png
		imageFileName = `${Math.round(
			Math.random() * 10000000000
		)}.${imageExtension}`;

		const filepath = path.join(os.tmpdir(), imageFileName);

		imageToBeUploaded = { filepath, mimetype };
		file.pipe(fs.createWriteStream(filepath));
	});
	busboy.on("finish", () => {
		admin
			.storage()
			.bucket()
			.upload(imageToBeUploaded.filepath, {
				resumable: false,
				metadata: {
					metadata: {
						contentType: imageToBeUploaded.mimetype,
					},
				},
			})
			.then(() => {
				const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
				return database.doc(`/users/${req.user.handle}`).update({ imageUrl });
			})
			.then(() => {
				return resp.json({ message: "Image téléchargée avec succés" });
			})
			.catch((err) => {
				console.log(err);
				return res.status(500).json({ error: err.code });
			});
	});
	busboy.end(req.rawBody);
};

/**** THIS IS ROUTE FOR MAKING USER DETAILS ***/
exports.addUserDetails = (req, resp) => {
	let userDetails = reduceUserDetails(req.body);

	database
		.doc(`/users/${req.user.handle}`)
		.update(userDetails)
		.then(() => {
			return resp.json({
				message: "Infos de l'utilisateur ajoutés avec succées",
			});
		})
		.catch((err) => {
			console.error(err);
			return res.status(500).json({ error: err.code });
		});
};

/**** THIS IS ROUTE FOR GETTING OWN USER DETAILS ***/
exports.getAuthenticatedUser = (req, resp) => {
	let userData = {};

	database
		.doc(`/users/${req.user.handle}`)
		.get()
		.then((doc) => {
			if (doc.exists) {
				userData.credentials = doc.data();
				return database
					.collection("likes")
					.where("userHandle", "==", req.user.handle)
					.get();
			}
		})
		.then((data) => {
			userData.likes = [];
			data.forEach((doc) => {
				userData.likes.push(doc.data());
			});
			//return resp.json(userData);
			return database
				.collection("notifications")
				.where("blablaOf", "==", req.user.handle)
				.orderBy("createdAt", "desc")
				.limit(10)
				.get();
		})
		.then((data) => {
			userData.notifications = [];
			data.forEach((doc) => {
				userData.notifications.push({
					blablaOf: doc.data().blablaOf,
					envoyeur: doc.data().envoyeur,
					typeNotif: doc.data().typeNotif,
					createdAt: doc.data().createdAt,
					read: doc.data().read,
					blablaId: doc.data().blablaId,
					notificationsId: doc.id,
				});
			});
			return resp.json(userData);
		})
		.catch((err) => {
			console.error(err);
			return resp.status(500).json({ error: err.code });
		});
};

/**** THIS IS ROUTE FOR GETTING A USER DETAILS ***/
exports.getUserDetails = (req, resp) => {
	let userData = {};
	database
		.doc(`/users/${req.params.handle}`)
		.get()
		.then((doc) => {
			if (doc.exists) {
				userData.user = doc.data();
				return database
					.collection("blablas")
					.where("userHandle", "==", req.params.handle)
					.orderBy("createdAt", "desc")
					.get();
			} else {
				return resp.status(404).json({ error: "Ce user n'existe pas" });
			}
		})
		.then((data) => {
			userData.blablas = [];
			data.forEach((doc) => {
				userData.blablas.push({
					body: doc.data().body,
					userImage: doc.data().userImage,
					userHandle: doc.data().userHandle,
					createdAt: doc.data().createdAt,
					likeCount: doc.data().likeCount,
					commentCount: doc.data().commentCount,
					blablaId: doc.data().blablaId,
				});
			});
			return resp.json(userData);
		})
		.catch((err) => {
			console.error(err);
			return resp.status(500).json({ error: err.code });
		});
};

/**** THIS IS ROUTE FOR SEEING ALL NOTIFICATIONS ***/
exports.lectureNotification = (req, resp) => {
	// Initializing a write batch...
	let leBatch = database.batch();
	// Update la lecture du notif
	req.body.forEach((notifId) => {
		const notification = database.doc(`/notifications/${notifId}`);
		leBatch.update(notification, { read: true });
	});
	// Commit le mise à jour
	leBatch
		.commit()
		.then(() => {
			return resp.json({ message: "La notification est lue" });
		})
		.catch((err) => {
			console.error(err);
			return resp.status(500).json({ error: err.code });
		});
};
