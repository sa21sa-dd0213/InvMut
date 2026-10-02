import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems - kill mutant mbedcd0e0 (dailyAllowanceReplenishTime condition replaced with false)", function () {
  it("should replenish daily allowance after 1 day and allow further purchases", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Neuron contract first (needed by GameItems)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(owner.address, owner.address, addr1.address);
    await neuron.waitForDeployment();
    
    // Deploy GameItems
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, owner.address);
    await gameItems.waitForDeployment();
    
    // Set up Neuron contract reference in GameItems
    await gameItems.instantiateNeuronContract(await neuron.getAddress());
    
    // Give addr1 some NRN tokens for purchase
    await neuron.mint(addr1.address, ethers.parseEther("1000"));
    
    // Create a game item with dailyAllowance = 5
    await gameItems.createGameItem(
      "Test Item",
      "ipfs://test",
      false,  // finiteSupply = false (unlimited)
      true,   // transferable = true
      0,      // itemsRemaining (irrelevant since finiteSupply is false)
      ethers.parseEther("1"), // itemPrice = 1 NRN per item
      5       // dailyAllowance = 5
    );
    
    // addr1 buys 3 items (within daily allowance)
    await neuron.connect(addr1).approve(await gameItems.getAddress(), ethers.parseEther("3"));
    await gameItems.connect(addr1).mint(0, 3);
    
    // Verify addr1 has 3 items
    expect(await gameItems.balanceOf(addr1.address, 0)).to.equal(3);
    
    // Check remaining allowance (should be 2)
    expect(await gameItems.getAllowanceRemaining(addr1.address, 0)).to.equal(2);
    
    // addr1 buys remaining 2 items (exhausts daily allowance)
    await neuron.connect(addr1).approve(await gameItems.getAddress(), ethers.parseEther("2"));
    await gameItems.connect(addr1).mint(0, 2);
    
    // Verify addr1 has 5 items total
    expect(await gameItems.balanceOf(addr1.address, 0)).to.equal(5);
    
    // Check remaining allowance (should be 0)
    expect(await gameItems.getAllowanceRemaining(addr1.address, 0)).to.equal(0);
    
    // Attempt to buy more should fail (no allowance left)
    await neuron.connect(addr1).approve(await gameItems.getAddress(), ethers.parseEther("1"));
    await expect(
      gameItems.connect(addr1).mint(0, 1)
    ).to.be.reverted;
    
    // Fast forward 1 day + 1 second (past the replenish time)
    await ethers.provider.send("evm_increaseTime", [86401]); // 1 day + 1 second
    await ethers.provider.send("evm_mine", []);
    
    // Now allowance should be replenished to 5 (original behavior)
    // Mutant will still have allowance = 0, so this will fail on mutant
    await neuron.connect(addr1).approve(await gameItems.getAddress(), ethers.parseEther("1"));
    await gameItems.connect(addr1).mint(0, 1);
    
    // Verify addr1 has 6 items (original) - mutant would still have 5
    expect(await gameItems.balanceOf(addr1.address, 0)).to.equal(6);
    
    // Verify allowance was replenished (original) - mutant would still be 0
    expect(await gameItems.getAllowanceRemaining(addr1.address, 0)).to.equal(4);
  });
});