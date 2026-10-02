import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant kill test - mdb5c5f7e", function () {
  it("should detect mutation where price calculation uses addition instead of multiplication", async function () {
    const [owner, buyer, treasury] = await ethers.getSigners();

    // Deploy Neuron contract first (required for GameItems)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(owner.address, treasury.address, buyer.address);
    await neuron.waitForDeployment();

    // Deploy GameItems
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, treasury.address);
    await gameItems.waitForDeployment();

    // Set up: instantiate Neuron contract in GameItems
    await gameItems.connect(owner).instantiateNeuronContract(await neuron.getAddress());

    // Create a game item with price = 100 NRN per unit
    const itemPrice = ethers.parseEther("100");
    const dailyAllowance = 10;
    await gameItems.connect(owner).createGameItem(
      "TestItem",
      "ipfs://test",
      false, // finiteSupply = false (unlimited)
      true,  // transferable
      0,     // itemsRemaining (ignored since finiteSupply is false)
      itemPrice,
      dailyAllowance
    );

    // Give buyer enough NRN to buy 2 items at correct price (200 NRN) 
    // but not enough for the mutant price (100 + 2 = 102 NRN)
    const buyerBalance = ethers.parseEther("150"); // More than mutant price (102) but less than correct price (200)
    await neuron.connect(owner).mint(buyer.address, buyerBalance);

    // Buyer approves GameItems to spend NRN
    await neuron.connect(buyer).approve(await gameItems.getAddress(), buyerBalance);

    // Attempt to buy 2 items - should fail on original (not enough NRN for 200)
    // but would succeed on mutant (150 >= 102)
    // This test will pass (detect mutation) if the transaction reverts
    // If mutant is present, it will succeed and the test will fail
    await expect(
      gameItems.connect(buyer).mint(0, 2)
    ).to.be.revertedWith("Not enough NRN for purchase");
  });
});