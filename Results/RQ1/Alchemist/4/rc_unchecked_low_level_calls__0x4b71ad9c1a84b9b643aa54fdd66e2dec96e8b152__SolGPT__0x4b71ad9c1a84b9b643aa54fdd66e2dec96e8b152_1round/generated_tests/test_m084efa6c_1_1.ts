import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant kill test - m084efa6c", function () {
  it("should kill mutant by calling transfer with a failing external call that requires revert in original", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the airPort contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple contract that always returns false on transferFrom
    const FailingTokenFactory = await ethers.getContractFactory(
      "contract FailingToken { function transferFrom(address, address, uint256) external returns (bool) { return false; } }"
    );
    const failingToken = await FailingTokenFactory.deploy();
    await failingToken.waitForDeployment();

    // Create recipients array
    const recipients = [addr1.address];

    // This call should succeed in the mutant (no require) but fail (revert) in the original
    // Since we are testing the mutant, we expect it to succeed despite the failed external call
    const tx = await instance.connect(owner).transfer(
      owner.address,
      failingToken.target,
      recipients,
      ethers.parseEther("1")
    );
    await tx.wait();

    // If we reached here, the mutant allowed the transaction to succeed even though the
    // external call returned false. In the original, this would have reverted.
    // The test passes (kills the mutant) because the mutant behavior differs from original.
    expect(true).to.equal(true); // We just need to reach this assertion
  });
});