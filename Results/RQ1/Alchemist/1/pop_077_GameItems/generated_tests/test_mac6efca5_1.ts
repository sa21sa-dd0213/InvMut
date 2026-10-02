import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems - getAllowanceRemaining mutant test", function () {
  it("should return reduced allowance when replenish time has not passed, killing mutant that always returns full allowance", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy GameItems
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, owner.address);
    await gameItems.waitForDeployment();
    
    // Deploy Neuron (required for minting)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(owner.address, owner.address, owner.address);
    await neuron.waitForDeployment();
    
    // Setup: instantiate Neuron contract in GameItems
    await gameItems.instantiateNeuronContract(await neuron.getAddress());
    
    // Create a game item with daily allowance
    const tokenId = 0;
    const dailyAllowance = 100;
    await gameItems.createGameItem(
      "Test Item",
      "ipfs://test",
      false,  // finiteSupply = false
      true,   // transferable
      0,      // itemsRemaining (irrelevant since finiteSupply is false)
      0,      // itemPrice = 0 (free)
      dailyAllowance
    );
    
    // User mints some items to initialize their allowance
    await gameItems.connect(user).mint(tokenId, 50);
    
    // Now user has used 50 of their 100 daily allowance
    // Check allowance remaining - should be 50 (not 100) since replenish time hasn't passed
    const remainingAllowance = await gameItems.getAllowanceRemaining(user.address, tokenId);
    
    // In the original contract, this returns 50 (since only 50 were used and time hasn't reset)
    // In the mutant, it returns 100 (full allowance) because condition is always true
    expect(remainingAllowance).to.equal(50);
  });
});