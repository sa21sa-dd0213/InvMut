import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems - Kill mutant m71a206d3 (finiteSupply == false changed to >= false)", function () {
  it("should revert when minting a finite supply item with zero items remaining", async function () {
    const [owner, buyer] = await ethers.getSigners();
    
    // Deploy GameItems
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(owner.address, owner.address);
    await gameItems.waitForDeployment();
    
    // Deploy Neuron token (needed for minting)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(
      owner.address,
      owner.address,
      owner.address
    );
    await neuron.waitForDeployment();
    
    // Set up Neuron contract reference in GameItems
    await gameItems.instantiateNeuronContract(await neuron.getAddress());
    
    // Give buyer some NRN tokens to purchase items
    await neuron.mint(buyer.address, ethers.parseEther("1000"));
    
    // Create a finite supply game item with 1 item initially
    await gameItems.createGameItem(
      "Test Item",
      "ipfs://test",
      true,  // finiteSupply = true
      true,  // transferable
      1,     // itemsRemaining = 1
      ethers.parseEther("10"), // itemPrice
      100    // dailyAllowance
    );
    
    // First purchase - should succeed (itemsRemaining becomes 0)
    await gameItems.connect(buyer).mint(0, 1);
    
    // Second purchase attempt - should revert because itemsRemaining = 0
    // Original contract: finiteSupply == true && quantity (1) <= itemsRemaining (0) fails -> revert
    // Mutant contract: finiteSupply >= false is always true, so it skips the check -> would succeed
    await expect(
      gameItems.connect(buyer).mint(0, 1)
    ).to.be.revertedWith("ERC1155: insufficient balance for transfer");
  });
});