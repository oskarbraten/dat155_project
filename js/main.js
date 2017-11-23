"use strict";

window.addEventListener('load', () => {
	let app = new App();

	// setup terrain.
	app.extend(Utilities.loadImage('resources/textures/heightmap.png').then((heightmapImage) => {
		// return the callback function that will be called once the heightmap has been loaded.
		return (app) => {
			let width = 3000;

			let geometry = new TerrainBufferGeometry({
				heightmapImage,
				width,
				height: 450,
				levelsOfDetail: 5,
				numberOfSubdivisions: 16
			});

			let grass = new THREE.TextureLoader().load('resources/textures/grass_01.jpg');
	    	grass.wrapS = THREE.RepeatWrapping;
			grass.wrapT = THREE.RepeatWrapping;
			grass.repeat.set(width/40, width/40);

	        let snowyRock = new THREE.TextureLoader().load('resources/textures/snowy_rock_01.png');
	        snowyRock.wrapS = THREE.RepeatWrapping;
	        snowyRock.wrapT = THREE.RepeatWrapping;
	        snowyRock.repeat.set(width/80, width/80);

        	let splatMap1 = new THREE.TextureLoader().load('resources/textures/splatmap_01.png');

	        let material = new TextureSplattingMaterial({
	            color: 0x777777,
	            shininess: 0,
	            textures: [snowyRock, grass],
	            splatMaps: [splatMap1]
	        });

			app.terrain = new THREE.Mesh(geometry, material);
			app.terrain.position.x = -width/2;
			app.terrain.position.z = -width/2;

			app.scene.add(app.terrain);

			let light = new THREE.DirectionalLight( 0xffffff, 2);
			light.position.set(0.01, 1, 0);
			app.scene.add(light); // for testing purposes.
		};
	}));

    //Load a list of objects!
    //{ geometryUrl: "object-url", materialUrl: "material-url"}

    app.extend(Promise.all([// I'll load them later
        {
            geometryUrl: "resources/3Dmodels/lowpolytree/lowpolytree.obj",
            materialUrl: "resources/3Dmodels/lowpolytree/lowpolytree.mtl",
            parameters: {
                upperPlacementBound: 300, // Tree line, upper
                lowerPlacementBound: 60, //Tree line lower
                minScale: 10,
                maxScale: 70,
                size: 1,// size*scale = minimum distance to next object
                verticalDisplacement: 0 // vd*scale used to move the object down in to the ground.
            }
        },
        {
            geometryUrl: "resources/3Dmodels/rock1/rock1.obj",
            materialUrl: "resources/3Dmodels/rock1/rock1.mtl",
            parameters: {
                upperPlacementBound: 1000,
                lowerPlacementBound: 0,
                minScale: 10,
                maxScale: 70,
                size: 1,// size*scale = minimum distance to next object
                verticalDisplacement: 0 // vd*scale used to move the object down in to the ground.
            }
        }
    ].map((source) => {
        return Utilities.OBJLoader(source.geometryUrl, Utilities.MTLLoader(source.materialUrl)).then((object) => {
            return Promise.resolve({
                object,
                parameters: source.parameters
            });
        });
    })).then((objects) => { //When promises has resolved (models loaded)
        console.log(objects);
        return (app) => {
            //Parse that list to decorations class
            let decorations = new Decorations(objects);
            app.scene.add(decorations);

            // maybe do something else..
        }
    }));//Load object done

	// setup camera.
	app.extend((app) => {
		let controls = new CameraControls(app.camera, app.renderer.domElement,250,0.02);
		app.scene.add(controls.object);
		controls.object.position.z = 0;
		controls.object.position.y = 350;

//controls.movementSpeed = 250;

		let geometry = new THREE.CubeGeometry( 3500, 3500,3500);

		let cubeMaterials =
				[
						new THREE.MeshBasicMaterial( { map: new THREE.TextureLoader( ).load( "resources/img/skybox/desertsky_ft.png" ), side: THREE.DoubleSide}),
						new THREE.MeshBasicMaterial( { map: new THREE.TextureLoader( ).load( "resources/img/skybox/desertsky_bk.png" ), side: THREE.DoubleSide}),
						new THREE.MeshBasicMaterial( { map: new THREE.TextureLoader( ).load( "resources/img/skybox/desertsky_up.png" ), side: THREE.DoubleSide}),
						new THREE.MeshBasicMaterial( { map: new THREE.TextureLoader( ).load( "resources/img/skybox/desertsky_dn.png" ), side: THREE.DoubleSide}),
						new THREE.MeshBasicMaterial( { map: new THREE.TextureLoader( ).load( "resources/img/skybox/desertsky_rt.png" ), side: THREE.DoubleSide}),
						new THREE.MeshBasicMaterial( { map: new THREE.TextureLoader( ).load( "resources/img/skybox/desertsky_lf.png" ), side: THREE.DoubleSide})
				];

		let cubeMap = new THREE.CubeTextureLoader().setPath("resources/img/skybox/").load([
				"desertsky_ft.png",
				"desertsky_bk.png",
				"desertsky_up.png",
				"desertsky_dn.png",
				"desertsky_rt.png",
				"desertsky_lf.png"
		]);

		let pm = new THREE.MeshBasicMaterial({color:0xff0000});
		let pg = new THREE.CubeGeometry(20,20,20,20);
		let player = new THREE.Mesh(pg,pm);

		let cube = new THREE.Mesh( geometry, cubeMaterials );
		app.scene.add(cube);
		app.scene.add(player);

		app.updatables.push((delta) => {
			controls.update(delta);

			//app.terrain.update(controls.object.position.x, controls.object.position.z, 80);
			cube.position.copy(controls.object.position);
			player.position.copy(controls.object.position);

			// update terrain lod.
			app.terrain.geometry.update(controls.object.position.x - app.terrain.position.x, controls.object.position.z - app.terrain.position.z, 80);
		});
	});
	//add water with dynamic envMapping
	app.extend((app) => {

        //let cubeMaterial = THREE.MeshFaceMaterial(cubeMaterials);
        //cubeMap.mapping = THREE.CubeRefractionMapping;
		let cubecam = new THREE.CubeCamera(app.zNear,app.zFar,512);
		cubecam.renderTarget.mapping = THREE.CubeRefractionMapping;
        let w = new Water(100,100,cubecam.renderTarget);
        w.object.position.set(780,282,-600);
        cubecam.position.copy(w.object.position);
        cubecam.position.y += 0;
        cubecam.position.z += 23;//move cam to the center of the visible part of the water.


        let pm = new THREE.MeshBasicMaterial({color:0xff0000});
        let pg = new THREE.CubeGeometry(2,20,2,2);
        let player = new THREE.Mesh(pg,pm);

		player.position.copy(cubecam.position);
        app.scene.add(w.object);
        app.scene.add(player);

		app.updatables.push((delta) => {
            w.normalMap.offset.x += 0.01 * delta;
            w.normalMap.offset.y += 0.01 * delta;
            cubecam.update(app.renderer,app.scene);
        });
	});

	//add a circling plane
    app.extend((app) => {

    let materialLoader = new THREE.MTLLoader();

    materialLoader.load('resources/3Dmodels/Plane/plane222.mtl', function(mat) {
        mat.preload();
        let objectLoader = new THREE.OBJLoader();

        objectLoader.setMaterials(mat);
        objectLoader.load('resources/3Dmodels/Plane/plane222.obj', function (obj) {

            obj.scale.set(0.8, 0.8, 0.8);

            let plane = new Plane(obj,15);

            app.updatables.push((delta) => {
                plane.update(delta);
            });

            app.scene.add(obj);
        });
    });
    });
		
	app.start();
});
