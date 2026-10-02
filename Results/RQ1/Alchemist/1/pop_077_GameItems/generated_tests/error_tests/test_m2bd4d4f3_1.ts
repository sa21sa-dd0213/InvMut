import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant test - _replenishDailyAllowance multiplication", function () {
  it("should detect mutant where block.timestamp + 1 days is replaced with block.timestamp * 1 days", async function () {
    const [owner, buyer] = await ethers.getSigners();
    
    // Deploy Neuron contract first (required for GameItems)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(owner.address, owner.address, owner.address);
    await neuron.waitForDeployment();
    
    // Deploy GameItems
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, owner.address);
    await gameItems.waitForDeployment();
    
    // Setup: Instantiate Neuron contract in GameItems
    await gameItems.instantiateNeuronContract(await neuron.getAddress());
    
    // Create a game item with daily allowance
    const dailyAllowance = 10;
    const itemPrice = ethers.parseEther("1");
    await gameItems.createGameItem(
      "TestItem",
      "ipfs://test",
      false,  // finiteSupply = false
      true,   // transferable = true
      100,    // itemsRemaining
      itemPrice,
      dailyAllowance
    );
    
    // Give buyer some NRN tokens
    const buyerNrnAmount = ethers.parseEther("100");
    await neuron.mint(buyer.address, buyerNrnAmount);
    
    // Approve GameItems to spend buyer's NRN
    await neuron.connect(buyer).approve(await gameItems.getAddress(), buyerNrnAmount);
    
    // Add buyer as spender in Neuron
    await neuron.addSpender(buyer.address);
    
    // First purchase - should succeed
    const tokenId = 0;
    const quantity1 = 3;
    await gameItems.connect(buyer).mint(tokenId, quantity1);
    
    // Check allowance was reduced
    let allowance1 = await gameItems.getAllowanceRemaining(buyer.address, tokenId);
    expect(allowance1).to.equal(dailyAllowance - quantity1);
    
    // Second purchase within same day - should succeed if allowance remaining
    const quantity2 = 5;
    await gameItems.connect(buyer).mint(tokenId, quantity2);
    
    // Check allowance was reduced further
    let allowance2 = await gameItems.getAllowanceRemaining(buyer.address, tokenId);
    expect(allowance2).to.equal(dailyAllowance - quantity1 - quantity2);
    
    // Third purchase that would exceed daily allowance - should fail on original but succeed on mutant
    // because mutant sets replenish time to huge value, never replenishing
    const quantity3 = 3; // This would make total = 11 > dailyAllowance of 10
    await expect(
      gameItems.connect(buyer).mint(tokenId, quantity3)
    ).to.be.reverted;
  });
});