App = {
    web3Provider: null,
    contracts: {},

    init: async function() {
        // Load pets.
        //const instance =  App.contracts.Donation.deployed();
        //const allPets =  await instance.getAllPets();
        $.getJSON('../pets.json', function (data) {
            var petsRow = $('#petsRow');
            var petTemplate = $('#petTemplate');

            for (i = 0; i < data.length; i++) {
                petTemplate.find('.panel-title').text(data[i].name);
                petTemplate.find('img').attr('src', data[i].picture);
                petTemplate.find('.pet-breed').text(data[i].breed);
                petTemplate.find('.pet-age').text(data[i].age);
                petTemplate.find('.pet-location').text(data[i].location);
                petTemplate.find('.btn-adopt').attr('data-id', data[i].id);
                petTemplate.find('.btn-donate').attr('data-id', data[i].id);
                petTemplate.find('.pet-price').text(data[i].price.toString());
                //const pet = await instance2.pets(petId);
                //petTemplate.find('.pet-donation).text(pet[4].toString() / 1e18);
                petsRow.append(petTemplate.html());
            }
        });


        return await App.initWeb3();
    },

    initWeb3: async function() {

        // Modern dapp browsers...
        if (window.ethereum) {
            App.web3Provider = window.ethereum;
            try {
                // Request account access
                await window.ethereum.enable();
            } catch (error) {
                // User denied account access...
                console.error("User denied account access")
            }
        }
        // Legacy dapp browsers...
        else if (window.web3) {
            App.web3Provider = window.web3.currentProvider;
        }
        // If no injected web3 instance is detected, fall back to Ganache
        else {
            App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
        }
        web3 = new Web3(App.web3Provider);

        return App.initContract();
    },

    initContract: function() {
        $.getJSON('Adoption.json', function(data) {
            // Get the necessary contract artifact file and instantiate it with truffle-contract
            var AdoptionArtifact = data;
            App.contracts.Adoption = TruffleContract(AdoptionArtifact);

            // Set the provider for our contract
            App.contracts.Adoption.setProvider(App.web3Provider);

            // Use our contract to retrieve and mark the adopted pets
            return App.markAdopted();
        });
        $.getJSON('Donation.json', function(data) {
            // Get the necessary contract artifact file and instantiate it with truffle-contract
            var DonationArtifact = data;
            App.contracts.Donation = TruffleContract(DonationArtifact);

            // Set the provider for our contract
            App.contracts.Donation.setProvider(App.web3Provider);

            return App.refreshDonation();
        });
        return App.bindEvents();
    },

    bindEvents: function() {
        $(document).on('click', '.btn-adopt', App.handleAdopt);
        $(document).on('click', '.btn-donate', App.handleDonate);
    },

    markAdopted: function(adopters, account) {
        var adoptionInstance;

        App.contracts.Adoption.deployed().then(function(instance) {
            adoptionInstance = instance;

            return adoptionInstance.getAdopters.call();
        }).then(function(adopters) {
            for (i = 0; i < adopters.length; i++) {
                if (adopters[i] !== '0x0000000000000000000000000000000000000000') {
                    $('.panel-pet').eq(i).find('button').text('Success').attr('disabled', true);
                }
            }
        }).catch(function(err) {
            console.log(err.message);
        });
    },

    handleAdopt: function(event) {
        event.preventDefault();
        var button = $(event.target);
        button.prop("disabled", true);
        var petId = parseInt($(event.target).data('id'));
        var petContainer = $(event.target).closest('.panel-pet');
        var petName = petContainer.find('.panel-title').text();
        var petBreed = petContainer.find('.pet-breed').text();
        var petAge = parseInt(petContainer.find('.pet-age').text());
        var petPriceEther = petContainer.find('.pet-price').text();
        var petPrice = BigInt(parseFloat(petPriceEther) * 1e18);

        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }

            var account = accounts[0];

            App.contracts.Adoption.deployed().then(async function (instance) {
                adoptionInstance = instance;

                // Reducing price if donated
                var donationInstance;
                await App.contracts.Donation.deployed().then(function (instance) {
                    donationInstance = instance;
                    donationInstance.getDonation.call();
                    return donationInstance.getDonaters.call();

                }).then(async function (donaters) {
                    console.log("petId=", petId);
                    if (donaters[petId] !== '0x0000000000000000000000000000000000000000') {
                        var petDonation = BigInt(await donationInstance.getDonation(petId));
                        console.log("pet donations = ", petDonation);
                        petPrice = BigInt(parseFloat(petPriceEther) * 1e18) -petDonation;
                        console.log("pet price after considering donation=", petPrice);

                    }
                }).catch(function (err) {
                    console.log(err.message);
                });


                // Execute adopt as a transaction by sending account and value (pet price in Wei)
                return adoptionInstance.adopt(petId, petName, petBreed, petAge, {from: account, value: petPrice});
            }).then(function(result) {
                return App.markAdopted();
            }).catch(function(err) {
                console.log(err.message);
            }).finally(function() {
                // enable button
                button.prop("disabled", false);
            });
        });
    },

    handleDonate: async function (event) {
        event.preventDefault();
        var button = $(event.target);
        button.prop("disabled", true);
        var petId = parseInt($(event.target).data('id'));
        var petContainer = $(event.target).closest('.panel-pet');
        var petName = petContainer.find('.panel-title').text();
        var petBreed = petContainer.find('.pet-breed').text();
        var petAge = parseInt(petContainer.find('.pet-age').text());
        var petPrice = petContainer.find('.pet-price').text() * 1e18;
        //var accruedDonation = petContainer.find('.pet-donation').text() * 1e18;
        let donationValue = BigInt((window.prompt("Please enter donation amount in Ether:", "0.1")) * 1e18);


        web3.eth.getAccounts(async function (error, accounts) {
            if (error) {
                console.log(error);
            }

            var account = accounts[0];
            await App.contracts.Donation.deployed().then(function (instance) {
                adoptionInstance = instance;

                // Execute adopt as a transaction by sending account and value (pet price in Wei)
                return adoptionInstance.donate(petId, petName, petBreed, petAge, petPrice, {
                    from: account,
                    value: donationValue
                });
            }).then(function (result) {

            }).catch(function (err) {
                console.log(err.message);
            }).finally(function () {
                // enable button
                button.prop("disabled", false);
            });

            //update accrued donation
            const instance = await App.contracts.Donation.deployed();
            const allPets = await instance.getAllPets();
            petContainer.find('.pet-donation').text(String(allPets[petId] / 1e18));
        });


    },

    refreshDonation: function(adopters, account) {
        var doantionInstance;

        App.contracts.Donation.deployed().then(function(instance) {
            doantionInstance = instance;

            return doantionInstance.getAllPets.call();
        }).then( function (adopters) {
            for (i = 0; i < adopters.length; i++) {
                $('.panel-pet').eq(i).find('.pet-donation').text(adopters[i].toString() / 1e18);

            }
        }).catch(function(err) {
            console.log(err.message);
        });
    },

    displayTransactionData: async function() {
        // Remove all rows from the table
        $("#adopted-pets-table tr").remove();

        // Add header row back to the table
        const headerRow = document.createElement('tr');
        ['Pet ID', 'Adopter Address', 'Price', 'Purchase Time', 'isWithdrawn', 'Source'].forEach((text) => {
            const th = document.createElement('th');
            th.innerText = text;
            headerRow.appendChild(th);
        });
        document.getElementById('adopted-pets-table').appendChild(headerRow);

        const instance = await App.contracts.Adoption.deployed();

        // Calculate total collectable fee
        var totalFee = parseInt(await instance.getTotalCollectableFee());

        // Fetch adopted pets
        const adoptedPets = await instance.getAdoptedPets();

        // Fetch details for each pet and update the HTML
        for (let i = 0; i < adoptedPets.length; i++) {
            const petId = adoptedPets[i].toString(); // Convert BigNumber to string
            const pet = await instance.pets(petId);
            // Create a table row for each pet
            const petRow = document.createElement('tr');

            // Create cells for each detail
            const petIdCell = document.createElement('td');
            petIdCell.innerText = petId;
            petRow.appendChild(petIdCell);

            const adopterCell = document.createElement('td');
            adopterCell.innerText = pet[0];
            petRow.appendChild(adopterCell);

            const priceCell = document.createElement('td');
            priceCell.innerText = pet[4].toString() / 1e18;
            petRow.appendChild(priceCell);

            const purchaseTimeCell = document.createElement('td');
            purchaseTimeCell.innerText = new Date(pet[5].toNumber() * 1000).toLocaleString();
            petRow.appendChild(purchaseTimeCell);

            const isWithdrawnCell = document.createElement('td'); // <-- New cell for 'Is Withdrawn'
            isWithdrawnCell.innerText = pet[7] ? 'Yes' : 'No'; // <-- Here pet[6] should correspond to the 'isWithdrawn' flag in the 'Pet' struct
            petRow.appendChild(isWithdrawnCell);

            const sourceCell = document.createElement('td');
            sourceCell.innerText = "Adopter";
            petRow.appendChild(sourceCell);

            // Append the row to the table
            document.getElementById('adopted-pets-table').appendChild(petRow);
        }

        const instance2 = await App.contracts.Donation.deployed();

        // Calculate total collectable fee
        totalFee = totalFee+parseInt(await instance2.getTotalCollectableFee());

        document.getElementById('total-fee').innerText = "Trading Balance: " + totalFee.toString() / 1e18;
        document.getElementById('hint').innerText = "You can only withdraw money after 14 days."

        const donatedPets = await instance2.getDonatedPets();
        for (let i = 0; i < donatedPets.length; i++) {
            const petId = donatedPets[i].toString(); // Convert BigNumber to string
            const pet = await instance2.pets(petId);
            // Create a table row for each pet
            const petRow = document.createElement('tr');

            // Create cells for each detail
            const petIdCell = document.createElement('td');
            petIdCell.innerText = petId;
            petRow.appendChild(petIdCell);

            const donaterCell = document.createElement('td');
            donaterCell.innerText = "N/A";//pet[0];
            petRow.appendChild(donaterCell);

            const priceCell = document.createElement('td');
            priceCell.innerText = pet[4].toString() / 1e18;
            petRow.appendChild(priceCell);

            const purchaseTimeCell = document.createElement('td');
            purchaseTimeCell.innerText = new Date(pet[5].toNumber() * 1000).toLocaleString();
            petRow.appendChild(purchaseTimeCell);

            const isWithdrawnCell = document.createElement('td'); // <-- New cell for 'Is Withdrawn'
            isWithdrawnCell.innerText = pet[7] ? 'Yes' : 'No'; // <-- Here pet[6] should correspond to the 'isWithdrawn' flag in the 'Pet' struct
            petRow.appendChild(isWithdrawnCell);

            const sourceCell = document.createElement('td');
            sourceCell.innerText = "Donater";
            petRow.appendChild(sourceCell);

            // Append the row to the table
            document.getElementById('adopted-pets-table').appendChild(petRow);
        }
    },


    handleWithdraw: function(event) {
        event.preventDefault();

        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }

            var account = accounts[0];

            App.contracts.Adoption.deployed().then(function(instance) {
                // Call the contract function
                return instance.withdraw({from: account});
            }).then(function(result) {
                // Show a success message, or do something with the result
                console.log('Withdraw successful!');
                $('.btn-display').trigger('click');
            }).catch(function(err) {
                // There was an error, handle it
                console.error('An error occurred in your withdraw:', err);
            });

        });
    },

    handleWithdrawDonation: function(event) {
        event.preventDefault();

        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }

            var account = accounts[0];

            App.contracts.Donation.deployed().then(function(instance) {
                // Call the contract function
                return instance.withdraw({from: account});
            }).then(function(result) {
                // Show a success message, or do something with the result
                console.log('Withdraw successful!');
                $('.btn-display').trigger('click');
            }).catch(function(err) {
                // There was an error, handle it
                console.error('An error occurred in your donation withdraw:', err);
            });
        });
    },

    displayAccountData: async function() {
        web3.eth.getAccounts(async function(error, accounts) {
            if (error) {
                console.log(error);
            }

            var account = accounts[0];

            const instance = await App.contracts.Adoption.deployed();
            const adoptedPets = await instance.getMyAdoptedPets.call({from: account});
            const pendingPets = await instance.getMyPendingPets.call({from: account});

            document.getElementById('my-adopted-pets').innerText = "My Adopted Pets";
            document.getElementById('message').innerText = "Message"


            const adoptedPetsTable = document.getElementById('my-adopted-pets-table');

            App.updateAdoptedTable(adoptedPetsTable, adoptedPets, account);

            const pendingPetsTable = document.getElementById('my-pending-pets-table');

            App.updatePendingTable(pendingPetsTable, pendingPets, account);
        });
    },


    // Helper function to create a new cell in a table row
    addCell: function(row, text) {
        const cell = document.createElement('td');
        cell.innerText = text;
        row.appendChild(cell);
    },

    // Function to update a table with pet details and action buttons
    updateAdoptedTable: async function(table, petIds, account) {
        // Remove all rows from the table
        while (table.firstChild) {
            table.removeChild(table.firstChild);
        }

        // Add header row back to the table
        const headerRow = document.createElement('tr');
        ['Pet ID', 'Pet Name', 'Purchase Time', 'Price', 'Transfer Status', 'Action'].forEach((text) => {
            const th = document.createElement('th');
            th.innerText = text;
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);

        const instance = await App.contracts.Adoption.deployed();

        // Fetch details for each pet and update the HTML
        for (let i = 0; i < petIds.length; i++) {
            const petId = petIds[i].toString(); // Convert BigNumber to string
            const pet = await instance.pets(petId);
            // Create a table row for each pet
            const petRow = document.createElement('tr');

            // Create cells for each detail
            this.addCell(petRow, petId); // Pet ID
            this.addCell(petRow, pet[1]); // Pet Name
            this.addCell(petRow, new Date(pet[5].toNumber() * 1000).toLocaleString()); // Purchase Time
            this.addCell(petRow, pet[4].toString() / 1e18); // Price
            this.addCell(petRow, pet[6] != '0x0000000000000000000000000000000000000000' ? 'Yes' : 'No'); // Transfer Status

            const buttonCell = document.createElement('td');
            const button = document.createElement('button');
            const refundButton = document.createElement('button');

            button.classList.add('btn');
            button.classList.add('btn-default');
            button.classList.add('btn-display');

            if(pet[6] != '0x0000000000000000000000000000000000000000') {
                // If there's a pending transfer, show a Cancel Transfer button
                button.innerText = 'Cancel Transfer';
                button.id = `cancel-transfer-${petId}`;
                button.onclick = function() {
                    App.cancelRequest(instance, petId, account);
                };
            } else {
                // If there's no pending transfer, show a Request Transfer button
                button.innerText = 'Transfer';
                button.id = `request-transfer-${petId}`;
                //pass variable
                button.onclick = function() { showPopup(petId,account);}


                refundButton.classList.add('btn');
                refundButton.classList.add('btn-default');
                refundButton.classList.add('btn-display');
                refundButton.innerText = 'Refund';
                refundButton.onclick = async function() {
                    await instance.refund(petId, {from:account});
                    $('#displayBtn').trigger('click');
                }
                buttonCell.appendChild(refundButton);

            }

            buttonCell.appendChild(button);
            petRow.appendChild(buttonCell);

            // Append the row to the table
            table.appendChild(petRow);
        }
    },

    updatePendingTable: async function(table, petIds, account) {
        // Remove all rows from the table
        while (table.firstChild) {
            table.removeChild(table.firstChild);
        }

        // Add header row back to the table
        const headerRow = document.createElement('tr');
        ['Pre Adopter', 'Pet Name', 'Pet Breed', 'Pet Age', 'Action'].forEach((text) => {
            const th = document.createElement('th');
            th.innerText = text;
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);

        const instance = await App.contracts.Adoption.deployed();

        // Fetch details for each pet and update the HTML
        for (let i = 0; i < petIds.length; i++) {
            const petId = petIds[i].toString(); // Convert BigNumber to string
            const pet = await instance.pets(petId);
            // Create a table row for each pet
            const petRow = document.createElement('tr');

            // Create cells for each detail
            this.addCell(petRow, pet[0]); // Pet ID
            this.addCell(petRow, pet[1]); // Pet Name
            this.addCell(petRow, pet[2]); // Pet Breed
            this.addCell(petRow, pet[3]); // Pet Age

            const buttonCell = document.createElement('td');
            const acButton = document.createElement('button');
            const rejButton = document.createElement('button');
            acButton.classList.add('btn');
            acButton.classList.add('btn-default');
            acButton.classList.add('btn-display');
            acButton.innerText = 'Accept';
            acButton.onclick = async function(){
                await instance.acceptTransfer(petId, {from:account});
                $('#displayBtn').trigger('click');
            }

            rejButton.classList.add('btn');
            rejButton.classList.add('btn-default');
            rejButton.classList.add('btn-display');
            rejButton.innerText = 'Reject';
            rejButton.onclick = async function(){
                await instance.rejectTransfer(petId, {from:account});
                $('#displayBtn').trigger('click');
            }

            buttonCell.appendChild(acButton);
            buttonCell.appendChild(rejButton);
            petRow.appendChild(buttonCell);

            // Append the row to the table
            table.appendChild(petRow);

        }
    },

    cancelRequest: async function(instance, petId, account){
        console.log(petId);
        console.log(account);
        await instance.cancelTransfer(petId, {from: account});
        $('#displayBtn').trigger('click');
    },

    isAddress: function(address) {
        // Check if the address is in the basic format of an Ethereum address
        return /^(0x)?[0-9a-fA-F]{40}$/i.test(address);
    }
};

$(function() {
    $(window).load(function() {
        App.init();
    });
});
  