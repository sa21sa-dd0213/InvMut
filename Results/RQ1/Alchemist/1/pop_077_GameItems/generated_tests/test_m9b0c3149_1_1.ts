import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant m9b0c3149 - finite supply validation", function () {
  it("should revert when minting quantity exceeding remaining supply for finite supply items", async function () {
    const [owner, buyer] = await ethers.getSigners();

    // Deploy Neuron contract (needed by GameItems for minting)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(owner.address, owner.address, owner.address);
    await neuron.waitForDeployment();

    // Deploy GameItems contract
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, owner.address);
    await gameItems.waitForDeployment();

    // Link Neuron contract to GameItems
    await gameItems.instantiateNeuronContract(await neuron.getAddress());

    // Give buyer some NRN tokens for purchase
    const mintAmount = ethers.parseEther("1000");
    await neuron.mint(buyer.address, mintAmount);

    // Create a finite supply game item with only 5 items remaining
    const dailyAllowance = 10; // Sufficient daily allowance
    const itemPrice = ethers.parseEther("1");
    const itemsRemaining = 5;

    await gameItems.createGameItem(
      "Test Item",
      "ipfs://test",
      true,  // finiteSupply = true
      true,  // transferable
      itemsRemaining,
      itemPrice,
      dailyAllowance
    );

    const tokenId = 0;

    // Approve GameItems contract to spend buyer's NRN
    await neuron.connect(buyer).approve(await gameItems.getAddress(), ethers.parseEther("100"));

    // Try to mint 10 items when only 5 are remaining - should revert in original but pass in mutant
    await expect(
      gameItems.connect(buyer).mint(tokenId, 10)
    ).to.be.reverted;
  });
});