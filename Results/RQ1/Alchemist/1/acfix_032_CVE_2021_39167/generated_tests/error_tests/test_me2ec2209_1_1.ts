import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant kill test - onlyRoleOrOpenRole", function () {
  it("should kill mutant me2ec2209 by calling execute from unauthorized address when EXECUTOR_ROLE is open", async function () {
    const [owner, unauthorizedUser] = await ethers.getSigners();

    // Deploy with empty proposers and executors arrays (we'll set up roles manually)
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(
      3600, // minDelay (1 hour)
      [],   // proposers
      []    // executors
    );
    await instance.waitForDeployment();

    // Grant EXECUTOR_ROLE to address(0) to make it "open"
    const EXECUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"));
    const TIMELOCK_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));

    await instance.connect(owner).grantRole(EXECUTOR_ROLE, ethers.ZeroAddress);

    // Prepare a simple call - sending 0 value to a dummy address
    const target = unauthorizedUser.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));

    // Schedule the operation first (need PROPOSER_ROLE for this)
    await instance.connect(owner).grantRole(
      ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE")),
      owner.address
    );

    const delay = 3600;
    await instance.connect(owner).schedule(target, value, data, predecessor, salt, delay);

    // Fast forward time past the delay
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine", []);

    // Attempt to execute from unauthorized user - should succeed on original (open role)
    // but revert on mutant (because mutant always checks role)
    await expect(
      instance.connect(unauthorizedUser).execute(target, value, data, predecessor, salt, { value: 0 })
    ).to.not.be.reverted;
  });
});