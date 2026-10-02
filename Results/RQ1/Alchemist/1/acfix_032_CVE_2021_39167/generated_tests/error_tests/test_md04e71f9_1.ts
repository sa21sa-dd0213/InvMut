import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant md04e71f9 test", function () {
  it("should revert when non-proposer tries to cancel a pending operation", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy TimelockController with minDelay = 100, proposers = [owner], executors = [owner]
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(
      100,
      [owner.address],
      [owner.address]
    );
    await instance.waitForDeployment();

    // Schedule an operation as the proposer (owner)
    const target = addr1.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = 200;

    await instance.connect(owner).schedule(target, value, data, predecessor, salt, delay);

    // Get the operation ID
    const id = await instance.hashOperation(target, value, data, predecessor, salt);

    // Verify operation is pending
    expect(await instance.isOperationPending(id)).to.be.true;

    // Non-proposer (addr2) attempts to cancel - should revert in original, but mutant allows it
    await expect(
      instance.connect(addr2).cancel(id)
    ).to.be.revertedWith(
      "AccessControl: account " + addr2.address.toLowerCase().slice(2).padStart(40, "0") + 
      " is missing role " + ethers.id("PROPOSER_ROLE").slice(2).padStart(64, "0")
    );
  });
});