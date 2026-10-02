import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant m39516482 - OR to AND in mint function", function () {
  it("should kill mutant by minting a finite supply item when sufficient items remain", async function () {
    const [owner, addr1, treasury] = await ethers.getSigners();
    
    // Deploy Neuron contract (needed for GameItems)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(owner.address, treasury.address, addr1.address);
    await neuron.waitForDeployment();
    
    // Deploy GameItems contract
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, treasury.address);
    await gameItems.waitForDeployment();
    
    // Setup: instantiate Neuron contract in GameItems
    await gameItems.instantiateNeuronContract(await neuron.getAddress());
    
    // Create a finite supply game item with 10 items remaining
    await gameItems.createGameItem(
      "Test Item",
      "ipfs://test",
      true,  // finiteSupply = true
      true,  // transferable
      10,    // itemsRemaining
      ethers.parseEther("1"),  // itemPrice
      100    // dailyAllowance
    );
    
    // Give addr1 enough NRN to purchase
    const mintAmount = ethers.parseEther("100");
    await neuron.mint(addr1.address, mintAmount);
    
    // Approve GameItems to spend addr1's NRN
    await neuron.connect(addr1).approve(await gameItems.getAddress(), ethers.parseEther("10"));
    
    // Attempt to mint 5 items (which should succeed since 5 <= 10 itemsRemaining)
    // Original: condition passes (finiteSupply == true && quantity <= itemsRemaining)
    // Mutant: condition fails (finiteSupply == false && ...) is impossible since finiteSupply is true
    await expect(
      gameItems.connect(addr1).mint(0, 5)
    ).to.not.be.reverted;
    
    // Verify the mint actually happened
    expect(await gameItems.balanceOf(addr1.address, 0)).to.equal(5);
  });
});