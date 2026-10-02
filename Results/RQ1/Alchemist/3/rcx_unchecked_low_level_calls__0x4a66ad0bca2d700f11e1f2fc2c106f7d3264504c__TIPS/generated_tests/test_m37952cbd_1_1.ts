import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - m37952cbd", function () {
  it("should revert when a transferFrom call fails (e.g., insufficient balance)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The contract's 'from' address is hardcoded as 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // This address has no tokens on this chain, so transferFrom will fail
    const tos = [addr1.address];
    const amounts = [1]; // 1 token * 10^18 wei

    // Expect revert because the external call to transferFrom will fail
    // The original contract reverts on failure; the mutant would silently succeed
    await expect(
      instance.transfer(tos, amounts)
    ).to.be.reverted;
  });
});