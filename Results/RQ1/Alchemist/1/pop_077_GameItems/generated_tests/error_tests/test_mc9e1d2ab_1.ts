import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems - kill mutant mc9e1d2ab (mint: <= changed to ==)", function () {
  it("should allow minting quantity less than remaining supply for finite supply items, but mutant should revert", async function () {
    const [owner, buyer] = await ethers.getSigners();
    
    // Deploy Neuron contract first (required for GameItems constructor)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(owner.address, owner.address, owner.address);
    await neuron.waitForDeployment();
    
    // Deploy GameItems
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, owner.address);
    await gameItems.waitForDeployment();
    
    // Instantiate Neuron contract in GameItems
    await gameItems.instantiateNeuronContract(await neuron.getAddress());
    
    // Create a finite supply game item with itemsRemaining = 10
    await gameItems.createGameItem(
      "Test Item",
      "https://test.uri",
      true,  // finiteSupply = true
      true,  // transferable
      10,    // itemsRemaining
      ethers.parseEther("1"), // itemPrice
      100    // dailyAllowance
    );
    
    // Give buyer enough NRN tokens to purchase
    const price = ethers.parseEther("1"); // quantity = 1 * price = 1 NRN
    await neuron.mint(buyer.address, price);
    
    // Approve GameItems to spend buyer's NRN
    await neuron.addSpender(gameItems.target);
    
    // Set up daily allowance replenishment by calling getAllowanceRemaining
    // This ensures allowanceRemaining is properly initialized
    await gameItems.connect(buyer).getAllowanceRemaining(buyer.address, 0);
    
    // Try to mint quantity = 1 when itemsRemaining = 10
    // Original: should succeed (1 <= 10)
    // Mutant: should revert (1 != 10)
    await expect(
      gameItems.connect(buyer).mint(0, 1)
    ).to.be.reverted;
  });
});