import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m2de83389 test", function () {
  it("should kill mutant by triggering out-of-bounds access when _tos has exactly one element", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Test case: call transfer with a single-element array
    // Original: loop runs once (i=0, i < 1) and succeeds
    // Mutant: loop runs twice (i=0, i <= 1), second iteration accesses _tos[1] which is out-of-bounds
    const tos = [addr1.address];
    const value = ethers.parseEther("1");

    // The mutant should revert due to out-of-bounds array access
    await expect(
      instance.transfer(owner.address, addr2.address, tos, value)
    ).to.be.reverted;
  });
});