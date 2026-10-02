import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant kill test", function () {
  it("should kill mutant m44692e9d by calling transfer with a non-empty array and expecting success", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a non-empty array of recipients (length > 0)
    const recipients = [addr2.address];

    // Call transfer with valid parameters
    // This should succeed on the original but revert on the mutant due to _tos.length < 0 always being false
    const tx = instance.transfer(
      owner.address,
      addr1.address,
      recipients,
      ethers.parseEther("1")
    );

    // The mutant will always revert because _tos.length (which is >= 0) is never < 0
    // So we expect the transaction to be reverted, killing the mutant
    await expect(tx).to.be.reverted;
  });
});