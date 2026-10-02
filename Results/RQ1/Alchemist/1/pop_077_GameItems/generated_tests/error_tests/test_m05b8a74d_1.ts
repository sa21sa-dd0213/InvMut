import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant test - treasuryAddress set to address(0)", function () {
  it("should revert when trying to mint tokens because NRN transfer to zero address fails", async function () {
    const [owner, treasury, contributor, buyer] = await ethers.getSigners();
    
    // Deploy Neuron contract first (required for GameItems)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuronInstance = await NeuronFactory.deploy(
      owner.address,
      treasury.address,
      contributor.address
    );
    await neuronInstance.waitForDeployment();

    // Deploy GameItems contract with the treasury address
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItemsInstance = await GameItemsFactory.deploy(
      owner.address,
      treasury.address
    );
    await gameItemsInstance.waitForDeployment();

    // Setup: instantiate Neuron contract in GameItems
    await gameItemsInstance.connect(owner).instantiateNeuronContract(
      await neuronInstance.getAddress()
    );

    // Create a game item that can be purchased
    await gameItemsInstance.connect(owner).createGameItem(
      "TestItem",
      "https://test.uri/",
      false,  // finiteSupply = false (unlimited)
      true,   // transferable = true
      1000,   // itemsRemaining
      ethers.parseEther("10"), // itemPrice = 10 NRN
      100     // dailyAllowance
    );

    // Fund buyer with NRN and approve GameItems to spend
    await neuronInstance.connect(owner).mint(buyer.address, ethers.parseEther("100"));
    await neuronInstance.connect(buyer).approve(
      await gameItemsInstance.getAddress(),
      ethers.parseEther("100")
    );

    // Attempt to mint - this should fail because the treasury is set to address(0)
    // in the mutant, and transferFrom to zero address will revert
    await expect(
      gameItemsInstance.connect(buyer).mint(0, 1)
    ).to.be.reverted;

    // Verify that buyer still has their NRN (transfer didn't succeed)
    expect(await neuronInstance.balanceOf(buyer.address)).to.equal(ethers.parseEther("100"));
  });
});