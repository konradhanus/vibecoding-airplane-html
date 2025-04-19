        // --- Funkcje Tworzące Elementy Sceny ---
        // createSPAD, createRedBaron, createAirplane - bez zmian
        // createTiles, createBuildings, createCarriers - bez zmian
        function createSPAD(c) { // Argument 'c' jest teraz ignorowany na rzecz kolorów z obrazka
            const a = new THREE.Group();

            // --- Definicje Materiałów (kolory inspirowane zdjęciem) ---
            const wingColor = 0x6B8E23; // OliveDrab (zieleń kamuflażu)
            const fuselageColor = 0xBDB76B; // DarkKhaki (piaskowy/khaki kamuflażu / spód)
            const cowlingColor = 0xA0522D; // Sienna (czerwonawa osłona silnika)
            const propellerColor = 0x8B4513; // SaddleBrown (drewniane śmigło)
            const interplaneStrutColor = 0x8B4513; // SaddleBrown (drewniane wsporniki międzyskrzydłowe)
            const landingGearStrutColor = 0xBDB76B; // DarkKhaki (wsporniki podwozia, oś, płoza)
            const gunColor = 0x222222; // Bardzo ciemny szary/czarny (karabiny)
            const wheelColor = 0x111111; // Czarny (opony)
            // const engineColor = 0x555555; // Opcjonalnie dla widocznych części silnika

            const wingMaterial = new THREE.MeshStandardMaterial({ color: wingColor, roughness: 0.8, metalness: 0.1 });
            const fuselageMaterial = new THREE.MeshStandardMaterial({ color: fuselageColor, roughness: 0.8, metalness: 0.1 });
            const cowlingMaterial = new THREE.MeshStandardMaterial({ color: cowlingColor, roughness: 0.6, metalness: 0.2 });
            const propellerMaterial = new THREE.MeshStandardMaterial({ color: propellerColor, roughness: 0.8 });
            const interplaneStrutMaterial = new THREE.MeshStandardMaterial({ color: interplaneStrutColor, roughness: 0.85 });
            const landingGearStrutMaterial = new THREE.MeshStandardMaterial({ color: landingGearStrutColor, roughness: 0.8 });
            const gunMaterial = new THREE.MeshStandardMaterial({ color: gunColor, roughness: 0.5, metalness: 0.4 });
            const wheelMaterial = new THREE.MeshStandardMaterial({ color: wheelColor, roughness: 0.8 });


            // --- Kadłub (Fuselage) ---
            const fuselageLength = 5.0;
            const fuselageWidth = 1.2;
            const fuselageHeight = 1.4;
            const fuselageGeo = new THREE.BoxGeometry(fuselageWidth, fuselageHeight, fuselageLength);
            const fuselage = new THREE.Mesh(fuselageGeo, fuselageMaterial); // Kolor khaki
            fuselage.position.z = -fuselageLength / 2 + 0.5;
            a.add(fuselage);

            // --- Silnik / Osłona (Engine / Cowling) ---
            const cowlingRadius = 0.7;
            const cowlingLength = 0.8;
            const cowlingGeo = new THREE.CylinderGeometry(cowlingRadius, cowlingRadius*0.9, cowlingLength, 16);
            const cowling = new THREE.Mesh(cowlingGeo, cowlingMaterial); // Kolor sienna
            cowling.rotation.x = Math.PI / 2;
            cowling.position.set(0, 0, fuselage.position.z + fuselageLength / 2 + cowlingLength / 2 - 0.1);
            a.add(cowling);

            // --- Śmigło (Propeller) ---
            const propeller = new THREE.Group();
            propeller.position.z = cowling.position.z + cowlingLength / 2 + 0.1;
            const bladeLength = 3.0;
            const bladeWidth = 0.3;
            const bladeThickness = 0.08;
            const bladeGeo = new THREE.BoxGeometry(bladeWidth, bladeLength, bladeThickness);
            const blade1 = new THREE.Mesh(bladeGeo, propellerMaterial); // Kolor brązowy
            propeller.add(blade1);
            const blade2 = new THREE.Mesh(bladeGeo, propellerMaterial); // Kolor brązowy
            blade2.rotation.z = Math.PI / 2;
            propeller.add(blade2);
            a.add(propeller);
            a.userData.propeller = propeller;

            // --- Skrzydła (Wings - Biplane) ---
            const wingSpan = 8.5;
            const wingChord = 1.6;
            const wingThickness = 0.18;
            const wingGeo = new THREE.BoxGeometry(wingSpan, wingThickness, wingChord);

            const topWing = new THREE.Mesh(wingGeo, wingMaterial); // Kolor zielony
            topWing.position.set(0, fuselageHeight / 2 + 0.5, fuselage.position.z + 0.2);
            a.add(topWing);

            const botWing = new THREE.Mesh(wingGeo, wingMaterial); // Kolor zielony
            botWing.position.set(0, -fuselageHeight / 2 + wingThickness / 2, fuselage.position.z - 0.1);
            a.add(botWing);

            // --- Wsporniki Międzyskrzydłowe (Wing Struts) ---
            const strutRadius = 0.05;
            const strutHeight = topWing.position.y - botWing.position.y - wingThickness;

            function createVerticalStrut(x, z) {
                const strutGeo = new THREE.CylinderGeometry(strutRadius, strutRadius, strutHeight, 6);
                // Używamy materiału dla wsporników międzyskrzydłowych
                const strut = new THREE.Mesh(strutGeo, interplaneStrutMaterial); // Kolor brązowy
                strut.position.set(x, botWing.position.y + wingThickness / 2 + strutHeight / 2, z);
                return strut;
            }

            const strutXOffset = wingSpan * 0.35;
            const strutZOffset = wingChord * 0.2;
            a.add(createVerticalStrut(strutXOffset, botWing.position.z + strutZOffset));
            a.add(createVerticalStrut(strutXOffset, botWing.position.z - strutZOffset));
            a.add(createVerticalStrut(-strutXOffset, botWing.position.z + strutZOffset));
            a.add(createVerticalStrut(-strutXOffset, botWing.position.z - strutZOffset));

            // --- Ogon (Tail Section) ---
            const tailplaneSpan = 3.5;
            const tailplaneChord = 1.0;
            const tailplaneThickness = 0.12;
            const tailplaneGeo = new THREE.BoxGeometry(tailplaneSpan, tailplaneThickness, tailplaneChord);
            // Statecznik poziomy w kolorze skrzydeł
            const tailplane = new THREE.Mesh(tailplaneGeo, wingMaterial); // Kolor zielony
            tailplane.position.set(0, 0, fuselage.position.z - fuselageLength / 2 - tailplaneChord / 2 + 0.2);
            a.add(tailplane);

            const finHeight = 1.1;
            const finChord = 0.9;
            const finThickness = 0.1;
            const finGeo = new THREE.BoxGeometry(finThickness, finHeight, finChord);
            // Statecznik pionowy w kolorze kadłuba (uproszczenie)
            const fin = new THREE.Mesh(finGeo, fuselageMaterial); // Kolor khaki
            fin.position.set(0, tailplane.position.y + tailplaneThickness/2 + finHeight/2, tailplane.position.z);
            a.add(fin);

            // --- Podwozie (Landing Gear) ---
            const wheelRadius = 0.4;
            const wheelThickness = 0.1;
            const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelThickness, 16);
            wheelGeo.rotateZ(Math.PI / 2);

            const landingStrutLength = 1.8; // Długość jest obliczana, ale promień jest potrzebny
            const landingStrutRadius = 0.06;

            const wheelY = -fuselageHeight / 2 - 0.7;
            const wheelX = fuselageWidth / 2 + 0.4;
            const wheelZ = botWing.position.z + 0.1;

            const wheelL = new THREE.Mesh(wheelGeo, wheelMaterial); // Koła czarne
            wheelL.position.set(-wheelX, wheelY, wheelZ);
            a.add(wheelL);

            const wheelR = new THREE.Mesh(wheelGeo, wheelMaterial); // Koła czarne
            wheelR.position.set(wheelX, wheelY, wheelZ);
            a.add(wheelR);

            function createLandingStrut(attachPointFuselage, attachPointWheel) {
                 const direction = new THREE.Vector3().subVectors(attachPointWheel, attachPointFuselage);
                const length = direction.length();
                const geo = new THREE.CylinderGeometry(landingStrutRadius, landingStrutRadius, length, 6);
                geo.translate(0, length / 2, 0);
                // Używamy materiału dla wsporników podwozia
                const strut = new THREE.Mesh(geo, landingGearStrutMaterial); // Kolor khaki
                strut.position.copy(attachPointFuselage);
                strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
                return strut;
            }

            const fuselageAttachY = -fuselageHeight / 2;
            const fuselageAttachX = fuselageWidth / 2;
            const fuselageAttachZFront = wheelZ + 0.2;
            const fuselageAttachZRear = wheelZ - 0.2;

            a.add(createLandingStrut(new THREE.Vector3(-fuselageAttachX, fuselageAttachY, fuselageAttachZFront), wheelL.position));
            a.add(createLandingStrut(new THREE.Vector3(-fuselageAttachX, fuselageAttachY, fuselageAttachZRear), wheelL.position));
            a.add(createLandingStrut(new THREE.Vector3(fuselageAttachX, fuselageAttachY, fuselageAttachZFront), wheelR.position));
            a.add(createLandingStrut(new THREE.Vector3(fuselageAttachX, fuselageAttachY, fuselageAttachZRear), wheelR.position));

            const axleLength = wheelX * 2;
            const axleGeo = new THREE.CylinderGeometry(landingStrutRadius * 0.8, landingStrutRadius * 0.8, axleLength, 6);
            axleGeo.rotateZ(Math.PI / 2);
            const axle = new THREE.Mesh(axleGeo, landingGearStrutMaterial); // Oś khaki
            axle.position.set(0, wheelY, wheelZ);
            a.add(axle);

            const skidLength = 0.6;
            const skidGeo = new THREE.CylinderGeometry(landingStrutRadius, landingStrutRadius*0.5, skidLength, 6);
            const skid = new THREE.Mesh(skidGeo, landingGearStrutMaterial); // Płoza khaki
            skid.position.set(0, -fuselageHeight * 0.6, fuselage.position.z - fuselageLength / 2 - 0.1);
            skid.rotation.z = -1.0;
            a.add(skid);

            // --- Karabiny (Guns) ---
            const gunLength = 1.2;
            const gunRadius = 0.06;
            const gunGeo = new THREE.CylinderGeometry(gunRadius, gunRadius, gunLength, 8);
            const gunOffsetZ = fuselage.position.z + fuselageLength*0.15;
            const gunOffsetY = fuselageHeight / 2 + 0.05;
            const gunOffsetX = fuselageWidth * 0.2;

            const gunL = new THREE.Mesh(gunGeo, gunMaterial); // Ciemnoszare/czarne
            gunL.rotation.x = Math.PI / 2;
            gunL.position.set(-gunOffsetX, gunOffsetY, gunOffsetZ);
            a.add(gunL);

            const gunR = new THREE.Mesh(gunGeo, gunMaterial); // Ciemnoszare/czarne
            gunR.rotation.x = Math.PI / 2;
            gunR.position.set(gunOffsetX, gunOffsetY, gunOffsetZ);
            a.add(gunR);

            // Definicja pozycji wylotów luf w lokalnych koordynatach samolotu
             const gunTipOffset = new THREE.Vector3(0, 0, gunLength / 2); // Przesunięcie do końca lufy
             a.userData.gunPositions = [
                 gunL.position.clone().add(gunTipOffset),
                 gunR.position.clone().add(gunTipOffset)
             ];

            a.rotation.x = 0.02; // Lekkie pochylenie całego modelu

            return a;
        }
        // function createRedBaron(c) { // Kolor c jest używany jako główny
        //     const a = new THREE.Group();
        //     const bodyColor = c; // Główny kolor (np. czerwony)
        //     const detailColor = 0xaaaaaa; // Jasny detal (np. srebrny/szary)
        //     const darkDetailColor = 0x333333; // Ciemny detal (np. podwozie, KM)
        //     const propellerColor = 0x4a2a0a; // Ciemny brąz dla śmigła
        //     const wheelColor = 0x111111; // Czarny dla kół

        //     const bodyMaterial = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.6, metalness: 0.2 });
        //     const detailMaterial = new THREE.MeshStandardMaterial({ color: detailColor, roughness: 0.7 });
        //     const darkDetailMaterial = new THREE.MeshStandardMaterial({ color: darkDetailColor, roughness: 0.5 });
        //     const propellerMaterial = new THREE.MeshStandardMaterial({ color: propellerColor, roughness: 0.8 });
        //     const wheelMaterial = new THREE.MeshStandardMaterial({ color: wheelColor, roughness: 0.8 });

        //     // --- Kadłub ---
        //     const fuselageLength = 4.5;
        //     const fuselageWidth = 1.1;
        //     const fuselageHeight = 1.3;
        //     const fuselageGeo = new THREE.BoxGeometry(fuselageWidth, fuselageHeight, fuselageLength);
        //     const fuselage = new THREE.Mesh(fuselageGeo, bodyMaterial);
        //     fuselage.position.z = -fuselageLength / 2 + 0.3; // Lekkie przesunięcie
        //     a.add(fuselage);

        //      // --- Osłona silnika (bardziej zaokrąglona) ---
        //      const cowlingRadius = 0.6;
        //      const cowlingLength = 0.5;
        //      const cowlingGeo = new THREE.CylinderGeometry(cowlingRadius, cowlingRadius*0.8, cowlingLength, 16);
        //      const cowling = new THREE.Mesh(cowlingGeo, detailMaterial); // Srebrzysta osłona
        //      cowling.rotation.x = Math.PI / 2;
        //      cowling.position.set(0, 0, fuselage.position.z + fuselageLength / 2 + cowlingLength / 2 - 0.05);
        //      a.add(cowling);

        //     // --- Skrzydła (Trójpłatowiec) ---
        //     const wingSpan = 7.0;
        //     const wingChord = 1.0;
        //     const wingThickness = 0.15;
        //     const wingVerticalSeparation = 0.9; // Odstęp między skrzydłami
        //     const wingStagger = 0.2; // Przesunięcie środkowego i górnego do przodu

        //     const wingGeo = new THREE.BoxGeometry(wingSpan, wingThickness, wingChord);

        //     // Dolne skrzydło
        //     const botWing = new THREE.Mesh(wingGeo, bodyMaterial);
        //     botWing.position.set(0, -fuselageHeight / 2 - wingVerticalSeparation + wingThickness/2, fuselage.position.z - wingChord*0.1);
        //     a.add(botWing);

        //     // Środkowe skrzydło
        //     const midWing = new THREE.Mesh(wingGeo, bodyMaterial);
        //     midWing.position.set(0, -fuselageHeight / 2 + wingThickness / 2, fuselage.position.z + wingStagger);
        //     a.add(midWing);

        //     // Górne skrzydło
        //     const topWing = new THREE.Mesh(wingGeo, bodyMaterial);
        //     topWing.position.set(0, midWing.position.y + wingVerticalSeparation, fuselage.position.z + wingStagger * 1.5);
        //     a.add(topWing);

        //     // --- Wsporniki międzyskrzydłowe (uproszczone) ---
        //     const strutRadius = 0.04;
        //     const strutMat = darkDetailMaterial; // Ciemne wsporniki
        //     const strutXOffset = wingSpan * 0.3;

        //     function createInterplaneStruts(bottomY, topY, zPos, xOff) {
        //         const height = topY - bottomY;
        //         const geo = new THREE.CylinderGeometry(strutRadius, strutRadius, height, 6);
        //         const strutF = new THREE.Mesh(geo, strutMat); // Przedni
        //         strutF.position.set(xOff, bottomY + height/2, zPos + wingChord/3);
        //         a.add(strutF);
        //         const strutB = new THREE.Mesh(geo, strutMat); // Tylny
        //         strutB.position.set(xOff, bottomY + height/2, zPos - wingChord/3);
        //         a.add(strutB);
        //     }
        //     // Wsporniki Dolne -> Środkowe
        //     createInterplaneStruts(botWing.position.y, midWing.position.y, fuselage.position.z + wingStagger*0.5, strutXOffset);
        //     createInterplaneStruts(botWing.position.y, midWing.position.y, fuselage.position.z + wingStagger*0.5, -strutXOffset);
        //      // Wsporniki Środkowe -> Górne
        //     createInterplaneStruts(midWing.position.y, topWing.position.y, fuselage.position.z + wingStagger*1.25, strutXOffset);
        //     createInterplaneStruts(midWing.position.y, topWing.position.y, fuselage.position.z + wingStagger*1.25, -strutXOffset);

        //     // --- Ogon ---
        //     const tailplaneSpan = 3.0;
        //     const tailplaneChord = 0.8;
        //     const tailplaneThickness = 0.1;
        //     const tailplaneGeo = new THREE.PlaneGeometry(tailplaneSpan, tailplaneChord); // Użycie PlaneGeometry dla płaskiego ogona
        //      tailplaneGeo.rotateX(Math.PI / 2);
        //     const tailplane = new THREE.Mesh(tailplaneGeo, bodyMaterial);
        //     tailplane.position.set(0, 0, fuselage.position.z - fuselageLength / 2 - tailplaneChord / 2 + 0.1);
        //     a.add(tailplane);

        //     const finHeight = 0.9;
        //     const finChord = 0.7;
        //     const finGeo = new THREE.PlaneGeometry(finChord, finHeight); // PlaneGeometry
        //      finGeo.rotateY(Math.PI / 2);
        //     const fin = new THREE.Mesh(finGeo, bodyMaterial);
        //     fin.position.set(0, finHeight / 2, tailplane.position.z + 0.1);
        //     a.add(fin);

        //     // --- Śmigło ---
        //     const propeller = new THREE.Group();
        //     propeller.position.z = cowling.position.z + cowlingLength / 2 + 0.05;
        //     const bladeLength = 2.8;
        //     const bladeWidth = 0.25;
        //     const bladeThickness = 0.06;
        //     const bladeGeo = new THREE.BoxGeometry(bladeWidth, bladeLength, bladeThickness);
        //     const blade1 = new THREE.Mesh(bladeGeo, propellerMaterial);
        //     propeller.add(blade1);
        //     const blade2 = new THREE.Mesh(bladeGeo, propellerMaterial);
        //     blade2.rotation.z = Math.PI / 2;
        //     propeller.add(blade2);
        //      // Mały spinner/kołpak
        //      const spinnerGeo = new THREE.SphereGeometry(0.15, 8, 6);
        //      const spinner = new THREE.Mesh(spinnerGeo, darkDetailMaterial);
        //      propeller.add(spinner);
        //     a.add(propeller);
        //     a.userData.propeller = propeller;

        //     // --- Karabiny (Spandau MG 08) ---
        //     const gunLength = 1.1;
        //     const gunRadius = 0.05;
        //     const gunGeo = new THREE.CylinderGeometry(gunRadius, gunRadius, gunLength, 8);
        //     const gunOffsetY = fuselageHeight / 2 + 0.05;
        //     const gunOffsetX = fuselageWidth * 0.25;
        //     const gunOffsetZ = fuselage.position.z + fuselageLength * 0.2;

        //     const gunL = new THREE.Mesh(gunGeo, darkDetailMaterial);
        //     gunL.rotation.x = Math.PI / 2;
        //     gunL.position.set(-gunOffsetX, gunOffsetY, gunOffsetZ);
        //     a.add(gunL);

        //     const gunR = new THREE.Mesh(gunGeo, darkDetailMaterial);
        //     gunR.rotation.x = Math.PI / 2;
        //     gunR.position.set(gunOffsetX, gunOffsetY, gunOffsetZ);
        //     a.add(gunR);

        //     // Pozycje wylotów luf
        //     const gunTipOffset = new THREE.Vector3(0, 0, gunLength / 2);
        //      a.userData.gunPositions = [
        //          gunL.position.clone().add(gunTipOffset),
        //          gunR.position.clone().add(gunTipOffset)
        //      ];

        //     // --- Podwozie ---
        //     const wheelRadius = 0.35;
        //     const wheelThickness = 0.1;
        //     const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelThickness, 16);
        //     wheelGeo.rotateZ(Math.PI / 2);

        //     const landingStrutHeight = 1.5;
        //     const landingStrutRadius = 0.05;
        //     const landingStrutGeo = new THREE.CylinderGeometry(landingStrutRadius, landingStrutRadius, landingStrutHeight, 6);
        //     const wheelXOffset = 0.7;
        //     const wheelYPos = botWing.position.y - landingStrutHeight * 0.6; // Pod dolnym skrzydłem
        //     const wheelZPos = midWing.position.z - wingChord * 0.2; // Lekko pod środkowym skrzydłem

        //     const wheelL = new THREE.Mesh(wheelGeo, wheelMaterial);
        //     wheelL.position.set(-wheelXOffset, wheelYPos, wheelZPos);
        //     a.add(wheelL);

        //     const wheelR = new THREE.Mesh(wheelGeo, wheelMaterial);
        //     wheelR.position.set(wheelXOffset, wheelYPos, wheelZPos);
        //     a.add(wheelR);

        //      // Golenie podwozia (uproszczone V)
        //     const strutL = new THREE.Mesh(landingStrutGeo, darkDetailMaterial);
        //     strutL.position.set(-wheelXOffset * 0.9, botWing.position.y - landingStrutHeight / 2 + wingThickness, wheelZPos);
        //     strutL.rotation.z = 0.3; // Pochylenie
        //      strutL.rotation.x = -0.1; // Lekko do tyłu
        //     a.add(strutL);

        //     const strutR = new THREE.Mesh(landingStrutGeo, darkDetailMaterial);
        //     strutR.position.set(wheelXOffset * 0.9, botWing.position.y - landingStrutHeight / 2 + wingThickness, wheelZPos);
        //     strutR.rotation.z = -0.3; // Pochylenie
        //      strutR.rotation.x = -0.1; // Lekko do tyłu
        //     a.add(strutR);

        //      // Oś łącząca koła
        //     const axleLength = wheelXOffset * 2;
        //     const axleGeo = new THREE.CylinderGeometry(landingStrutRadius * 0.7, landingStrutRadius * 0.7, axleLength, 6);
        //     axleGeo.rotateZ(Math.PI/2);
        //     const axle = new THREE.Mesh(axleGeo, darkDetailMaterial);
        //     axle.position.set(0, wheelYPos, wheelZPos);
        //     a.add(axle);


        //     // Płoza ogonowa
        //     const skidLength = 0.5;
        //     const skidGeo = new THREE.CylinderGeometry(landingStrutRadius*0.8, landingStrutRadius*0.4, skidLength, 6);
        //     const skid = new THREE.Mesh(skidGeo, darkDetailMaterial);
        //     skid.position.set(0, -fuselageHeight * 0.7, fuselage.position.z - fuselageLength / 2 - 0.2);
        //     skid.rotation.z = -0.8;
        //     a.add(skid);

        //     return a;
        // }
        function createRedBaron(c) {
            const a = new THREE.Group();
            const bodyColor = c;
            const detailColor = 0xaaaaaa;
            const darkDetailColor = 0x333333;
            const propellerColor = 0x222222;

            const bodyMaterial = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.6, metalness: 0.2 });
            const detailMaterial = new THREE.MeshStandardMaterial({ color: detailColor, roughness: 0.7 });
            const darkDetailMaterial = new THREE.MeshStandardMaterial({ color: darkDetailColor, roughness: 0.5 });
            const propellerMaterial = new THREE.MeshStandardMaterial({ color: propellerColor, roughness: 0.4 });

            // --- Kadłub --- (bez zmian)
            const fuselageGeo = new THREE.BoxGeometry(1.5, 1, 5);
            const fuselage = new THREE.Mesh(fuselageGeo, bodyMaterial);
            fuselage.position.z = -0.5;
            a.add(fuselage);

            // --- Skrzydła (Trójpłatowiec - grubsze i bardziej rozsunięte) ---
            const wingWidth = 7;
            const wingDepth = 1.2;
            // Zwiększona grubość skrzydeł
            const wingThickness = 0.25; // <<< ZMIANA (było 0.15)
            const wingGeo = new THREE.BoxGeometry(wingWidth, wingThickness, wingDepth);

            // Zwiększony odstęp pionowy między skrzydłami
            const wingVerticalSeparation = 1.1; // <<< ZMIANA (efektywny odstęp będzie większy)

            // Górne skrzydło
            const topWingL = new THREE.Mesh(wingGeo, bodyMaterial);
            // Wyżej niż poprzednio
            topWingL.position.set(-(wingWidth / 2 + 0.2), wingVerticalSeparation, -0.5); // <<< ZMIANA Y
            a.add(topWingL);
            const topWingR = new THREE.Mesh(wingGeo, bodyMaterial);
            topWingR.position.set(wingWidth / 2 + 0.2, wingVerticalSeparation, -0.5); // <<< ZMIANA Y
            a.add(topWingR);

            // Środkowe skrzydło (na wysokości kadłuba)
            const midWingGeo = new THREE.BoxGeometry(wingWidth * 0.95, wingThickness, wingDepth);
            const midWingL = new THREE.Mesh(midWingGeo, bodyMaterial);
            // Pozycja Y = 0 pozostaje bez zmian
            midWingL.position.set(-(wingWidth * 0.95 / 2 + 0.2), 0, -0.3);
            a.add(midWingL);
            const midWingR = new THREE.Mesh(midWingGeo, bodyMaterial);
            midWingR.position.set(wingWidth * 0.95 / 2 + 0.2, 0, -0.3);
            a.add(midWingR);

            // Dolne skrzydło
            const botWingGeo = new THREE.BoxGeometry(wingWidth * 0.9, wingThickness, wingDepth * 0.9);
            const botWingL = new THREE.Mesh(botWingGeo, bodyMaterial);
            // Niżej niż poprzednio
            botWingL.position.set(-(wingWidth * 0.9 / 2 + 0.2), -wingVerticalSeparation, -0.1); // <<< ZMIANA Y
            a.add(botWingL);
            const botWingR = new THREE.Mesh(botWingGeo, bodyMaterial);
            botWingR.position.set(wingWidth * 0.9 / 2 + 0.2, -wingVerticalSeparation, -0.1); // <<< ZMIANA Y
            a.add(botWingR);

            // --- Ogon --- (bez zmian)
            const tailPlaneGeo = new THREE.BoxGeometry(3.5, 0.15, 1);
            const tailPlane = new THREE.Mesh(tailPlaneGeo, bodyMaterial);
            tailPlane.position.set(0, 0.2, -3);
            a.add(tailPlane);
            const rudderGeo = new THREE.BoxGeometry(0.15, 1.2, 1);
            const rudder = new THREE.Mesh(rudderGeo, bodyMaterial);
            rudder.position.set(0, 0.75, -3.2);
            a.add(rudder);

            // --- Śmigło --- (bez zmian)
            const propeller = new THREE.Group();
            propeller.position.z = 2.3;
            const bladeGeo = new THREE.BoxGeometry(0.3, 2.5, 0.1);
            const blade1 = new THREE.Mesh(bladeGeo, propellerMaterial);
            blade1.rotation.z = Math.PI / 4;
            propeller.add(blade1);
            const blade2 = blade1.clone();
            blade2.rotation.z = -Math.PI / 4;
            propeller.add(blade2);
            const spinnerGeo = new THREE.SphereGeometry(0.3, 8, 6);
            const spinner = new THREE.Mesh(spinnerGeo, detailMaterial);
            propeller.add(spinner);
            a.add(propeller);
            a.userData.propeller = propeller;

            // --- Karabiny --- (bez zmian)
            const gunGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 8);
            const gunL = new THREE.Mesh(gunGeo, darkDetailMaterial);
            gunL.rotation.x = Math.PI / 2;
            gunL.position.set(-0.3, 0.6, 1.0);
            a.add(gunL);
            const gunR = new THREE.Mesh(gunGeo, darkDetailMaterial);
            gunR.rotation.x = Math.PI / 2;
            gunR.position.set(0.3, 0.6, 1.0);
            a.add(gunR);
            a.userData.gunPositions = [
                new THREE.Vector3(-0.3, 0.6, 1.0 + 1.5 / 2),
                new THREE.Vector3(0.3, 0.6, 1.0 + 1.5 / 2)
            ];

            // --- Podwozie (dostosowane do niższych skrzydeł) ---
            const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16);
            const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
            // Dłuższe golenie podwozia
            const strutHeight = 1.5; // <<< ZMIANA (było 1.2)
            const strutGeo = new THREE.BoxGeometry(0.1, strutHeight, 0.1);

            // Koło i goleń lewa - obniżone
            const wheelL = new THREE.Mesh(wheelGeo, wheelMat);
            wheelL.rotation.z = Math.PI / 2;
            // Obniżamy koło, aby znalazło się pod dolnym skrzydłem
            wheelL.position.set(-0.7, -wingVerticalSeparation - strutHeight / 2 + wingThickness, 0.5); // <<< ZMIANA Y
            a.add(wheelL);
            const strutL = new THREE.Mesh(strutGeo, detailMaterial);
            // Obniżamy górny punkt goleni do poziomu dolnego skrzydła
            strutL.position.set(-0.65, -wingVerticalSeparation - wingThickness/2, 0.5); // <<< ZMIANA Y
            strutL.rotation.z = 0.2;
            a.add(strutL);

            // Koło i goleń prawa - obniżone
            const wheelR = new THREE.Mesh(wheelGeo, wheelMat);
            wheelR.rotation.z = Math.PI / 2;
            // Obniżamy koło
            wheelR.position.set(0.7, -wingVerticalSeparation - strutHeight / 2 + wingThickness, 0.5); // <<< ZMIANA Y
            a.add(wheelR);
            const strutR = new THREE.Mesh(strutGeo, detailMaterial);
            // Obniżamy górny punkt goleni
            strutR.position.set(0.65, -wingVerticalSeparation - wingThickness/2, 0.5); // <<< ZMIANA Y
            strutR.rotation.z = -0.2;
            a.add(strutR);

            // Płoza ogonowa (lekko obniżona)
            const skidGeo = new THREE.BoxGeometry(0.1, 0.5, 0.1);
            const skid = new THREE.Mesh(skidGeo, detailMaterial);
            // Nieco niżej, aby pasowało do niższych kół
            skid.position.set(0, -wingVerticalSeparation*0.8 - strutHeight/2, -2.8); // <<< ZMIANA Y
            skid.rotation.z = -0.8;
            a.add(skid);


            return a;
        }

        function createAirplane(c) { // Generic Jet - bez zmian
            const a = new THREE.Group();
            const fuselageGeo = new THREE.BoxGeometry(2, 1, 8); // Dłuższy kadłub
            const fuselageMat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.4 });
            const fuselage = new THREE.Mesh(fuselageGeo, fuselageMat);
            fuselage.position.z = -1; // Przesunięcie środka
            a.add(fuselage);

            // Skrzydła skośne
            const wingShape = new THREE.Shape();
            wingShape.moveTo(0, 0);
            wingShape.lineTo(5, -1); // Skośna krawędź natarcia
            wingShape.lineTo(5, -1.5);
            wingShape.lineTo(0.5, -1.8); // Skośna krawędź spływu
            wingShape.lineTo(0, -0.5); // Przy kadłubie
            const extrudeSettings = { depth: 0.15, bevelEnabled: false };
            const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
            const wingMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.6, metalness: 0.3 });

            const wingL = new THREE.Mesh(wingGeo, wingMat);
            wingL.rotation.y = Math.PI; // Obróć lewe skrzydło
             wingL.position.set(-1, 0.3, -1.5); // Pozycja lewego skrzydła
            a.add(wingL);

            const wingR = new THREE.Mesh(wingGeo, wingMat);
             wingR.position.set(1, 0.3, -1.5); // Pozycja prawego skrzydła
            a.add(wingR);


             // Stateczniki (ogon)
             const tailPlaneGeo = new THREE.BoxGeometry(4, 0.1, 1.5);
             const tailPlane = new THREE.Mesh(tailPlaneGeo, wingMat); // Materiał jak skrzydła
             tailPlane.position.set(0, 0.2, -4.5); // Z tyłu
             a.add(tailPlane);

             const finGeo = new THREE.BoxGeometry(0.15, 1.8, 1.2); // Wyższy statecznik pionowy
             const fin = new THREE.Mesh(finGeo, fuselageMat); // Materiał jak kadłub
             fin.position.set(0, 1.0, -4.8); // Na górze ogona
             a.add(fin);

            // Brak śmigła, symulacja dyszy odrzutowej
             const nozzleGeo = new THREE.CylinderGeometry(0.5, 0.4, 0.8, 16);
             const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.6 });
             const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
             nozzle.rotation.x = Math.PI / 2;
             nozzle.position.set(0, 0, -5.0); // Z tyłu kadłuba
             a.add(nozzle);
             a.userData.propeller = null; // Ten model nie ma śmigła

             // Karabiny (pod skrzydłami lub w kadłubie)
             const gunLength = 1.5;
             const gunRadius = 0.1;
             const gunGeo = new THREE.CylinderGeometry(gunRadius, gunRadius, gunLength, 8);
             const gunMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5, metalness: 0.5 });

             // Pozycje działek np. w nosie
             const gunL = new THREE.Mesh(gunGeo, gunMat);
             gunL.rotation.x = Math.PI / 2;
             gunL.position.set(-0.5, -0.2, 2.5); // W przedniej części kadłuba
             a.add(gunL);
             const gunR = new THREE.Mesh(gunGeo, gunMat);
             gunR.rotation.x = Math.PI / 2;
             gunR.position.set(0.5, -0.2, 2.5);
             a.add(gunR);

             // Pozycje wylotów luf
             const gunTipOffset = new THREE.Vector3(0, 0, gunLength / 2);
             a.userData.gunPositions = [
                 gunL.position.clone().add(gunTipOffset),
                 gunR.position.clone().add(gunTipOffset)
             ];

             // Podwozie (uproszczone, chowane - ale tu statyczne)
             const wheelRadius = 0.3;
             const wheelThickness = 0.1;
             const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelThickness, 12);
             wheelGeo.rotateZ(Math.PI/2);
             const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
             const strutHeight = 1.0;
             const strutGeo = new THREE.BoxGeometry(0.1, strutHeight, 0.1);
             const strutMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.7 });

             // Przednie koło
             const noseWheel = new THREE.Mesh(wheelGeo, wheelMat);
             noseWheel.position.set(0, -0.5 - strutHeight/2 + wheelThickness/2, 1.5);
             a.add(noseWheel);
             const noseStrut = new THREE.Mesh(strutGeo, strutMat);
             noseStrut.position.set(0, -0.5, 1.5);
             a.add(noseStrut);

             // Główne koła (pod skrzydłami)
             const mainWheelL = new THREE.Mesh(wheelGeo, wheelMat);
             mainWheelL.position.set(-1.5, -0.5 - strutHeight/2 + wheelThickness/2, -1.5);
             a.add(mainWheelL);
             const mainStrutL = new THREE.Mesh(strutGeo, strutMat);
             mainStrutL.position.set(-1.5, -0.5, -1.5);
             mainStrutL.rotation.z = 0.1; // Lekko na zewnątrz
             a.add(mainStrutL);

             const mainWheelR = new THREE.Mesh(wheelGeo, wheelMat);
             mainWheelR.position.set(1.5, -0.5 - strutHeight/2 + wheelThickness/2, -1.5);
             a.add(mainWheelR);
             const mainStrutR = new THREE.Mesh(strutGeo, strutMat);
             mainStrutR.position.set(1.5, -0.5, -1.5);
             mainStrutR.rotation.z = -0.1; // Lekko na zewnątrz
             a.add(mainStrutR);

            return a;
        }

        
      