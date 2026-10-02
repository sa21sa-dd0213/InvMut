import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant m3e64da58 - event emission test", function () {
  it("should emit InitializePhiNFT1155 event when initialize is called", async function () {
    const [owner] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const credChainId = 1;
    const credId = 42;
    const verificationType = "SIGNATURE";
    const protocolFeeDestination = owner.address;

    // Expect the InitializePhiNFT1155 event to be emitted with the correct parameters
    await expect(
      instance.initialize(credChainId, credId, verificationType, protocolFeeDestination)
    )
      .to.emit(instance, "InitializePhiNFT1155")
      .withArgs(credId, verificationType);
  });
});