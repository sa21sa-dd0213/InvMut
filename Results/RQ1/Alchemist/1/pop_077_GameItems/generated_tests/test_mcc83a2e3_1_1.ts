import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant detection - mcc83a2e3", function () {
  it("should revert when minting quantity exceeding remaining supply for finite supply item", async function () {
    const [owner, buyer] = await ethers.getSigners();

    // Deploy GameItems with constructor arguments: owner address and treasury address
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, owner.address);
    await gameItems.waitForDeployment();

    // Deploy Neuron contract with required constructor arguments
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(
      owner.address, // ownerAddress
      owner.address, // treasuryAddress_
      owner.address  // contributorAddress
    );
    await neuron.waitForDeployment();

    // Link Neuron contract to GameItems
    await gameItems.connect(owner).instantiateNeuronContract(await neuron.getAddress());

    // Mint some NRN to buyer for purchasing game items
    await neuron.connect(owner).mint(buyer.address, ethers.parseEther("1000"));

    // Create a finite supply game item with only 5 items remaining
    await gameItems.connect(owner).createGameItem(
      "Test Item",          // name_
      "ipfs://test",       // tokenURI
      true,                // finiteSupply = true
      true,                // transferable
      5,                   // itemsRemaining = 5
      ethers.parseEther("10"), // itemPrice
      100                  // dailyAllowance
    );

    // Wait for daily allowance to be replenished
    await ethers.provider.send("evm_increaseTime", [86401]); // Add 1 day + 1 second
    await ethers.provider.send("evm_mine", []);

    // Try to mint 10 items when only 5 remain - should revert in original
    // but would succeed in mutant due to || instead of &&
    await expect(
      gameItems.connect(buyer).mint(0, 10)
    ).to.be.reverted;
  });
});