import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection test", function () {
  it("should revert when a transferFrom call fails, killing the mutant that removed revert()", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a token contract that will reject transferFrom calls
    const RejectingToken = await ethers.getContractFactory("contracts/RejectingToken.sol:RejectingToken");
    const rejectingToken = await RejectingToken.deploy();
    await rejectingToken.waitForDeployment();

    // Prepare arrays: one recipient, one value
    const recipients = [addr1.address];
    const values = [ethers.parseEther("1")];

    // This call should revert because the token contract's transferFrom will fail
    // The original contract reverts on failure; the mutant silently continues
    await expect(
      instance.connect(owner).transfer(owner.address, rejectingToken.target, recipients, values)
    ).to.be.reverted;
  });
});