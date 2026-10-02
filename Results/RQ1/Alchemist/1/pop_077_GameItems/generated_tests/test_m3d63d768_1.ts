import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems - Kill mutant m3d63d768 (remove tokenId < _itemCount check)", function () {
  it("should revert when minting a non-existent tokenId equal to _itemCount (before any items are created)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, owner.address);
    await instance.waitForDeployment();

    // Deploy a mock Neuron contract for the purchase
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(owner.address, owner.address, addr1.address);
    await neuron.waitForDeployment();

    // Set the Neuron contract reference in GameItems
    await instance.instantiateNeuronContract(await neuron.getAddress());

    // Give addr1 some NRN tokens
    await neuron.mint(addr1.address, ethers.parseEther("1000"));

    // _itemCount is 0 initially, so tokenId 0 does not exist
    const nonExistentTokenId = 0;

    // Attempt to mint a non-existent token - original reverts, mutant does not
    await expect(
      instance.connect(addr1).mint(nonExistentTokenId, 1)
    ).to.be.reverted;
  });
});