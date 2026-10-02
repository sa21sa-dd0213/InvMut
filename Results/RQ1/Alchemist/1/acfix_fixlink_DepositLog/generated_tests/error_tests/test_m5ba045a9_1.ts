import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant test for logExitedCourtesyCall", function () {
  it("should return true when calling logExitedCourtesyCall from an approved logger", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Approve addr1 as a logger
    await instance.connect(owner).setApprovedLogger(addr1.address, true);

    // Call logExitedCourtesyCall from the approved logger and expect it to return true
    const result = await instance.connect(addr1).logExitedCourtesyCall();
    expect(result).to.equal(true);
  });
});