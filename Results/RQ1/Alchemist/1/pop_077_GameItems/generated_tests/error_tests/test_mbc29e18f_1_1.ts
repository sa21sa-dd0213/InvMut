import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant mbc29e18f test", function () {
  it("should kill the mutant by testing daily allowance replenishment when time has passed", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy Neuron contract first (required by GameItems)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuronInstance = await NeuronFactory.deploy(
      owner.address,
      owner.address,
      addr1.address
    );
    await neuronInstance.waitForDeployment();
    
    // Deploy GameItems contract
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItemsInstance = await GameItemsFactory.deploy(
      owner.address,
      owner.address
    );
    await gameItemsInstance.waitForDeployment();
    
    // Instantiate Neuron contract in GameItems
    await gameItemsInstance.instantiateNeuronContract(
      await neuronInstance.getAddress()
    );
    
    // Create a game item with daily allowance
    await gameItemsInstance.createGameItem(
      "Test Item",
      "https://test.uri",
      false,  // finiteSupply = false
      true,   // transferable = true
      100,    // itemsRemaining
      ethers.parseEther("1"),  // itemPrice
      10      // dailyAllowance
    );
    
    // Mint some NRN to addr1 for purchase
    await neuronInstance.mint(addr1.address, ethers.parseEther("100"));
    
    // Set dailyAllowanceReplenishTime to a past time for addr1
    // First, make a purchase to initialize the allowance
    await neuronInstance.connect(addr1).approve(
      await gameItemsInstance.getAddress(),
      ethers.parseEther("10")
    );
    
    // Simulate a past replenish time by making an initial purchase
    await gameItemsInstance.connect(addr1).mint(0, 1);
    
    // Now set the dailyAllowanceReplenishTime to a past timestamp
    // by mining blocks to advance time
    await ethers.provider.send("evm_increaseTime", [3600]); // Advance 1 hour
    await ethers.provider.send("evm_mine", []);
    
    // Try to mint again - this should work on original (<=) but fail on mutant (==)
    // because dailyAllowanceReplenishTime < block.timestamp, not ==
    await expect(
      gameItemsInstance.connect(addr1).mint(0, 1)
    ).to.be.reverted;  // Should revert on mutant due to strict equality check
  });
});