import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems - kill mutant m547e7c08 (daily allowance check removed)", function () {
  it("should revert when user exceeds daily allowance, but mutant allows it", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Neuron contract first (required by GameItems)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(
      owner.address,
      owner.address,
      user.address
    );
    await neuron.waitForDeployment();

    // Deploy GameItems
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(
      owner.address,
      owner.address
    );
    await gameItems.waitForDeployment();

    // Setup: Give user enough NRN tokens
    const nrnAmount = ethers.parseEther("1000");
    await neuron.connect(owner).mint(user.address, nrnAmount);

    // Setup: Create a game item with dailyAllowance = 1
    await gameItems.connect(owner).createGameItem(
      "Test Item",
      "ipfs://test",
      false,  // finiteSupply = false
      true,   // transferable = true
      0,      // itemsRemaining (irrelevant since finiteSupply is false)
      ethers.parseEther("1"), // itemPrice
      1       // dailyAllowance = 1
    );

    // Setup: Initialize Neuron contract in GameItems
    await gameItems.connect(owner).instantiateNeuronContract(await neuron.getAddress());

    // Setup: Make user admin to set allowed burning address (not needed for this test)
    // First purchase - should succeed (within daily allowance)
    await neuron.connect(user).approve(await gameItems.getAddress(), ethers.parseEther("1"));
    await gameItems.connect(user).mint(0, 1);

    // Second purchase of same tokenId - should revert due to daily allowance exhaustion
    await neuron.connect(user).approve(await gameItems.getAddress(), ethers.parseEther("1"));
    await expect(
      gameItems.connect(user).mint(0, 1)
    ).to.be.reverted;
  });
});