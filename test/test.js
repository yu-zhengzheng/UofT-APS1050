const Adoption = artifacts.require("Adoption");

contract("Adoption", accounts => {
  let instance;

  beforeEach(async () => {
    instance = await Adoption.new({ from: accounts[0] });
  });

  it("should adopt a pet", async () => {
    await instance.adopt(0, "Tommy", "Husky", 5, { from: accounts[1], value: web3.utils.toWei('0.1', 'ether') });
    const pet = await instance.pets(0);
    assert.equal(pet.adopter, accounts[1], "adopter is not correct");
  });

  it("should calculate total collectable fee", async () => {
    await instance.adopt(0, "Tommy", "Husky", 5, { from: accounts[1], value: web3.utils.toWei('0.1', 'ether') });
    await instance.adopt(1, "Milo", "Bulldog", 3, { from: accounts[2], value: web3.utils.toWei('0.2', 'ether') });
    
    // Simulate passing of refund period (60 seconds in your contract)
    await web3.currentProvider.send({jsonrpc: "2.0", method: "evm_increaseTime", params: [120]}, () => {});
    
    // Mine multiple blocks to ensure that the refund period has passed
    for (let i = 0; i < 10; i++) {
        await web3.currentProvider.send({jsonrpc: "2.0", method: "evm_mine", params: []}, () => {});
    }

    const totalFee = await instance.getTotalCollectableFee();
    assert.equal(totalFee.toString(), web3.utils.toWei('0.3', 'ether'), "total fee is not correct");
});



  it("should get adopted pets", async () => {
    await instance.adopt(0, "Tommy", "Husky", 5, { from: accounts[1], value: web3.utils.toWei('0.1', 'ether') });
    await instance.adopt(1, "Milo", "Bulldog", 3, { from: accounts[2], value: web3.utils.toWei('0.2', 'ether') });
    
    const adoptedPets = await instance.getAdoptedPets();
    assert.deepEqual(adoptedPets.map(x => x.toNumber()), [0, 1], "adopted pets are not correct");
  });
});

