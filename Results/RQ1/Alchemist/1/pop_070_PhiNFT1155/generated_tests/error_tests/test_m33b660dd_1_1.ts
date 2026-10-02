import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant m33b660dd - setContractURI event emission", function () {
  it("should emit ContractURIUpdated event when setContractURI is called", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract with required parameters
    await instance.initialize(
      1, // credChainId
      1, // credId
      "test", // verificationType
      owner.address // protocolFeeDestination
    );

    // Call setContractURI and check for event emission
    await expect(instance.setContractURI())
      .to.emit(instance, "ContractURIUpdated");
  });
});