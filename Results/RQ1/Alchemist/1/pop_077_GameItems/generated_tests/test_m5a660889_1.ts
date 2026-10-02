import { expect } from "chai";
import { ethers } } from "hardhat";

describe("GameItems mutant detection - m5a660889", function () {
  it("should revert when caller has more NRN than price (mutant uses <= instead of >=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Neuron contract first (needed for GameItems)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(owner.address, owner.address, owner.address);
    await neuron.waitForDeployment();
    
    // Deploy GameItems contract
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, owner.address);
    await gameItems.waitForDeployment();
    
    // Link Neuron to GameItems
    await gameItems.instantiateNeuronContract(await neuron.getAddress());
    
    // Give addr1 enough NRN tokens
    const mintAmount = ethers.parseEther("1000");
    await neuron.mint(addr1.address, mintAmount);
    
    // Create a game item with price = 100 NRN
    const price = ethers.parseEther("100");
    await gameItems.createGameItem(
      "Test Item",
      "ipfs://test",
      false,  // finiteSupply = false
      true,   // transferable = true
      0,      // itemsRemaining (irrelevant for infinite supply)
      price,  // itemPrice
      100     // dailyAllowance
    );
    
    // addr1 has 1000 NRN, price is 100 NRN
    // Original: balanceOf(addr1) >= price => 1000 >= 100 => true (pass)
    // Mutant:   balanceOf(addr1) <= price => 1000 <= 100 => false (revert)
    
    // Approve GameItems to spend NRN on behalf of addr1
    await neuron.connect(addr1).approve(await gameItems.getAddress(), price);
    
    // Attempt to mint - should revert with the mutant
    await expect(
      gameItems.connect(addr1).mint(0, 1)
    ).to.be.revertedWith("Not enough NRN for purchase");
  });
});