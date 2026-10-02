import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant test - getAllowanceRemaining", function () {
  it("should detect mutant by checking allowance replenishment logic", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy GameItems with constructor arguments: ownerAddress, treasuryAddress
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, owner.address);
    await gameItems.waitForDeployment();
    
    // Deploy Neuron contract (needed for minting functionality)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(owner.address, owner.address, addr1.address);
    await neuron.waitForDeployment();
    
    // Set up Neuron contract reference in GameItems
    await gameItems.instantiateNeuronContract(await neuron.getAddress());
    
    // Create a game item with daily allowance of 100
    await gameItems.createGameItem(
      "TestItem",
      "https://test.uri",
      false,   // finiteSupply = false
      true,    // transferable = true
      0,       // itemsRemaining (not used since finiteSupply is false)
      ethers.parseEther("10"), // itemPrice
      100      // dailyAllowance
    );
    
    // Initially, the dailyAllowanceReplenishTime is 0 for addr1 and tokenId 0
    // Since 0 <= block.timestamp (current time), the original contract will replenish
    // The mutant with >= would NOT replenish (0 >= block.timestamp is false)
    
    // Get the allowance remaining after replenishment should happen
    const allowance = await gameItems.getAllowanceRemaining(addr1.address, 0);
    
    // Original behavior: allowance should be 100 (dailyAllowance) because replenish time (0) <= block.timestamp
    // Mutant behavior: allowance would be 0 (default) because condition (0 >= block.timestamp) is false
    expect(allowance).to.equal(100);
  });
});