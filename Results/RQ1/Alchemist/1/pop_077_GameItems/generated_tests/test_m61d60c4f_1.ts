import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems reference (ethers v6)", function () {
  it("should revert when transferring a non-transferable token via safeTransferFrom", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, owner.address);
    await instance.waitForDeployment();

    // Create a game item with transferable = false
    await instance.createGameItem(
      "NonTransferableItem",
      "ipfs://test",
      false, // finiteSupply
      false, // transferable = false
      100,   // itemsRemaining
      ethers.parseEther("1"),
      10     // dailyAllowance
    );

    // Mint the item to addr1 (need to set up Neuron contract for minting)
    // Deploy Neuron contract first
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuronInstance = await NeuronFactory.deploy(
      owner.address,
      owner.address,
      owner.address
    );
    await neuronInstance.waitForDeployment();

    // Link Neuron to GameItems
    await instance.instantiateNeuronContract(await neuronInstance.getAddress());

    // Mint some NRN to addr1 so they can purchase items
    await neuronInstance.mint(addr1.address, ethers.parseEther("100"));

    // Mint the game item to addr1 (this requires allowance setup)
    await neuronInstance.approve(await instance.getAddress(), ethers.parseEther("100"));
    await instance.mint(0, 1); // mint tokenId 0, quantity 1 to owner (since msg.sender is owner)
    
    // Transfer the minted item from owner to addr1 (since owner has it)
    await instance.safeTransferFrom(owner.address, addr1.address, 0, 1, "0x");

    // Now try to transfer the non-transferable token from addr1 to addr2 - should revert
    await expect(
      instance.connect(addr1).safeTransferFrom(addr1.address, addr2.address, 0, 1, "0x")
    ).to.be.reverted;
  });
});