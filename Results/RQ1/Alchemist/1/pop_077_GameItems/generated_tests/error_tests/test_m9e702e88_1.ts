import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant m9e702e88 detection test", function () {
  it("should detect mutant where >= replaces <= in daily allowance replenishment check", async function () {
    const [owner, buyer] = await ethers.getSigners();
    
    // Deploy Neuron token first (required by GameItems)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuronInstance = await NeuronFactory.deploy(
      owner.address,
      owner.address,
      owner.address
    );
    await neuronInstance.waitForDeployment();
    
    // Deploy GameItems
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItemsInstance = await GameItemsFactory.deploy(
      owner.address,
      owner.address
    );
    await gameItemsInstance.waitForDeployment();
    
    // Instantiate Neuron contract in GameItems
    await gameItemsInstance.instantiateNeuronContract(await neuronInstance.getAddress());
    
    // Create a game item with dailyAllowance of 5, finiteSupply = false, transferable = true
    await gameItemsInstance.createGameItem(
      "TestItem",
      "ipfs://test",
      false,  // finiteSupply = false
      true,   // transferable = true
      100,    // itemsRemaining
      ethers.parseEther("10"), // itemPrice
      5       // dailyAllowance
    );
    
    // Give buyer enough NRN tokens to purchase
    const mintAmount = ethers.parseEther("100");
    await neuronInstance.mint(buyer.address, mintAmount);
    
    // Buyer purchases 1 item (this triggers allowance replenishment)
    await gameItemsInstance.connect(buyer).mint(0, 1);
    
    // Get the block timestamp to understand replenish time
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const timestampBefore = blockBefore.timestamp;
    
    // Immediately try to purchase another item within the same day
    // Original: should succeed because allowance was just replenished to 5, and we only used 1
    // Mutant: should fail because >= block.timestamp condition incorrectly triggers
    // replenishment logic, potentially causing underflow or revert
    
    // First verify allowance was replenished
    const allowanceAfterFirstMint = await gameItemsInstance.getAllowanceRemaining(buyer.address, 0);
    expect(allowanceAfterFirstMint).to.equal(4); // Started with 5, used 1
    
    // Second purchase should succeed on original but fail on mutant
    await expect(
      gameItemsInstance.connect(buyer).mint(0, 1)
    ).to.not.be.reverted;
    
    // Verify allowance decreased properly
    const allowanceAfterSecondMint = await gameItemsInstance.getAllowanceRemaining(buyer.address, 0);
    expect(allowanceAfterSecondMint).to.equal(3); // Should be 3 after second purchase
  });
});