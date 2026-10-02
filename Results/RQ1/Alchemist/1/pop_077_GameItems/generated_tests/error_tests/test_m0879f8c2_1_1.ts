import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant kill test - m0879f8c2", function () {
  it("should revert when minting with a valid tokenId that exists (tokenId < _itemCount) on the mutant, while succeeding on original", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy GameItems
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, owner.address);
    await gameItems.waitForDeployment();

    // Deploy Neuron contract (required for minting)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(owner.address, owner.address, addr1.address);
    await neuron.waitForDeployment();

    // Link Neuron to GameItems
    await gameItems.instantiateNeuronContract(await neuron.getAddress());

    // Create a game item (tokenId = 0)
    await gameItems.createGameItem(
      "Test Item",
      "ipfs://test",
      false,  // finiteSupply = false (unlimited)
      true,   // transferable
      0,      // itemsRemaining (ignored since finiteSupply is false)
      ethers.parseEther("1"),  // itemPrice = 1 NRN
      100     // dailyAllowance
    );

    // Give addr1 some NRN tokens to purchase
    const mintAmount = ethers.parseEther("100");
    await neuron.mint(addr1.address, mintAmount);

    // Also give addr1 allowance to spend NRN for the mint
    // The mint function calls approveSpender, but we need to ensure the spender role is set
    await neuron.addSpender(await gameItems.getAddress());

    // Now try to mint tokenId = 0 (which exists, since _itemCount = 1)
    // This should succeed on original (tokenId < _itemCount = 0 < 1)
    // But should fail on mutant (tokenId > _itemCount = 0 > 1 is false)
    await expect(
      gameItems.connect(addr1).mint(0, 1)
    ).to.be.reverted;
  });
});