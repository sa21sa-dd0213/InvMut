import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant detection - finite supply check", function () {
  it("should revert when minting a finite supply item beyond its remaining supply", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy Neuron contract first (required for GameItems)
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
    
    // Setup: instantiate Neuron contract in GameItems
    await gameItems.instantiateNeuronContract(await neuron.getAddress());
    
    // Create a finite supply game item with 1 item remaining and price of 1 NRN
    const itemPrice = ethers.parseEther("1");
    const dailyAllowance = 10;
    await gameItems.createGameItem(
      "Test Item",
      "ipfs://test",
      true,  // finiteSupply = true
      true,  // transferable
      1,     // itemsRemaining = 1
      itemPrice,
      dailyAllowance
    );
    
    // Mint NRN to addr1 for purchase
    const mintAmount = ethers.parseEther("100");
    await neuron.mint(addr1.address, mintAmount);
    
    // Approve GameItems to spend NRN on behalf of addr1
    await neuron.connect(addr1).approve(await gameItems.getAddress(), mintAmount);
    
    // Mint the first (and only) finite supply item - this should succeed
    await gameItems.connect(addr1).mint(0, 1);
    
    // Now try to mint another of the same finite supply item - this should revert
    // because itemsRemaining should be 0 after the first mint
    await expect(
      gameItems.connect(addr1).mint(0, 1)
    ).to.be.reverted;
  });
});