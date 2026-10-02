import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant kill test - mee9ecac9", function () {
  it("should allow minting with quantity less than daily allowance (kills mutant that uses == instead of <=)", async function () {
    const [owner, buyer, treasury] = await ethers.getSigners();

    // Deploy Neuron token first (required by GameItems)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(owner.address, treasury.address, owner.address);
    await neuron.waitForDeployment();

    // Deploy GameItems
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, treasury.address);
    await gameItems.waitForDeployment();

    // Setup: instantiate Neuron contract in GameItems
    await gameItems.instantiateNeuronContract(await neuron.getAddress());

    // Create a game item with daily allowance of 5
    await gameItems.createGameItem(
      "Test Item",
      "https://test.uri",
      false, // finiteSupply = false (unlimited)
      true,  // transferable = true
      100,   // itemsRemaining
      ethers.parseEther("1"), // itemPrice = 1 NRN
      5      // dailyAllowance = 5
    );

    // Give buyer some NRN tokens
    await neuron.transfer(buyer.address, ethers.parseEther("10"));

    // Buyer approves GameItems to spend NRN
    await neuron.connect(buyer).approve(await gameItems.getAddress(), ethers.parseEther("10"));

    // Add buyer as spender in Neuron contract (required for transferFrom)
    await neuron.addSpender(buyer.address);

    // Mint 3 items (less than daily allowance of 5) - should succeed in original, fail in mutant
    await expect(
      gameItems.connect(buyer).mint(0, 3)
    ).to.not.be.reverted;

    // Verify the mint was successful
    expect(await gameItems.balanceOf(buyer.address, 0)).to.equal(3);
  });
});