import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m406ec4df - executeBatch access control", function () {
  it("should revert when unauthorized address calls executeBatch (kills mutant)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy with proposers and executors arrays (can be empty, but need proper structure)
    const minDelay = 3600; // 1 hour
    const proposers: string[] = [owner.address];
    const executors: string[] = [owner.address];

    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Prepare dummy batch call data
    const targets: string[] = [addr1.address];
    const values: bigint[] = [ethers.parseEther("0")];
    const datas: string[] = ["0x"];
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;

    // addr2 is not an executor - should revert in original, but not in mutant
    await expect(
      instance.connect(addr2).executeBatch(targets, values, datas, predecessor, salt)
    ).to.be.reverted;
  });
});