import { expect } from "chai";
import { ethers } } from "hardhat";

describe("GameItems mutant detection - daily allowance bypass", function () {
  it("should revert when user tries to mint more than daily allowance within same day", async function () {
    const [owner, user, treasury] = await ethers.getSigners();
    
    // Deploy Neuron token first
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(owner.address, treasury.address, owner.address);
    await neuron.waitForDeployment();
    
    // Deploy GameItems
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, treasury.address);
    await gameItems.waitForDeployment();
    
    // Setup: create a game item with daily allowance of 5, price of 1 NRN, finite supply = false
    await gameItems.connect(owner).createGameItem(
      "TestItem",
      "ipfs://test",
      false,  // finiteSupply = false (unlimited)
      true,   // transferable
      0,      // itemsRemaining (irrelevant for infinite supply)
      ethers.parseEther("1"), // itemPrice = 1 NRN
      5       // dailyAllowance = 5
    );
    
    // Instantiate Neuron contract in GameItems
    await gameItems.connect(owner).instantiateNeuronContract(await neuron.getAddress());
    
    // Give user some NRN tokens
    await neuron.connect(owner).mint(user.address, ethers.parseEther("100"));
    
    // Approve GameItems to spend user's NRN
    await neuron.connect(user).approve(await gameItems.getAddress(), ethers.parseEther("100"));
    
    // First purchase: mint 5 items (full daily allowance)
    await gameItems.connect(user).mint(0, 5);
    
    // Second purchase: try to mint 1 more item within same day - should revert
    await expect(
      gameItems.connect(user).mint(0, 1)
    ).to.be.reverted;
  });
});