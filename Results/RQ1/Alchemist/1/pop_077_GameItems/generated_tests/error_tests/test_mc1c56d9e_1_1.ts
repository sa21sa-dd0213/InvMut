import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems - kill mutant mc1c56d9e", function () {
  it("should allow minting exact remaining supply when finiteSupply is true", async function () {
    const [owner, buyer] = await ethers.getSigners();
    
    // Deploy Neuron contract first (needed for GameItems constructor interaction)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(owner.address, owner.address, owner.address);
    await neuron.waitForDeployment();
    
    // Deploy GameItems
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, owner.address);
    await gameItems.waitForDeployment();
    
    // Link Neuron contract to GameItems
    await gameItems.connect(owner).instantiateNeuronContract(await neuron.getAddress());
    
    // Create a finite supply game item with itemsRemaining = 5
    await gameItems.connect(owner).createGameItem(
      "TestItem",
      "ipfs://test",
      true,   // finiteSupply = true
      true,   // transferable
      5,      // itemsRemaining
      ethers.parseEther("1"), // itemPrice
      100     // dailyAllowance
    );
    
    // Give buyer enough NRN tokens to purchase
    const price = ethers.parseEther("5"); // 5 items * 1 NRN each
    await neuron.connect(owner).mint(buyer.address, price);
    
    // Approve GameItems to spend buyer's NRN (GameItems uses approveSpender)
    await neuron.connect(buyer).approve(await gameItems.getAddress(), price);
    
    // Mint exactly the remaining supply (5 items)
    // This should succeed in original but fail in mutant because mutant uses < instead of <=
    await expect(
      gameItems.connect(buyer).mint(0, 5)
    ).to.not.be.reverted;
    
    // Verify the mint happened
    expect(await gameItems.balanceOf(buyer.address, 0)).to.equal(5);
    
    // Verify remaining supply is now 0
    expect(await gameItems.remainingSupply(0)).to.equal(0);
  });
});