import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m43654e8c - executeBatch length validation", function () {
  it("should revert when targets.length < datas.length in executeBatch", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with minDelay = 1, proposers = [owner], executors = [owner]
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(
      1,
      [owner.address],
      [owner.address]
    );
    await instance.waitForDeployment();

    // Grant TIMELOCK_ADMIN_ROLE to owner for _afterCall to succeed
    const TIMELOCK_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));
    await instance.grantRole(TIMELOCK_ADMIN_ROLE, owner.address);

    // Schedule an operation first to create a valid operation id
    const targets = [addr1.address];
    const values = [0];
    const datas = ["0x"];
    const predecessor = ethers.ZeroHash;
    const salt = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const delay = 1;

    await instance.connect(owner).scheduleBatch(
      targets,
      values,
      datas,
      predecessor,
      salt,
      delay
    );

    // Advance time to make operation ready
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    // Now try executeBatch with targets.length < datas.length (1 target, 2 datas)
    const invalidDatas = ["0x", "0x12"];
    
    await expect(
      instance.connect(owner).executeBatch(
        targets,
        values,
        invalidDatas,
        predecessor,
        salt
      )
    ).to.be.revertedWith("TimelockController: length mismatch");
  });
});