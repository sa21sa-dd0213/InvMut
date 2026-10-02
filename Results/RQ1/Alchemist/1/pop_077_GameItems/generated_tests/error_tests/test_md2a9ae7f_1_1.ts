import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant test - md2a9ae7f", function () {
  it("should detect mutant where <= is replaced with >= in finite supply check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const treasuryAddress = owner.address;

    // Deploy GameItems
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, treasuryAddress);
    await gameItems.waitForDeployment();

    // Deploy Neuron token (required for minting)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(owner.address, treasuryAddress, addr1.address);
    await neuron.waitForDeployment();

    // Set up Neuron contract in GameItems
    await gameItems.connect(owner).instantiateNeuronContract(await neuron.getAddress());

    // Give owner some NRN tokens for minting
    const nrnAmount = ethers.parseEther("1000");
    await neuron.connect(owner).mint(owner.address, nrnAmount);

    // Create a finite supply game item with 5 items remaining
    const itemsRemaining = 5;
    const itemPrice = ethers.parseEther("10");
    const dailyAllowance = 10;

    await gameItems.connect(owner).createGameItem(
      "Test Item",
      "https://test.uri",
      true,  // finiteSupply = true
      true,  // transferable
      itemsRemaining,
      itemPrice,
      dailyAllowance
    );

    const tokenId = 0;

    // Approve GameItems to spend NRN on behalf of owner
    await neuron.connect(owner).approveSpender(await gameItems.getAddress(), nrnAmount);

    // Mint exactly 5 items (quantity equals itemsRemaining)
    // This should succeed on original (5 <= 5) but fail on mutant (5 >= 5 is true, but logic is inverted)
    const mintQuantity = 5;

    // First mint should work on original
    await expect(
      gameItems.connect(owner).mint(tokenId, mintQuantity)
    ).to.not.be.reverted;

    // Verify the items were minted
    const balance = await gameItems.balanceOf(owner.address, tokenId);
    expect(balance).to.equal(mintQuantity);

    // Now try to mint again - on original this should fail (0 <= 0 succeeds but no items left)
    // On mutant this should also fail differently
    await expect(
      gameItems.connect(owner).mint(tokenId, 1)
    ).to.be.reverted;
  });
});