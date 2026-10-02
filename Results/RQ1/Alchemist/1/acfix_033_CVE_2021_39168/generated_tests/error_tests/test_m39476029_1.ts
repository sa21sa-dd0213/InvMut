import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection", function () {
  it("should revert when non-proposer calls scheduleBatch", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("TimelockController");
    const minDelay = 3600; // 1 hour
    const proposers = [owner.address]; // Only owner is proposer
    const executors = [owner.address];
    
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    const targets = [addr1.address];
    const values = [0];
    const datas = ["0x"];
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = minDelay;

    // addr1 does NOT have PROPOSER_ROLE, so this should revert
    await expect(
      instance.connect(addr1).scheduleBatch(
        targets,
        values,
        datas,
        predecessor,
        salt,
        delay
      )
    ).to.be.revertedWith(
      "AccessControl: account " +
        addr1.address.toLowerCase().slice(2) +
        " is missing role " +
        ethers.id("PROPOSER_ROLE").slice(2)
    );
  });
});