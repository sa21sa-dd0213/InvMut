import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant kill test - md2accb67", function () {
  it("should allow minting when dailyAllowanceReplenishTime is less than block.timestamp (original) vs fail on mutant with == comparison", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Neuron contract (needed for GameItems)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuronInstance = await NeuronFactory.deploy(owner.address, owner.address, addr1.address);
    await neuronInstance.waitForDeployment();
    
    // Deploy GameItems
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItemsInstance = await GameItemsFactory.deploy(owner.address, owner.address);
    await gameItemsInstance.waitForDeployment();
    
    // Set up Neuron contract reference in GameItems
    await gameItemsInstance.instantiateNeuronContract(await neuronInstance.getAddress());
    
    // Create a game item with dailyAllowance > 0
    const tokenName = "TestItem";
    const tokenURI = "https://test.com/token";
    const finiteSupply = false;
    const transferable = true;
    const itemsRemaining = 1000;
    const itemPrice = ethers.parseEther("1");
    const dailyAllowance = 10;
    
    await gameItemsInstance.createGameItem(
      tokenName,
      tokenURI,
      finiteSupply,
      transferable,
      itemsRemaining,
      itemPrice,
      dailyAllowance
    );
    
    // Fund addr1 with Neuron tokens for purchase
    const mintAmount = ethers.parseEther("100");
    await neuronInstance.mint(addr1.address, mintAmount);
    
    // Set up allowance for addr1 to spend Neuron
    await neuronInstance.addSpender(owner.address);
    await neuronInstance.approveSpender(addr1.address, mintAmount);
    
    // Get current timestamp and set dailyAllowanceReplenishTime to past
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const pastTimestamp = blockBefore.timestamp - 86400; // 1 day ago
    
    // Set allowanceRemaining to 0 and dailyAllowanceReplenishTime to past
    // This simulates a user who has used their daily allowance yesterday
    await ethers.provider.send("evm_setNextBlockTimestamp", [pastTimestamp]);
    await ethers.provider.send("evm_mine", []);
    
    // Now advance time to current (past the replenish time)
    const currentTime = pastTimestamp + 86401; // 1 second past the replenish time
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTime]);
    await ethers.provider.send("evm_mine", []);
    
    // Attempt to mint - should succeed on original but fail on mutant
    // because dailyAllowanceReplenishTime (pastTimestamp) != block.timestamp (currentTime)
    // but dailyAllowanceReplenishTime (pastTimestamp) <= block.timestamp (currentTime) is true
    const quantity = 1;
    const price = itemPrice * BigInt(quantity);
    
    // First approve GameItems to spend Neuron from addr1
    await neuronInstance.connect(addr1).approve(await gameItemsInstance.getAddress(), price);
    
    // Now try to mint
    const tx = gameItemsInstance.connect(addr1).mint(0, quantity);
    
    // On original contract this should succeed
    // On mutant this should revert because == comparison fails
    await expect(tx).to.not.be.reverted;
  });
});