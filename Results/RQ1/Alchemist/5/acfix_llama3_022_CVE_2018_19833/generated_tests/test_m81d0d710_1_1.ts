import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant m81d0d710 test", function () {
  it("should return true from burn() - kill mutant that removes return true", async function () {
    const [owner] = await ethers.getSigners();
    const initialSupply = 1000;
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, "TestToken", "TT");
    await instance.waitForDeployment();

    // Owner burns 100 tokens
    const burnAmount = 100;
    const tx = await instance.connect(owner).burn(burnAmount);
    await tx.wait();

    // Call burn again and capture the return value
    const result = await instance.connect(owner).burn.staticCall(burnAmount);

    // Original returns true, mutant returns false (implicit default)
    expect(result).to.equal(true);
  });
});