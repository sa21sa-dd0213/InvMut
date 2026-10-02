import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls instantiateNeuronContract", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, owner.address);
    await instance.waitForDeployment();

    // Deploy a Neuron contract for testing
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuronInstance = await NeuronFactory.deploy(owner.address, owner.address, owner.address);
    await neuronInstance.waitForDeployment();

    // Attempt to call instantiateNeuronContract from a non-owner address
    await expect(
      instance.connect(addr1).instantiateNeuronContract(await neuronInstance.getAddress())
    ).to.be.reverted;
  });
});