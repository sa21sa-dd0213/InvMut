import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems - kill mutant m3440bdff", function () {
  it("should successfully mint an item with infinite supply (finiteSupply = false)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Neuron token first (required by GameItems)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(
      owner.address,
      owner.address,
      addr1.address
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
    
    // Create a game item with infinite supply (finiteSupply = false)
    await gameItems.createGameItem(
      "Infinite Sword",
      "ipfs://test",
      false,  // finiteSupply = false (infinite supply)
      true,   // transferable
      0,      // itemsRemaining (not used for infinite supply)
      ethers.parseEther("10"), // itemPrice
      100     // dailyAllowance
    );
    
    // Give addr1 some NRN tokens to make the purchase
    const mintAmount = ethers.parseEther("100");
    await neuron.mint(addr1.address, mintAmount);
    
    // Add addr1 as a spender in Neuron contract (required by approveSpender)
    await neuron.addSpender(addr1.address);
    
    // Approve GameItems to spend NRN on behalf of addr1
    await neuron.connect(addr1).approve(await gameItems.getAddress(), mintAmount);
    
    // Attempt to mint 1 unit of tokenId 0 (infinite supply item)
    // This should succeed in the original but fail in the mutant
    await expect(
      gameItems.connect(addr1).mint(0, 1)
    ).to.not.be.reverted;
    
    // Verify the mint was successful
    expect(await gameItems.balanceOf(addr1.address, 0)).to.equal(1);
  });
});