import { expect } from "chai";
import { ethers } } from "hardhat";

describe("GameItems - Kill mutant mfaa414b5", function () {
  it("should revert when trying to purchase more than daily allowance on the same day", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy Neuron contract first (needed by GameItems)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(owner.address, owner.address, addr1.address);
    await neuron.waitForDeployment();
    
    // Deploy GameItems
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, owner.address);
    await gameItems.waitForDeployment();
    
    // Setup: owner creates a game item with dailyAllowance = 5
    await gameItems.connect(owner).createGameItem(
      "TestItem",
      "ipfs://test",
      true,  // finiteSupply
      true,  // transferable
      100,   // itemsRemaining
      ethers.parseEther("1"), // itemPrice
      5      // dailyAllowance
    );
    
    // Setup: instantiate Neuron contract reference in GameItems
    await gameItems.connect(owner).instantiateNeuronContract(await neuron.getAddress());
    
    // Setup: Give addr1 some NRN tokens to buy items
    const mintAmount = ethers.parseEther("100");
    await neuron.connect(owner).addMinter(owner.address);
    await neuron.connect(owner).mint(addr1.address, mintAmount);
    
    // Setup: Approve GameItems to spend NRN on behalf of addr1
    await neuron.connect(addr1).approve(await gameItems.getAddress(), mintAmount);
    
    // First purchase: buy 5 items (full daily allowance)
    await gameItems.connect(addr1).mint(0, 5);
    
    // Verify addr1 has 5 items
    expect(await gameItems.balanceOf(addr1.address, 0)).to.equal(5);
    
    // Attempt second purchase on same day - should revert due to insufficient daily allowance
    await expect(
      gameItems.connect(addr1).mint(0, 1)
    ).to.be.revertedWith(
      // The mutant would allow this transaction, but original contract should revert
      // The exact revert reason depends on the condition that fails
    );
    
    // Verify balance hasn't changed after failed attempt
    expect(await gameItems.balanceOf(addr1.address, 0)).to.equal(5);
  });
});