import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant detection - treasuryAddress assignment", function () {
  it("should fail when treasuryAddress is set to contract itself instead of provided address", async function () {
    const [owner, treasury, buyer] = await ethers.getSigners();
    
    // Deploy Neuron token first (required for GameItems)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(
      owner.address,
      treasury.address,
      owner.address
    );
    await neuron.waitForDeployment();

    // Deploy GameItems with treasury address
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(
      owner.address,
      treasury.address
    );
    await gameItems.waitForDeployment();

    // Setup: instantiate Neuron contract in GameItems
    await gameItems.instantiateNeuronContract(await neuron.getAddress());

    // Give buyer some NRN tokens
    await neuron.mint(buyer.address, ethers.parseEther("1000"));

    // Create a game item (admin only)
    await gameItems.createGameItem(
      "Test Item",
      "https://test.uri",
      false,  // finiteSupply = false
      true,   // transferable = true
      100,    // itemsRemaining
      ethers.parseEther("10"), // itemPrice
      10      // dailyAllowance
    );

    // Add buyer as spender so they can approve spending
    await gameItems.adjustAdminAccess(buyer.address, true);
    await gameItems.setAllowedBurningAddresses(buyer.address);

    // Approve GameItems contract to spend buyer's NRN
    await neuron.connect(buyer).approve(await gameItems.getAddress(), ethers.parseEther("100"));

    // Mint one item for buyer
    await gameItems.connect(buyer).mint(0, 1);

    // Check treasury balance - if mutant is present, treasury won't have the NRN
    const treasuryBalance = await neuron.balanceOf(treasury.address);
    const contractBalance = await neuron.balanceOf(await gameItems.getAddress());
    
    // In the original, treasury should have received payment
    // In the mutant, the contract itself received payment instead
    expect(treasuryBalance).to.equal(ethers.parseEther("10"));
    expect(contractBalance).to.equal(0);
  });
});