pragma solidity ^0.5.0;

contract Adoption {
    address payable public owner;
    struct Pet {
        address payable adopter;
        string name;
        string breed;
        uint age;
        uint price;
        uint purchaseTime;
        address payable pendingTransfer;
        bool isWithdrawn;
    }


    mapping(uint => Pet) public pets;

    uint refundPeriod = 20; //14 days; // refund period

    constructor() public {
        owner = msg.sender;
    }

    // Adopting a pet
    function adopt(uint petId, string memory name, string memory breed, uint age) public payable returns (uint) {
        require(petId >= 0 && petId <= 15, "Pet ID is not valid");
        require(pets[petId].adopter == address(0), "This pet has been adopted");
        uint pTime = now;
        Pet memory newPet = Pet({
            adopter: msg.sender,
            name: name,
            breed: breed,
            age: age,
            price: msg.value, // price of the pet is the sent Ether
            purchaseTime: pTime,
            pendingTransfer: address(0),
            isWithdrawn: false
        });

        pets[petId] = newPet;

        return petId;
    }

    // Retrieving the adopters
    function getAdopters() public view returns (address[] memory) {
        address[] memory adopters = new address[](16);
        for (uint i = 0; i < 16; i++) {
            adopters[i] = pets[i].adopter;
        }
        return adopters;
    }
    //filt adopted pets
    function getAdoptedPets() public view returns (uint[] memory) {
        uint count = 0;
        for (uint i = 0; i < 16; i++) {
            if (pets[i].adopter != address(0)) {
                count++;
            }
        }

        uint[] memory adoptedPets = new uint[](count);
        uint index = 0;
        for (uint i = 0; i < 16; i++) {
            if (pets[i].adopter != address(0)) {
                adoptedPets[index] = i;
                index++;
            }
        }
        return adoptedPets;
    }
    //caculate totol collectable fee
    function getTotalCollectableFee() public view returns (uint) {
        uint totalCollectableFee = 0;
        for (uint i = 0; i < 16; i++) {
            if (pets[i].adopter != address(0) && pets[i].isWithdrawn == false) {
                totalCollectableFee += pets[i].price;
            }
        }
        return totalCollectableFee;
    }

    //called by the current owner of the pet to initiate a transfer
    function transferRequest(uint petId, address payable newOwner) public {
        require(pets[petId].adopter == msg.sender, "Only the adopter can initiate a transfer");
        require(pets[petId].pendingTransfer == address(0), "Pet is currently involved in a transfer");
        require(newOwner != msg.sender, "Can not transfer to youself");
        // Set a pending transfer for the pet to the new owner
        pets[petId].pendingTransfer = newOwner;
    }   

    //allows the proposed new owner to accept the pet
    function acceptTransfer(uint petId) public {
        require(pets[petId].pendingTransfer == msg.sender, "Only the proposed new owner can accept the transfer");
        // Update the adopter and purchase time of the pet, reset the pending transfer
        pets[petId].adopter = msg.sender;
        pets[petId].pendingTransfer = address(0);
    }
    //allows the proposed new owner to reject the pet
    function rejectTransfer(uint petId) public {
        require(pets[petId].pendingTransfer == msg.sender, "Only the proposed new owner can reject the transfer");
        // Update the adopter and purchase time of the pet, reset the pending transfer
        pets[petId].pendingTransfer = address(0);
    }
    // Refunding the pet
    function refund(uint petId) public {
        require(pets[petId].adopter == msg.sender, "Only the adopter can refund a pet");
        require(now - pets[petId].purchaseTime <= refundPeriod, "Refund period has passed");
        require(pets[petId].pendingTransfer == address(0), "Cannot refund a pet that has a pending transfer");
        msg.sender.transfer(pets[petId].price);

        // Reset the pet
        pets[petId] = Pet({
            adopter: address(0),
            name: "",
            breed: "",
            age: 0,
            price: 0,
            purchaseTime: 0,
            pendingTransfer: address(0),
            isWithdrawn: false
        });
    }

    function cancelTransfer(uint petId) public {
        require(pets[petId].adopter == msg.sender, "Only the adopter can cancel a transfer");
        require(pets[petId].pendingTransfer != address(0), "Pet is currently not involved in a transfer");
        // cancel a pending transfer 
        pets[petId].pendingTransfer = address(0);
    }

    //The owner can withdraw the contract
   function withdraw() public {
        require(msg.sender == owner, "Only the owner can withdraw funds");
        // Check all pets
        for (uint i = 0; i < 16; i++) {
            Pet storage pet = pets[i];

            // If a pet is adopted and the refund period is over and the funds have not been withdrawn yet
            if (pet.adopter != address(0) && (now - pet.purchaseTime > refundPeriod) && !pet.isWithdrawn) {

                uint256 amount = pet.price;

                // Transfer the funds
                owner.transfer(amount);

                // Update the price and the isWithdrawn flag
                pet.isWithdrawn = true;
            }
        }
    }

    function getMyAdoptedPets() public view returns (uint[] memory) {
        uint countAdopted = 0;
        
        for (uint i = 0; i < 16; i++) {
            if (pets[i].adopter == msg.sender) {
                countAdopted++;
            } 
        }

        // Create array of pet IDs
        uint[] memory adoptedPets = new uint[](countAdopted);

        countAdopted = 0;

        for (uint i = 0; i < 16; i++) {
            if (pets[i].adopter == msg.sender) {
                adoptedPets[countAdopted] = i;
                countAdopted++;
            } 
        }
        
        return adoptedPets;
    }


    function getMyPendingPets() public view returns (uint[] memory) {
        uint countPending = 0;

        for (uint i = 0; i < 16; i++) {
            if (pets[i].pendingTransfer == msg.sender) {
                countPending++;
            }
        }

        // Create array of pet IDs
        uint[] memory pendingPets = new uint[](countPending);

        countPending = 0;

        for (uint i = 0; i < 16; i++) {
            if (pets[i].pendingTransfer == msg.sender) {
                pendingPets[countPending] = i;
                countPending++;
            }
        }
        
        return pendingPets;
    }



}

