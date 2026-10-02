import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems - Kill mutant m693bb87c (daily allowance replenish condition)", function () {
  it("should replenish daily allowance after 1 day passes and allow another purchase", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy Neuron contract first (needed by GameItems)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(owner.address, owner.address, addr1.address);
    await neuron.waitForDeployment();
    
    // Deploy GameItems
    const Factory = await ethers.getContractFactory("GameItems");
    const gameItems = await Factory.deploy(owner.address, owner.address);
    await gameItems.waitForDeployment();
    
    // Setup: instantiate Neuron contract in GameItems
    await gameItems.instantiateNeuronContract(await neuron.getAddress());
    
    // Create a game item with daily allowance = 5, finiteSupply = false, transferable = true
    // Using admin (owner) to create the item
    await gameItems.createGameItem(
      "TestItem",
      "ipfs://test",
      false,  // finiteSupply = false
      true,   // transferable = true
      1000,   // itemsRemaining (irrelevant since finiteSupply is false)
      ethers.parseEther("10"),  // itemPrice = 10 NRN
      5        // dailyAllowance = 5
    );
    
    // Fund addr1 with enough NRN for purchases
    // First mint some NRN to addr1
    await neuron.addMinter(owner.address);
    await neuron.mint(addr1.address, ethers.parseEther("100"));
    
    // First purchase: buy 3 items (within daily allowance of 5)
    await gameItems.connect(addr1).mint(0, 3);
    
    // Verify allowance remaining after first purchase
    let allowanceRemaining = await gameItems.getAllowanceRemaining(addr1.address, 0);
    expect(allowanceRemaining).to.equal(2); // 5 - 3 = 2
    
    // Fast forward time by 1 day + 1 second to ensure replenish time has passed
    await ethers.provider.send("evm_increaseTime", [86401]); // 1 day + 1 second
    await ethers.provider.send("evm_mine", []);
    
    // Second purchase: buy 4 items (allowance should have been replenished to 5)
    // This should succeed on original (replenished to 5, so 4 <= 5)
    // This should fail on mutant (allowance still 2 from before, so 4 > 2)
    await gameItems.connect(addr1).mint(0, 4);
    
    // Verify balance: should have 3 + 4 = 7 items
    const balance = await gameItems.balanceOf(addr1.address, 0);
    expect(balance).to.equal(7);
    
    // Verify allowance remaining after second purchase
    allowanceRemaining = await gameItems.getAllowanceRemaining(addr1.address, 0);
    expect(allowanceRemaining).to.equal(1); // 5 - 4 = 1
  });
});