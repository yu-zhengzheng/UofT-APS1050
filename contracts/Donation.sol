pragma solidity ^0.5.0;

contract Donation {
    address payable public owner;
    struct Pet {
        address payable donater;
        string name;
        string breed;
        uint age;
        uint donation;
        uint purchaseTime;
        address payable pendingTransfer;
        bool isWithdrawn;
    }


    mapping(uint => Pet) public pets;

    uint refundPeriod = 20; //14 days; // refund period

    constructor() public {
        owner = msg.sender;
    }

    // Donating a pet
    function donate(uint petId, string memory name, string memory breed, uint age, uint price) public payable returns (uint) {
        require(petId >= 0 && petId <= 15, "Pet ID is not valid");
        require(msg.value+pets[petId].donation <= price, "This pet already has maximum donation");
        uint pTime = now;
        Pet memory newPet = Pet({
            donater: msg.sender,
            name: name,
            breed: breed,
            age: age,
            donation: msg.value+pets[petId].donation, // donation of the pet is the sent Ether + accrued donation
            purchaseTime: pTime,
            pendingTransfer: address(0),
            isWithdrawn: false
        });

        pets[petId] = newPet;

        return petId;
    }

    // Retrieving the donaters
    function getDonaters() public view returns (address[] memory) {
        address[] memory donaters = new address[](16);
        for (uint i = 0; i < 16; i++) {
            donaters[i] = pets[i].donater;
        }
        return donaters;
    }
    //filt donated pets
    function getDonatedPets() public view returns (uint[] memory) {
        uint count = 0;
        for (uint i = 0; i < 16; i++) {
            if (pets[i].donater != address(0)) {
                count++;
            }
        }

        uint[] memory donatedPets = new uint[](count);
        uint index = 0;
        for (uint i = 0; i < 16; i++) {
            if (pets[i].donater != address(0)) {
                donatedPets[index] = i;
                index++;
            }
        }
        return donatedPets;
    }
    //filt donated pets
    function getAllPets() public view returns (uint[] memory) {
        uint[] memory petDonations = new uint[](16);
        for (uint i = 0; i < 16; i++) {
                petDonations[i] = pets[i].donation;
        }
        return petDonations;
    }
    //caculate totol collectable fee
    function getTotalCollectableFee() public view returns (uint) {
        uint totalCollectableFee = 0;
        for (uint i = 0; i < 16; i++) {
            if (pets[i].donater != address(0) && pets[i].isWithdrawn == false) {
                totalCollectableFee += pets[i].donation;
            }
        }
        return totalCollectableFee;
    }

    //called by the current owner of the pet to initiate a transfer
    function transferRequest(uint petId, address payable newOwner) public {
        require(pets[petId].donater == msg.sender, "Only the donater can initiate a transfer");
        require(pets[petId].pendingTransfer == address(0), "Pet is currently involved in a transfer");
        // Set a pending transfer for the pet to the new owner
        pets[petId].pendingTransfer = newOwner;
    }   

    //allows the proposed new owner to accept the pet
    function acceptTransfer(uint petId) public {
        require(pets[petId].pendingTransfer == msg.sender, "Only the proposed new owner can accept the transfer");
        // Update the donater and purchase time of the pet, reset the pending transfer
        pets[petId].donater = msg.sender;
        pets[petId].pendingTransfer = address(0);
    }
    //allows the proposed new owner to reject the pet
    function rejectTransfer(uint petId) public {
        require(pets[petId].pendingTransfer == msg.sender, "Only the proposed new owner can reject the transfer");
        // Update the donater and purchase time of the pet, reset the pending transfer
        pets[petId].pendingTransfer = address(0);
    }
    // Refunding the pet
    function refund(uint petId) public {
        require(pets[petId].donater == msg.sender, "Only the donater can refund a pet");
        require(now - pets[petId].purchaseTime <= refundPeriod, "Refund period has passed");
        require(pets[petId].pendingTransfer == address(0), "Cannot refund a pet that has a pending transfer");
        msg.sender.transfer(pets[petId].donation);

        // Reset the pet
        pets[petId] = Pet({
            donater: address(0),
            name: "",
            breed: "",
            age: 0,
            donation: 0,
            purchaseTime: 0,
            pendingTransfer: address(0),
            isWithdrawn: false
        });
    }

    //The owner can withdraw the contract
   function withdraw() public {
    require(msg.sender == owner, "Only the owner can withdraw funds");
        //uint256 amount =0;
        // Check all pets
        for (uint i = 0; i < 16; i++) {
            Pet storage pet = pets[i];

            // If a pet is donated and the refund period is over and the funds have not been withdrawn yet
            if (pet.donater != address(0) && (now - pet.purchaseTime > refundPeriod) && !pet.isWithdrawn) {

                uint256 amount = pet.donation;

                // Transfer the funds
                owner.transfer(amount);

                // Update the price and the isWithdrawn flag
                pet.isWithdrawn = true;
            }
        }
       //return amount;
    }

    //return total donations on the pet
    function getDonation(uint petId) public view returns (uint) {
        return pets[petId].donation;
    }
}

