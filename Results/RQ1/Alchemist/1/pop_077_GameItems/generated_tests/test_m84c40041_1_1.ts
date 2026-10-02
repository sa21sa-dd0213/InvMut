import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when transferring a non-transferable game item (mutant m84c40041)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy Neuron contract first
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuronInstance = await NeuronFactory.deploy(owner.address, owner.address, owner.address);
    await neuronInstance.waitForDeployment();
    
    // Deploy GameItems contract
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, owner.address);
    await instance.waitForDeployment();

    // Set the Neuron contract in GameItems
    await instance.instantiateNeuronContract(await neuronInstance.getAddress());

    // Give addr1 some NRN tokens
    await neuronInstance.mint(addr1.address, ethers.parseEther("100"));

    // Create a non-transferable game item
    await instance.createGameItem(
      "NonTransferableItem",
      "ipfs://test",
      true,    // finiteSupply
      false,   // transferable = false (locked)
      100,     // itemsRemaining
      ethers.parseEther("1"), // itemPrice
      10       // dailyAllowance
    );

    // Buy the item for addr1
    await instance.connect(addr1).mint(0, 1);

    // Now try to transfer the non-transferable item - should revert
    await expect(
      instance.connect(addr1).safeTransferFrom(
        addr1.address,
        addr2.address,
        0,       // tokenId
        1,       // amount
        "0x"     // data
      )
    ).to.be.reverted;
  });
});