import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant test - m0eb15de5", function () {
  it("should emit BoughtItem event when mint function is called successfully", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy GameItems
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, owner.address);
    await gameItems.waitForDeployment();

    // Deploy Neuron contract (required for minting)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(owner.address, owner.address, addr1.address);
    await neuron.waitForDeployment();

    // Set up Neuron contract in GameItems
    await gameItems.instantiateNeuronContract(await neuron.getAddress());

    // Create a game item with finite supply, transferable, price > 0
    const tokenURI = "ipfs://test";
    const itemPrice = ethers.parseEther("10");
    const dailyAllowance = 100;

    await gameItems.createGameItem(
      "Test Item",
      tokenURI,
      true,  // finiteSupply
      true,  // transferable
      1000,  // itemsRemaining
      itemPrice,
      dailyAllowance
    );

    // Give owner some NRN tokens to purchase
    await neuron.mint(owner.address, ethers.parseEther("1000"));

    // Approve GameItems contract to spend owner's NRN
    await neuron.approveSpender(await gameItems.getAddress(), ethers.parseEther("1000"));

    // Set daily allowance replenish time to past
    // Get allowance to trigger replenish
    await gameItems.getAllowanceRemaining(owner.address, 0);

    // Purchase the item - should emit BoughtItem event
    const quantity = 1;
    const tx = await gameItems.mint(0, quantity);
    const receipt = await tx.wait();

    // Verify BoughtItem event was emitted
    await expect(tx)
      .to.emit(gameItems, "BoughtItem")
      .withArgs(owner.address, 0, quantity);
  });
});