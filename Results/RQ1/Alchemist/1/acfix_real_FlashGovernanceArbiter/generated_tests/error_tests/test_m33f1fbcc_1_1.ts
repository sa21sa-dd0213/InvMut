import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant kill test - m33f1fbcc", function () {
  it("should revert enforceToleranceInt when configured and tolerance is exceeded, but mutant returns early", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy FlashGovernanceArbiter
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // We need to set up a DAO that can configure the contract
    // Deploy a mock LimboDAO that returns proper values for proposalConfig and successfulProposal
    const LimboDAOMock = await ethers.getContractFactory("LimboDAOMock");
    const daoMock = await LimboDAOMock.deploy();
    await daoMock.waitForDeployment();

    // Set DAO to our mock
    await instance.setDAO(await daoMock.getAddress());

    // Configure the contract to set configured = true via endConfiguration
    await instance.endConfiguration();

    // Now configure security parameters with a small changeTolerance
    // changeTolerance must be < 100, set to 10 (10%)
    await instance.connect(owner).configureSecurityParameters(
      10,    // maxGovernanceChangePerEpoch
      100,   // epochSize
      10     // changeTolerance (10%)
    );

    // Call enforceToleranceInt with values that exceed 10% tolerance
    // v1 = 100, v2 = 200 (100% difference, exceeds 10% tolerance)
    // In the original: !configured is false (since configured = true), so it proceeds
    // Then enforceTolerance is called and should revert because difference exceeds tolerance
    // In the mutant: if (true) return; so it returns early without checking

    await expect(
      instance.connect(owner).enforceToleranceInt(100, 200)
    ).to.be.revertedWith("FE1");
  });
});