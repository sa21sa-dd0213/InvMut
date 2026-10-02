import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant kill test", function () {
  it("should return true when calling logRedeemed from an approved logger", async function () {
    const [owner, approvedLogger] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Approve the logger
    await instance.connect(owner).setApprovedLogger(await approvedLogger.getAddress(), true);

    // Call logRedeemed from the approved logger and expect it to return true
    const tx = await instance.connect(approvedLogger).logRedeemed(ethers.ZeroHash);
    const receipt = await tx.wait();
    
    // Check that the function returned true
    const result = await instance.connect(approvedLogger).callStatic.logRedeemed(ethers.ZeroHash);
    expect(result).to.equal(true);
  });
});