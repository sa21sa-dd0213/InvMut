import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant kill test", function () {
  it("should kill mutant m2520057d by calling enforceTolerance with v1=0 and v2=0 expecting no revert", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a minimal mock DAO contract that returns the flash governor address
    const MockDAO = await ethers.getContractFactory("MockLimboDAO");
    const mockDAO = await MockDAO.deploy();
    await mockDAO.waitForDeployment();

    // Deploy the FlashGovernanceArbiter with the mock DAO address
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();

    // Configure the DAO to be able to call setDAO and set up the governor
    await instance.setDAO(await mockDAO.getAddress());

    // Call enforceTolerance with v1=0 and v2=0 - this should pass in original but fail in mutant
    // The mutant changes require(v1 <= 1) to require(v1 == 1), so v1=0 should fail in mutant
    await expect(
      instance.connect(addr1).enforceTolerance(0, 0)
    ).to.not.be.reverted;
  });
});