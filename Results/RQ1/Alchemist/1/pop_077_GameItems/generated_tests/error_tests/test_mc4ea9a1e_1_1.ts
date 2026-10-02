import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant mc4ea9a1e - kill test", function () {
  it("should revert mint when user has insufficient NRN balance", async function () {
    const [owner, user, treasury] = await ethers.getSigners();
    
    // Deploy Neuron contract
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(owner.address, treasury.address, owner.address);
    await neuron.waitForDeployment();
    
    // Deploy GameItems contract
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, treasury.address);
    await gameItems.waitForDeployment();
    
    // Setup: instantiate Neuron contract in GameItems
    await gameItems.connect(owner).instantiateNeuronContract(await neuron.getAddress());
    
    // Create a game item with price > 0
    await gameItems.connect(owner).createGameItem(
      "Test Item",
      "ipfs://test",
      false,  // finiteSupply = false (unlimited)
      true,   // transferable
      0,      // itemsRemaining (irrelevant for unlimited)
      ethers.parseEther("100"), // itemPrice = 100 NRN
      10      // dailyAllowance
    );
    
    // Ensure user has 0 NRN balance (they shouldn't have any tokens)
    const userBalance = await neuron.balanceOf(user.address);
    expect(userBalance).to.equal(0);
    
    // Attempt to mint 1 item - should revert because user has no NRN
    await expect(
      gameItems.connect(user).mint(0, 1)
    ).to.be.reverted;
  });
});