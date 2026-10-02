import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant kill test - getAllowanceRemaining operator", function () {
  it("should kill mutant mb60a04d9 by checking allowance at exact replenish time", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy GameItems with required constructor arguments
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, owner.address);
    await instance.waitForDeployment();
    
    // Deploy Neuron contract (required for minting)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuronInstance = await NeuronFactory.deploy(owner.address, owner.address, addr1.address);
    await neuronInstance.waitForDeployment();
    
    // Set up Neuron contract in GameItems
    await instance.instantiateNeuronContract(await neuronInstance.getAddress());
    
    // Create a game item with dailyAllowance = 100
    const tokenURI = "ipfs://test";
    await instance.createGameItem("TestItem", tokenURI, false, true, 1000, ethers.parseEther("1"), 100);
    
    // Get the tokenId (should be 0 since it's the first item)
    const tokenId = 0;
    
    // Get initial allowance (should be 0 before any replenish)
    let allowance = await instance.getAllowanceRemaining(addr1.address, tokenId);
    expect(allowance).to.equal(0);
    
    // Mint some tokens to addr1 so we can trigger the replenish
    await neuronInstance.mint(addr1.address, ethers.parseEther("100"));
    
    // Now trigger a purchase to set the replenish time
    await neuronInstance.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("10"));
    await instance.connect(addr1).mint(tokenId, 1);
    
    // Get the replenish time that was set
    const replenishTime = await instance.dailyAllowanceReplenishTime(addr1.address, tokenId);
    
    // Mine blocks to reach exactly the replenish time
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(replenishTime)]);
    await ethers.provider.send("evm_mine", []);
    
    // At this point, block.timestamp == replenishTime
    // Original: dailyAllowanceReplenishTime <= block.timestamp → true → returns dailyAllowance (100)
    // Mutant: dailyAllowanceReplenishTime < block.timestamp → false → returns old remaining allowance
    
    const result = await instance.getAllowanceRemaining(addr1.address, tokenId);
    
    // If the mutant is present, it will return 0 (or the old remaining value) instead of 100
    // The original should return 100 (the dailyAllowance)
    expect(result).to.equal(100);
  });
});