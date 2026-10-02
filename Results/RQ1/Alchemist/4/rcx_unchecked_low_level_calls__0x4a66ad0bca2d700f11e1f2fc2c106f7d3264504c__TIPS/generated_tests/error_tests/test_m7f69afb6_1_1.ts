import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m7f69afb6 test", function () {
  it("should revert when called from unauthorized address in original, but not in mutant", async function () {
    const [owner, unauthorized] = await ethers.getSigners();

    // Deploy contract - no constructor arguments needed for EBU
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup test data
    const recipients = [unauthorized.address];
    const amounts = [1]; // 1 token

    // Attempt to call transfer from unauthorized address
    // Original contract should revert due to require(msg.sender == owner)
    // Mutant (without require) should succeed, so this test will fail on mutant
    await expect(
      instance.connect(unauthorized).transfer(recipients, amounts)
    ).to.be.reverted;
  });
});