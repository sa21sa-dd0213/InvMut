import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m39476029", function () {
  it("should revert when scheduleBatch is called by an address without PROPOSER_ROLE", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const minDelay = 3600; // 1 hour in seconds
    const proposers: string[] = [owner.address];
    const executors: string[] = [owner.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // addr1 does NOT have PROPOSER_ROLE, so calling scheduleBatch should revert
    const targets = [addr1.address];
    const values = [0];
    const datas = ["0x"];
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = minDelay;

    await expect(
      instance.connect(addr1).scheduleBatch(targets, values, datas, predecessor, salt, delay)
    ).to.be.revertedWith("AccessControl: account " + addr1.address.toLowerCase() + " is missing role");
  });
});