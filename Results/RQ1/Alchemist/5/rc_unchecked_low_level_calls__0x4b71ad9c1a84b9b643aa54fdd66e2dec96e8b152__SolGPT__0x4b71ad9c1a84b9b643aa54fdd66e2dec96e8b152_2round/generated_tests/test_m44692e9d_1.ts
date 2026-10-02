import { expect } from "chai";
import { ethers } } from "hardhat";

describe("airPort mutant test - m44692e9d", function () {
  it("should detect mutant that changed > to < by calling with a valid non-empty array", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tokenAddress = ethers.ZeroAddress; // using zero address as placeholder for token contract
    const recipients = [addr1.address, addr2.address];
    const value = ethers.parseEther("1");

    // Original contract should succeed with non-empty array; mutant will revert because _tos.length < 0 is never true
    await expect(
      instance.connect(owner).transfer(owner.address, tokenAddress, recipients, value)
    ).to.not.be.reverted;
  });
});