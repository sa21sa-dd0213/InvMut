import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant kill test - mb0c4f32e", function () {
  it("should revert when user has exactly the price amount of NRN (mutant requires > instead of >=)", async function () {
    const [owner, user, treasury] = await ethers.getSigners();

    // Deploy Neuron contract
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(owner.address, treasury.address, owner.address);
    await neuron.waitForDeployment();

    // Deploy GameItems contract
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, treasury.address);
    await gameItems.waitForDeployment();

    // Setup: instantiate Neuron contract reference in GameItems
    await gameItems.connect(owner).instantiateNeuronContract(await neuron.getAddress());

    // Create a game item with price = 100 NRN
    const itemPrice = ethers.parseEther("100");
    await gameItems.connect(owner).createGameItem(
      "TestItem",
      "ipfs://test",
      false,  // infinite supply
      true,   // transferable
      0,      // itemsRemaining (not used for infinite supply)
      itemPrice,
      100     // dailyAllowance
    );

    // Mint exactly 100 NRN to user
    await neuron.connect(owner).mint(user.address, itemPrice);

    // Approve GameItems to spend user's NRN
    await neuron.connect(owner).addSpender(await gameItems.getAddress());
    await neuron.connect(user).approve(await gameItems.getAddress(), itemPrice);

    // User attempts to buy 1 item with exactly the price amount
    // Original: should succeed (balance >= price)
    // Mutant: should revert (balance > price fails when equal)
    await expect(
      gameItems.connect(user).mint(0, 1)
    ).to.be.revertedWith("Not enough NRN for purchase");
  });
});