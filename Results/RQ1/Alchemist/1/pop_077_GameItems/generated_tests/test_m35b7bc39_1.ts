import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant detection - finiteSupply boolean comparison", function () {
  it("should kill mutant m35b7bc39 by verifying that minting with finiteSupply=true and sufficient itemsRemaining works correctly", async function () {
    const [owner, buyer] = await ethers.getSigners();
    
    // Deploy Neuron contract first (required for GameItems minting)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(owner.address, owner.address, owner.address);
    await neuron.waitForDeployment();
    
    // Deploy GameItems
    const Factory = await ethers.getContractFactory("GameItems");
    const gameItems = await Factory.deploy(owner.address, owner.address);
    await gameItems.waitForDeployment();
    
    // Setup: instantiate Neuron contract reference in GameItems
    await gameItems.instantiateNeuronContract(await neuron.getAddress());
    
    // Create a game item with finiteSupply=true and itemsRemaining=10
    await gameItems.createGameItem(
      "TestItem",
      "ipfs://test",
      true,   // finiteSupply = true
      true,   // transferable
      10,     // itemsRemaining
      ethers.parseEther("1"),  // itemPrice = 1 NRN
      100     // dailyAllowance
    );
    
    // Give buyer enough NRN tokens to purchase
    const mintAmount = ethers.parseEther("100");
    await neuron.mint(buyer.address, mintAmount);
    
    // Approve GameItems contract to spend buyer's NRN
    await neuron.connect(buyer).approve(await gameItems.getAddress(), mintAmount);
    
    // Set buyer as allowed spender in Neuron contract
    await neuron.addSpender(await gameItems.getAddress());
    
    // Buyer mints 5 items (within finite supply limit of 10)
    await gameItems.connect(buyer).mint(0, 5);
    
    // Verify buyer received the tokens
    expect(await gameItems.balanceOf(buyer.address, 0)).to.equal(5);
    
    // Verify itemsRemaining decreased correctly
    expect(await gameItems.remainingSupply(0)).to.equal(5);
    
    // Now test that minting more than remaining supply reverts (finite supply check)
    // Try to mint 10 more when only 5 remain - should revert
    await expect(
      gameItems.connect(buyer).mint(0, 10)
    ).to.be.reverted;
    
    // Verify state is unchanged after failed mint
    expect(await gameItems.balanceOf(buyer.address, 0)).to.equal(5);
    expect(await gameItems.remainingSupply(0)).to.equal(5);
  });
});