import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant kill test - safeBatchTransferFrom transferability check", function () {
  it("should revert when transferring a batch containing a non-transferable token", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, owner.address);
    await instance.waitForDeployment();

    // Create a transferable game item (tokenId 0)
    await instance.createGameItem(
      "Transferable Item",
      "ipfs://test1",
      false,    // finiteSupply
      true,     // transferable
      100,
      ethers.parseEther("1"),
      10
    );

    // Create a non-transferable game item (tokenId 1)
    await instance.createGameItem(
      "Non-Transferable Item",
      "ipfs://test2",
      false,    // finiteSupply
      false,    // transferable = false
      100,
      ethers.parseEther("1"),
      10
    );

    // Deploy a mock Neuron contract for minting tokens
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(owner.address, owner.address, owner.address);
    await neuron.waitForDeployment();
    await instance.instantiateNeuronContract(await neuron.getAddress());

    // Give owner enough NRN tokens and approve GameItems
    const mintAmount = ethers.parseEther("1000");
    await neuron.mint(owner.address, mintAmount);
    await neuron.approve(await instance.getAddress(), mintAmount);

    // Mint the non-transferable token to owner first
    await instance.mint(1, 1);
        
    // Mint the transferable token to owner
    await instance.mint(0, 1);

    // Attempt batch transfer with both tokens - should revert because tokenId 1 is non-transferable
    await expect(
      instance.safeBatchTransferFrom(
        owner.address,
        addr1.address,
        [0, 1],   // ids array with non-transferable token
        [1, 1],   // amounts
        "0x"
      )
    ).to.be.reverted;
  });
});