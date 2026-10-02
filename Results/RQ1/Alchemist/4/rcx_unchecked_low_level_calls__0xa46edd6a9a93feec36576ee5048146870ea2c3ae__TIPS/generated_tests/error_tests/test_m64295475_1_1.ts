import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - empty _tos array", function () {
  it("should revert on original but not on mutant when _tos is empty", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create empty arrays for the test
    const emptyTos: string[] = [];
    const emptyV: bigint[] = [];

    // This call should revert on original (require(_tos.length > 0))
    // On the mutant (require(_tos.length >= 0)) it will not revert
    const tx = instance.transfer(owner.address, addr1.address, emptyTos, emptyV);

    // If the contract is the original, this should revert
    // If it's the mutant, it will succeed (killing the mutant)
    await expect(tx).to.be.reverted;
  });
});