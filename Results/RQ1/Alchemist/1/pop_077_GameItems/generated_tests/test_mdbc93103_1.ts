import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems - Kill mutant mdbc93103 (block.timestamp replaced with block.prevrandao)", function () {
  it("should allow minting after daily allowance replenishment time has passed, but mutant fails because block.prevrandao is used instead of block.timestamp", async function () {
    const [owner, buyer] = await ethers.getSigners();
    
    // Deploy Neuron contract first (needed for GameItems constructor)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuronInstance = await NeuronFactory.deploy(owner.address, owner.address, buyer.address);
    await neuronInstance.waitForDeployment();
    
    // Deploy GameItems
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItemsInstance = await GameItemsFactory.deploy(owner.address, owner.address);
    await gameItemsInstance.waitForDeployment();
    
    // Setup: instantiate Neuron contract in GameItems
    await gameItemsInstance.instantiateNeuronContract(await neuronInstance.getAddress());
    
    // Create a game item with daily allowance
    const tokenURI = "ipfs://test";
    const finiteSupply = false;
    const transferable = true;
    const itemsRemaining = 1000;
    const itemPrice = ethers.parseEther("1");
    const dailyAllowance = 10;
    
    await gameItemsInstance.createGameItem(
      "TestItem",
      tokenURI,
      finiteSupply,
      transferable,
      itemsRemaining,
      itemPrice,
      dailyAllowance
    );
    
    const tokenId = 0;
    
    // Give buyer enough NRN tokens
    const buyAmount = 1;
    const totalPrice = itemPrice * BigInt(buyAmount);
    await neuronInstance.connect(buyer).approve(await gameItemsInstance.getAddress(), totalPrice);
    
    // First mint should succeed (initial allowance)
    await gameItemsInstance.connect(buyer).mint(tokenId, buyAmount);
    
    // Check allowance was decremented
    let allowance = await gameItemsInstance.getAllowanceRemaining(buyer.address, tokenId);
    expect(allowance).to.equal(BigInt(dailyAllowance) - BigInt(buyAmount));
    
    // Try to mint again immediately - should fail because allowance depleted and time not advanced
    await expect(
      gameItemsInstance.connect(buyer).mint(tokenId, buyAmount)
    ).to.be.reverted;
    
    // Advance time by 1 day + 1 second to trigger replenishment
    await ethers.provider.send("evm_increaseTime", [86401]); // 1 day + 1 second
    await ethers.provider.send("evm_mine", []);
    
    // Now allowance should be replenished
    allowance = await gameItemsInstance.getAllowanceRemaining(buyer.address, tokenId);
    expect(allowance).to.equal(dailyAllowance);
    
    // This mint should succeed on original (block.timestamp comparison works),
    // but FAIL on mutant because block.prevrandao is used instead of block.timestamp
    // The mutant will incorrectly check block.prevrandao <= dailyAllowanceReplenishTime,
    // which will likely be false, causing the require to fail
    await expect(
      gameItemsInstance.connect(buyer).mint(tokenId, buyAmount)
    ).to.not.be.reverted;
  });
});