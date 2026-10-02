import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m406ec4df test", function () {
  it("should revert when executeBatch is called from address without EXECUTOR_ROLE and address(0) does not have the role", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    
    // Deploy with no proposers or executors (only owner gets TIMELOCK_ADMIN_ROLE)
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(
      3600, // minDelay 1 hour
      [],   // no proposers
      []    // no executors (address(0) will not have EXECUTOR_ROLE)
    );
    await instance.waitForDeployment();

    // Prepare call data for executeBatch
    const targets: string[] = [];
    const values: bigint[] = [];
    const datas: string[] = [];
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;

    // Attempt to call executeBatch from unauthorized address
    // This should revert in the original contract due to missing EXECUTOR_ROLE
    // In the mutant (without modifier), it would succeed, killing the mutant
    await expect(
      instance.connect(unauthorized).executeBatch(
        targets,
        values,
        datas,
        predecessor,
        salt,
        { value: 0 }
      )
    ).to.be.reverted;
  });
});