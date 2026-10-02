import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant md75cad16 test", function () {
  it("should allow minting with quantity exceeding itemsRemaining when finiteSupply is false", async function () {
    const [owner, buyer] = await ethers.getSigners();

    // Deploy GameItems
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, owner.address);
    await gameItems.waitForDeployment();

    // Deploy Neuron contract
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(
      owner.address,
      owner.address,
      owner.address
    );
    await neuron.waitForDeployment();

    // Setup: instantiate Neuron contract in GameItems
    await gameItems.instantiateNeuronContract(await neuron.getAddress());

    // Give buyer some NRN tokens
    const mintAmount = ethers.parseEther("1000");
    await neuron.mint(buyer.address, mintAmount);

    // Create a game item with finiteSupply = false (infinite supply)
    // but set itemsRemaining to a small number (e.g., 5)
    const name = "Infinite Item";
    const tokenURI = "ipfs://test";
    const finiteSupply = false;
    const transferable = true;
    const itemsRemaining = 5; // Small remaining but finiteSupply is false
    const itemPrice = ethers.parseEther("1");
    const dailyAllowance = 100;

    await gameItems.createGameItem(
      name,
      tokenURI,
      finiteSupply,
      transferable,
      itemsRemaining,
      itemPrice,
      dailyAllowance
    );

    const tokenId = 0;

    // Approve GameItems contract to spend buyer's NRN
    const gameItemsAddress = await gameItems.getAddress();
    await neuron.connect(buyer).approve(gameItemsAddress, mintAmount);

    // Set buyer's daily allowance to be sufficient
    // First, set the replenish time to past
    // Then mint a quantity (10) that exceeds itemsRemaining (5)
    // This should succeed on original (infinite supply ignores itemsRemaining check)
    // But should revert on mutant (where != true incorrectly enforces the check)

    // Execute mint with quantity > itemsRemaining
    const mintQuantity = 10; // Exceeds itemsRemaining of 5

    // This should succeed because finiteSupply is false
    await expect(
      gameItems.connect(buyer).mint(tokenId, mintQuantity)
    ).to.not.be.reverted;

    // Verify buyer received the tokens
    expect(await gameItems.balanceOf(buyer.address, tokenId)).to.equal(mintQuantity);
  });
});