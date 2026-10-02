import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant m51dcdf0a detection", function () {
  it("should revert when minting an item with finiteSupply=false and itemsRemaining=0 on mutant, but pass on original", async function () {
    const [owner, buyer] = await ethers.getSigners();
    
    // Deploy Neuron token
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(
      owner.address,
      owner.address,
      owner.address
    );
    await neuron.waitForDeployment();
    
    // Deploy GameItems
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(
      owner.address,
      owner.address
    );
    await gameItems.waitForDeployment();
    
    // Set up Neuron contract reference in GameItems
    await gameItems.instantiateNeuronContract(await neuron.getAddress());
    
    // Make owner an admin
    await gameItems.adjustAdminAccess(owner.address, true);
    
    // Create a game item with finiteSupply=false and itemsRemaining=0
    await gameItems.createGameItem(
      "Test Item",
      "https://test.uri",
      false,  // finiteSupply = false
      true,   // transferable = true
      0,      // itemsRemaining = 0 (irrelevant for infinite supply)
      ethers.parseEther("1"),
      100     // dailyAllowance
    );
    
    // Give buyer some NRN tokens
    await neuron.mint(buyer.address, ethers.parseEther("100"));
    
    // Approve GameItems to spend buyer's NRN
    await neuron.connect(buyer).approve(await gameItems.getAddress(), ethers.parseEther("100"));
    
    // Enable daily allowance for buyer
    await gameItems.connect(buyer).setApprovalForAll(await gameItems.getAddress(), true);
    
    // The key test: try to mint 1 item of tokenId 0
    // On original: should succeed because finiteSupply=false means itemsRemaining check is skipped
    // On mutant: should fail because finiteSupply <= true evaluates to true for false,
    // so it checks quantity (1) <= itemsRemaining (0) which fails
    
    await expect(
      gameItems.connect(buyer).mint(0, 1)
    ).to.not.be.reverted; // This should pass on original but fail on mutant
    
    // Additional assertion: verify the buyer received the token
    expect(await gameItems.balanceOf(buyer.address, 0)).to.equal(1);
  });
});